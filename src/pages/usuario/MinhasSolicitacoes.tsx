import { useState, useEffect, useCallback, type ComponentType, type SVGProps } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PlusCircle, FileText, Clock, CheckCircle, XCircle, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";

type Solicitacao = {
  id: string;
  titulo: string;
  status: string;
  created_at: string;
  motivo_rejeicao?: string | null;
  feedback?: string | null;
};

export default function MinhasSolicitacoes() {
  const toast = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Form state
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [campus, setCampus] = useState("");
  const [campusOptions, setCampusOptions] = useState<string[]>([]);
  const [sala, setSala] = useState("");
  const [capacidadeMaxima, setCapacidadeMaxima] = useState<number>(0);
  const [valor, setValor] = useState<number>(0);
  const [categoria, setCategoria] = useState("");
  const [publicoAlvoPerfil, setPublicoAlvoPerfil] = useState<string>("aluno");

  const getStatusBadge = (status: string) => {
  type StatusConfig = { variant: "outline" | "default" | "destructive"; icon: ComponentType<SVGProps<SVGSVGElement>>; label: string };
  const configMap: Record<string, StatusConfig> = {
      pendente: { variant: "outline", icon: Clock, label: "Pendente" },
      aprovado: { variant: "default", icon: CheckCircle, label: "Aprovado" },
      ajustes: { variant: "outline", icon: FileText, label: "Requer Ajustes" },
      rejeitado: { variant: "destructive", icon: XCircle, label: "Rejeitado" },
    };
    const c = configMap[status] ?? configMap.pendente;
    const { variant, icon: Icon, label } = c;
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const carregarSolicitacoes = useCallback(async () => {
    if (!userEmail) return;
    
    let mounted = true;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("eventos")
        .select("id, titulo, status, created_at, motivo_rejeicao")
        .eq("organizador_email", userEmail)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar solicitações:", error);
        if (mounted) {
          toast.error("Erro ao carregar solicitações");
          setSolicitacoes([]);
        }
        return;
      }

      if (mounted) {
        setSolicitacoes((data as unknown as Solicitacao[]) || []);
      }
    } catch (err) {
      console.error(err);
      if (mounted) {
        toast.error("Erro ao carregar solicitações");
        setSolicitacoes([]);
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
    
    return () => {
      mounted = false;
    };
  }, [userEmail]);

  useEffect(() => {
    let mounted = true;
    
    const obterUsuario = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && session?.user?.email) {
          setUserEmail(session.user.email);
        } else if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro ao obter sessão:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    obterUsuario();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Carregar campus do banco de dados
  useEffect(() => {
    const loadCampus = async () => {
      try {
        const { data, error } = await supabase
          .from("campus")
          .select("nome")
          .eq("ativo", true)
          .order("nome", { ascending: true });

        if (error) {
          console.error("Erro ao carregar campus:", error);
        } else {
          setCampusOptions(data.map(c => c.nome));
        }
      } catch (err) {
        console.error("Erro ao buscar campus:", err);
      }
    };

    loadCampus();
  }, []);

  useEffect(() => {
    if (userEmail) {
      carregarSolicitacoes();
    }
  }, [userEmail, carregarSolicitacoes]);

  const handleCreateSolicitacao = async () => {
    if (!titulo.trim()) {
      toast.error("Preencha o título do evento");
      return;
    }

    if (!descricao.trim()) {
      toast.error("Preencha a descrição do evento");
      return;
    }

    if (!dateRange?.from || !dateRange?.to) {
      toast.error("Selecione o período do evento");
      return;
    }

    if (!capacidadeMaxima || capacidadeMaxima <= 0) {
      toast.error("Informe a capacidade máxima (maior que 0)");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        toast.error("Você precisa estar logado");
        return;
      }

      // Buscar nome e perfil do usuário
      const { data: userData } = await supabase
        .from('usuarios')
        .select('nome_completo, perfil')
        .eq('email', session.user.email)
        .single();

      // Se for organizador, aprovar automaticamente
      const isOrganizador = userData?.perfil === 'organizador';
      const statusEvento = isOrganizador ? 'aprovado' : 'pendente';
      const dataAprovacao = isOrganizador ? new Date().toISOString() : undefined;

      const payload: Record<string, unknown> = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        data_inicio: dateRange.from.toISOString(),
        data_fim: dateRange.to.toISOString(),
        campus: campus?.trim() || null,
        sala: sala?.trim() || null,
        capacidade_maxima: capacidadeMaxima,
        vagas_disponiveis: capacidadeMaxima,
        valor: valor || 0,
        categoria: categoria?.trim() || null,
        publico_alvo_perfil: publicoAlvoPerfil || 'aluno',
        organizador_email: session.user.email,
        organizador_nome: userData?.nome_completo || session.user.email,
        status: statusEvento,
        data_aprovacao: dataAprovacao,
        gera_certificado: true, // Certificado é obrigatório
      };

      const { error } = await supabase.from("eventos").insert(payload);
      if (error) throw error;

      toast.success("Solicitação enviada com sucesso!");
      setShowCreateModal(false);
      // reset form
      setTitulo("");
      setDescricao("");
      setDateRange(undefined);
      setCampus("");
      setSala("");
      setCapacidadeMaxima(0);
      setValor(0);
      setCategoria("");
      setPublicoAlvoPerfil("aluno");

      carregarSolicitacoes();
    } catch (err: unknown) {
      console.error("Erro ao criar solicitação:", err);
      toast.error("Erro ao enviar solicitação");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-light">Minhas Solicitações de Evento</h1>
          <Button variant="elegant" onClick={() => setShowCreateModal(true)}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Nova Solicitação
          </Button>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-light">Minhas Solicitações de Evento</h1>
        <Button variant="elegant" onClick={() => setShowCreateModal(true)}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Nova Solicitação
        </Button>
      </div>

      <div className="space-y-4">
        {solicitacoes.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">Você ainda não enviou nenhuma solicitação</Card>
        ) : (
          solicitacoes.map((sol) => (
            <Card key={sol.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-normal">{sol.titulo}</h3>
                    {getStatusBadge(sol.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">Enviado em {new Date(sol.created_at).toLocaleDateString("pt-BR")}</p>
                  {sol.feedback && (
                    <div className="mt-3 p-3 bg-muted rounded-md">
                      <p className="text-sm text-muted-foreground mb-1">Feedback:</p>
                      <p className="text-sm">{sol.feedback}</p>
                    </div>
                  )}
                  {sol.motivo_rejeicao && (
                    <div className="mt-3 p-3 bg-destructive/10 rounded-md">
                      <p className="text-sm text-muted-foreground mb-1">Motivo da rejeição:</p>
                      <p className="text-sm">{sol.motivo_rejeicao}</p>
                    </div>
                  )}
                </div>
                {sol.status === "ajustes" && (
                  <Button variant="outline" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal Criar Solicitação */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Solicitação de Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título do Evento</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Workshop de React Avançado" />
            </div>
            <div>
              <Label>Descrição do Evento</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o evento..." rows={4} />
            </div>
            <div>
              <Label>Período do Evento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd 'de' MMMM", { locale: ptBR })} -{" "}
                          {format(dateRange.to, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </>
                      ) : (
                        format(dateRange.from, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                      )
                    ) : (
                      <span>Selecione o período</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Campus (opcional)</Label>
                <Select value={campus} onValueChange={setCampus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o campus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Nenhum</SelectItem>
                    {campusOptions.map((campusNome) => (
                      <SelectItem key={campusNome} value={campusNome}>
                        {campusNome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sala (opcional)</Label>
                <Input
                  placeholder="Ex: Sala 201"
                  value={sala}
                  onChange={(e) => setSala(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Capacidade Máxima</Label>
                <Input
                  type="number"
                  placeholder="Ex: 100"
                  value={capacidadeMaxima || ""}
                  onChange={(e) => setCapacidadeMaxima(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Valor da Inscrição (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 50.00 (0 para gratuito)"
                  value={valor || ""}
                  onChange={(e) => setValor(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Deixe 0 para evento gratuito
                </p>
              </div>
            </div>
            <div>
              <Label>Categoria (opcional)</Label>
              <Input
                placeholder="Ex: Tecnologia, Educação, Saúde"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              />
            </div>
            <div>
              <Label>Público-Alvo</Label>
              <Select value={publicoAlvoPerfil} onValueChange={setPublicoAlvoPerfil}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o público-alvo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aluno">Aluno</SelectItem>
                  <SelectItem value="organizador">Organizador</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {publicoAlvoPerfil === 'aluno' 
                  ? 'Eventos para alunos aparecem para organizadores também'
                  : 'Eventos para organizadores não aparecem para alunos'}
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button variant="elegant" onClick={handleCreateSolicitacao}>
                Enviar Solicitação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

