import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Eye, CheckCircle, Calendar, MapPin, Users, Loader2, User } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EventoPendente {
  id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  campus: string | null;
  sala: string | null;
  capacidade_maxima: number;
  organizador_email: string;
  organizador_nome: string;
  carga_horaria: number | null;
  gera_certificado: boolean;
  banner_url: string | null;
  categoria: string | null;
  created_at: string;
}

interface EventoAprovado {
  id: string;
  titulo: string;
  organizador_nome: string;
  organizador_email: string;
  data_aprovacao: string;
  aprovador_email: string | null;
  carga_horaria: number | null;
  updated_at: string;
}

export default function AprovarEventos() {
  const toast = useToast();
  const [eventosPendentes, setEventosPendentes] = useState<EventoPendente[]>([]);
  const [eventosAprovados, setEventosAprovados] = useState<EventoAprovado[]>([]);
  const [loadingPendentes, setLoadingPendentes] = useState(true);
  const [loadingAprovados, setLoadingAprovados] = useState(true);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<EventoPendente | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAjustesModal, setShowAjustesModal] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [processando, setProcessando] = useState(false);
  const [aprovadoresNomes, setAprovadoresNomes] = useState<Record<string, string>>({});

  useEffect(() => {
    carregarEventosPendentes();
    carregarEventosAprovados();

    // Escuta mudanças em tempo real
    const channel = supabase
      .channel('eventos-aprovacao')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'eventos'
        },
        () => {
          carregarEventosPendentes();
          carregarEventosAprovados();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Buscar nomes dos aprovadores
    const buscarNomesAprovadores = async () => {
      const emailsUnicos = [...new Set(eventosAprovados.map(e => e.aprovador_email).filter(Boolean))];
      if (emailsUnicos.length === 0) return;

      const { data } = await supabase
        .from('usuarios')
        .select('email, nome_completo')
        .in('email', emailsUnicos);

      if (data) {
        const nomes: Record<string, string> = {};
        data.forEach(user => {
          nomes[user.email] = user.nome_completo || user.email;
        });
        setAprovadoresNomes(nomes);
      }
    };

    if (eventosAprovados.length > 0) {
      buscarNomesAprovadores();
    }
  }, [eventosAprovados]);

  const carregarEventosPendentes = async () => {
    try {
      setLoadingPendentes(true);
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEventosPendentes(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar eventos pendentes:', error);
      toast.error("Erro ao carregar solicitações pendentes");
    } finally {
      setLoadingPendentes(false);
    }
  };

  const carregarEventosAprovados = async () => {
    try {
      setLoadingAprovados(true);
      const { data, error } = await supabase
        .from('eventos')
        .select('id, titulo, organizador_nome, organizador_email, data_aprovacao, aprovador_email, carga_horaria, updated_at')
        .eq('status', 'aprovado')
        .order('data_aprovacao', { ascending: false })
        .limit(20);

      if (error) throw error;

      setEventosAprovados(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar eventos aprovados:', error);
      toast.error('Erro ao carregar eventos aprovados');
    } finally {
      setLoadingAprovados(false);
    }
  };

  const handleAprovar = async () => {
    if (!selectedSolicitacao) return;

    setProcessando(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        toast.error("Você precisa estar logado");
        return;
      }

      const { error } = await supabase
        .from('eventos')
        .update({
          status: 'aprovado',
          aprovador_email: session.user.email,
          data_aprovacao: new Date().toISOString()
        })
        .eq('id', selectedSolicitacao.id);

      if (error) throw error;

      toast.success("Solicitação aprovada com sucesso!");
      setShowModal(false);
      setSelectedSolicitacao(null);
      carregarEventosPendentes();
      carregarEventosAprovados();
    } catch (error: any) {
      console.error('Erro ao aprovar:', error);
      toast.error("Erro ao aprovar evento");
    } finally {
      setProcessando(false);
    }
  };

  const handleSolicitarAjustes = async () => {
    if (!selectedSolicitacao || !feedback.trim()) {
      toast.error("Por favor, forneça um feedback");
      return;
    }

    setProcessando(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        toast.error("Você precisa estar logado");
        return;
      }

      const { error } = await supabase
        .from('eventos')
        .update({
          status: 'pendente',
          aprovador_email: session.user.email,
          motivo_rejeicao: feedback
        })
        .eq('id', selectedSolicitacao.id);

      if (error) throw error;

      toast.success("Feedback enviado! O organizador será notificado.");
      setShowAjustesModal(false);
      setShowModal(false);
      setFeedback("");
      setSelectedSolicitacao(null);
      carregarEventosPendentes();
    } catch (error: any) {
      console.error('Erro ao solicitar ajustes:', error);
      toast.error("Erro ao enviar feedback");
    } finally {
      setProcessando(false);
    }
  };

  const handleRejeitar = async () => {
    if (!selectedSolicitacao) return;

    setProcessando(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        toast.error("Você precisa estar logado");
        return;
      }

      const { error } = await supabase
        .from('eventos')
        .update({
          status: 'rejeitado',
          aprovador_email: session.user.email,
          data_aprovacao: new Date().toISOString(),
          motivo_rejeicao: "Solicitação rejeitada"
        })
        .eq('id', selectedSolicitacao.id);

      if (error) throw error;

      toast.success("Solicitação rejeitada!");
      setShowModal(false);
      setSelectedSolicitacao(null);
      carregarEventosPendentes();
      carregarEventosAprovados();
    } catch (error: any) {
      console.error('Erro ao rejeitar:', error);
      toast.error("Erro ao rejeitar evento");
    } finally {
      setProcessando(false);
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      palestra: "Palestra",
      workshop: "Workshop",
      seminario: "Seminário",
      conferencia: "Conferência",
      curso: "Curso",
      outro: "Outro"
    };
    return labels[tipo] || tipo;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-light">Aprovar Eventos</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda - Pendentes */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-light mb-2">Solicitações Pendentes</h2>
            <p className="text-sm text-muted-foreground">
              {eventosPendentes.length} {eventosPendentes.length === 1 ? 'solicitação' : 'solicitações'} aguardando análise
            </p>
          </div>

          {loadingPendentes ? (
            <Card className="p-8">
              <div className="flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            </Card>
          ) : eventosPendentes.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhuma solicitação pendente</p>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-hide">
              {eventosPendentes.map((evento) => (
                <Card key={evento.id} className="p-4 hover:glow-border-hover transition-all">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-normal truncate">{evento.titulo}</h3>
                        <Badge variant="outline" className="gap-1 mt-1 text-xs">
                          <Clock className="w-3 h-3" />
                          Pendente
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedSolicitacao(evento);
                          setShowModal(true);
                        }}
                        className="shrink-0"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="truncate">Por: {evento.organizador_nome || evento.organizador_email}</p>
                      <p className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(evento.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      {evento.campus && (
                        <p className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3" />
                          {evento.campus}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Coluna Direita - Aprovados */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-light mb-2">Solicitações Aprovadas</h2>
            <p className="text-sm text-muted-foreground">
              Histórico de eventos aprovados
            </p>
          </div>

          {loadingAprovados ? (
            <Card className="p-8">
              <div className="flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            </Card>
          ) : eventosAprovados.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum evento aprovado ainda</p>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-hide">
              {eventosAprovados.map((evento) => (
                <Card key={evento.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-normal truncate">{evento.titulo}</h3>
                        <Badge variant="default" className="gap-1 mt-1 text-xs">
                          <CheckCircle className="w-3 h-3" />
                          Aprovado
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="truncate">Criado por: {evento.organizador_nome || evento.organizador_email}</p>
                      {evento.aprovador_email ? (
                        <p className="truncate">
                          Evento Aprovado por: {aprovadoresNomes[evento.aprovador_email] || evento.aprovador_email}
                        </p>
                      ) : (
                        <p className="truncate">Aprovado automaticamente pelo sistema</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Analisar */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle>Analisar Solicitação</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {selectedSolicitacao?.banner_url && (
              <img 
                src={selectedSolicitacao.banner_url} 
                alt={selectedSolicitacao.titulo}
                className="w-full h-48 object-cover rounded-lg"
              />
            )}

            <div>
              <h3 className="text-xl font-normal mb-4">{selectedSolicitacao?.titulo}</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Tipo:</span> {selectedSolicitacao && getTipoLabel(selectedSolicitacao.tipo)}</p>
                <p><span className="text-muted-foreground">Solicitante:</span> {selectedSolicitacao?.organizador_nome || selectedSolicitacao?.organizador_email}</p>
                <p><span className="text-muted-foreground">Período:</span> {selectedSolicitacao && format(new Date(selectedSolicitacao.data_inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })} até {selectedSolicitacao && format(new Date(selectedSolicitacao.data_fim), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                <p><span className="text-muted-foreground">Local:</span> {selectedSolicitacao?.local}{selectedSolicitacao?.campus && ` - ${selectedSolicitacao.campus}`}{selectedSolicitacao?.sala && ` (${selectedSolicitacao.sala})`}</p>
                <p><span className="text-muted-foreground">Capacidade:</span> {selectedSolicitacao?.capacidade_maxima} pessoas</p>
                <p><span className="text-muted-foreground">Carga horária:</span> {selectedSolicitacao?.carga_horaria || 0}h</p>
                <p><span className="text-muted-foreground">Gera certificado:</span> {selectedSolicitacao?.gera_certificado ? "Sim" : "Não"}</p>
                <p><span className="text-muted-foreground">Data de envio:</span> {selectedSolicitacao && format(new Date(selectedSolicitacao.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              </div>
            </div>

            {selectedSolicitacao?.descricao && (
              <div>
                <p className="text-sm font-medium mb-2">Descrição:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedSolicitacao.descricao}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowModal(false);
                  setShowAjustesModal(true);
                }}
                disabled={processando}
                className="flex-1"
              >
                Solicitar Ajustes
              </Button>
              <Button 
                variant="outline"
                onClick={handleRejeitar}
                disabled={processando}
                className="flex-1 border-destructive/20 text-destructive hover:bg-destructive/10"
              >
                Rejeitar
              </Button>
              <Button 
                variant="elegant" 
                onClick={handleAprovar}
                disabled={processando}
                className="flex-1"
              >
                {processando ? "Processando..." : "Aprovar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Solicitar Ajustes */}
      <Dialog open={showAjustesModal} onOpenChange={setShowAjustesModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Ajustes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Descreva os ajustes necessários..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAjustesModal(false);
                  setFeedback("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                variant="elegant" 
                onClick={handleSolicitarAjustes}
                disabled={processando || !feedback.trim()}
                className="flex-1"
              >
                {processando ? "Enviando..." : "Enviar Feedback"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

