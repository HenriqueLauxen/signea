import { useState, useEffect, useCallback, type ComponentType, type SVGProps } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { modal } from "@/contexts/ModalContext";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Solicitacao = {
  id: string;
  titulo: string;
  status: string;
  created_at: string;
  motivo_rejeicao?: string | null;
  feedback?: string | null;
};

export default function MinhasSolicitacoes() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Form state
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [cargaHoraria, setCargaHoraria] = useState<number | "">("");
  const [palestrantes, setPalestrantes] = useState("");

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
          modal.error("Erro ao carregar solicitações");
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
        modal.error("Erro ao carregar solicitações");
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

  useEffect(() => {
    if (userEmail) {
      carregarSolicitacoes();
    }
  }, [userEmail, carregarSolicitacoes]);

  const handleCreateSolicitacao = async () => {
    if (!titulo || !dataInicio || !dataFim) {
      modal.error("Preencha título e datas");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        modal.error("Você precisa estar logado");
        return;
      }

      const payload: Record<string, unknown> = {
        titulo,
        descricao,
        data_inicio: new Date(dataInicio).toISOString(),
        data_fim: new Date(dataFim).toISOString(),
        carga_horaria: cargaHoraria === "" ? null : Number(cargaHoraria),
        tags: palestrantes ? palestrantes.split(",").map(p => p.trim()) : [],
        organizador_email: session.user.email,
        status: "pendente",
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("eventos").insert(payload);
      if (error) throw error;

      modal.success("Solicitação enviada com sucesso!");
      setShowCreateModal(false);
      // reset form
      setTitulo("");
      setDescricao("");
      setDataInicio("");
      setDataFim("");
      setCargaHoraria("");
      setPalestrantes("");

      carregarSolicitacoes();
    } catch (err: unknown) {
      console.error("Erro ao criar solicitação:", err);
      modal.error("Erro ao enviar solicitação");
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
              <Label>Nome do Evento</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Workshop de React Avançado" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o evento..." rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Início</Label>
                <Input value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} type="date" />
              </div>
              <div>
                <Label>Data de Término</Label>
                <Input value={dataFim} onChange={(e) => setDataFim(e.target.value)} type="date" />
              </div>
            </div>
            <div>
              <Label>Carga Horária (horas)</Label>
              <Input value={cargaHoraria} onChange={(e) => setCargaHoraria(e.target.value === "" ? "" : Number(e.target.value))} type="number" placeholder="Ex: 40" />
            </div>
            <div>
              <Label>Palestrantes (separados por vírgula)</Label>
              <Input value={palestrantes} onChange={(e) => setPalestrantes(e.target.value)} placeholder="Ex: Dr. João Silva, Profa. Maria Santos" />
            </div>
            <div className="flex gap-2 justify-end">
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
