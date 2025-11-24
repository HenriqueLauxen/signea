import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, CheckCircle, Clock, MapPin, Loader2, Plus, Pencil, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Evento {
  id: string;
  titulo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  status: string;
  banner_url: string | null;
  carga_horaria: number | null;
  capacidade_maxima: number;
  vagas_disponiveis: number;
  tipo: string;
  valor: number;
  created_at: string;
}

export default function MeusEventos() {
  const navigate = useNavigate();
  const toast = useToast();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [eventoToCancel, setEventoToCancel] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventoToDelete, setEventoToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const carregarEventos = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        toast.error("Você precisa estar logado");
        navigate("/login");
        return;
      }

      // Buscar TODOS os eventos (todos os organizadores podem ver todos os eventos)
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEventos(data || []);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      toast.error('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarEventos();

    // Real-time subscription
    const channel = supabase
      .channel('meus-eventos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'eventos'
        },
        () => {
          carregarEventos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Aprovado</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pendente</Badge>;
      case 'rejeitado':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Rejeitado</Badge>;
      case 'cancelado':
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getVagasInfo = (evento: Evento) => {
    const ocupadas = evento.capacidade_maxima - evento.vagas_disponiveis;
    const percentual = Math.round((ocupadas / evento.capacidade_maxima) * 100);
    return { ocupadas, percentual };
  };

  const handleCancelarEvento = (eventoId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Impede navegação
    setEventoToCancel(eventoId);
    setCancelDialogOpen(true);
  };

  const confirmarCancelamento = async () => {
    if (!eventoToCancel) return;

    try {
      setCanceling(true);

      const { error } = await supabase
        .from('eventos')
        .update({ status: 'cancelado' })
        .eq('id', eventoToCancel);

      if (error) throw error;

      toast.success('Evento cancelado com sucesso');
      carregarEventos(); // Recarrega lista
    } catch (error) {
      console.error('Erro ao cancelar evento:', error);
      toast.error('Erro ao cancelar evento');
    } finally {
      setCanceling(false);
      setCancelDialogOpen(false);
      setEventoToCancel(null);
    }
  };

  const handleExcluirEvento = (eventoId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Impede navegação
    setEventoToDelete(eventoId);
    setDeleteDialogOpen(true);
  };

  const confirmarExclusao = async () => {
    if (!eventoToDelete) return;

    try {
      setDeleting(true);

      const { error } = await supabase
        .from('eventos')
        .delete()
        .eq('id', eventoToDelete);

      if (error) throw error;

      toast.success('Evento excluído com sucesso');
      carregarEventos(); // Recarrega lista
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
      toast.error('Erro ao excluir evento');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setEventoToDelete(null);
    }
  };

  const handleEditarEvento = (eventoId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Impede navegação
    // TODO: Implementar página de edição
    toast.info('Funcionalidade de edição em desenvolvimento');
    // navigate(`/organizador/editar-evento/${eventoId}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-light">Eventos</h1>
          <Button onClick={() => navigate("/organizador/criar-evento")}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Evento
          </Button>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-light">Eventos</h1>
        <Button onClick={() => navigate("/organizador/criar-evento")}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Evento
        </Button>
      </div>

      {eventos.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground space-y-4">
            <Calendar className="w-12 h-12 mx-auto opacity-50" />
            <div>
              <p className="text-lg">Você ainda não criou nenhum evento</p>
              <p className="text-sm">Clique em "Novo Evento" para começar</p>
            </div>
            <Button onClick={() => navigate("/organizador/criar-evento")}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Evento
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {eventos.map((evento) => {
            const { ocupadas, percentual } = getVagasInfo(evento);

            return (
              <Card
                key={evento.id}
                className="overflow-hidden hover:glow-border-hover transition-all cursor-pointer"
                onClick={() => navigate(`/organizador/evento/${evento.id}`)}
              >
                {/* Banner */}
                <div
                  className="w-full h-40 bg-muted bg-cover bg-center"
                  style={{
                    backgroundImage: evento.banner_url
                      ? `url(${evento.banner_url})`
                      : 'none'
                  }}
                >
                  {!evento.banner_url && (
                    <div className="w-full h-full flex items-center justify-center">
                      <Calendar className="w-12 h-12 text-muted-foreground opacity-20" />
                    </div>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="p-6 space-y-4">
                  {/* Título e Status */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xl font-normal line-clamp-2">{evento.titulo}</h3>
                      {getStatusBadge(evento.status)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {evento.descricao}
                    </p>
                  </div>

                  {/* Informações */}
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(new Date(evento.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                        {evento.data_inicio !== evento.data_fim && (
                          <> - {format(new Date(evento.data_fim), "dd/MM/yyyy", { locale: ptBR })}</>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="line-clamp-1">{evento.local}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>
                        {ocupadas}/{evento.capacidade_maxima} inscritos ({percentual}%)
                      </span>
                    </div>

                    {evento.carga_horaria && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{evento.carga_horaria}h</span>
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      {evento.tipo}
                    </Badge>
                    {evento.valor > 0 ? (
                      <Badge variant="outline" className="text-xs">
                        R$ {evento.valor.toFixed(2)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-green-500 border-green-500/20">
                        Gratuito
                      </Badge>
                    )}
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex gap-2 pt-2">
                    {evento.status !== 'cancelado' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleEditarEvento(evento.id, e)}
                          className="flex-1"
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleCancelarEvento(evento.id, e)}
                          className="flex-1 text-red-500 hover:text-red-600 hover:border-red-500/50"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancelar
                        </Button>
                      </>
                    )}
                    {evento.status === 'cancelado' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleExcluirEvento(evento.id, e)}
                        className="flex-1 text-red-600 hover:text-red-700 hover:border-red-600/50"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Excluir Evento
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de Confirmação de Cancelamento */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Evento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este evento? Esta ação não pode ser desfeita.
              Todos os participantes inscritos serão notificados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={canceling}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarCancelamento}
              disabled={canceling}
              className="bg-red-500 hover:bg-red-600"
            >
              {canceling ? 'Cancelando...' : 'Sim, cancelar evento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Evento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente este evento? Esta ação não pode ser desfeita.
              Todos os dados relacionados (inscrições, presenças, certificados) serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Excluindo...' : 'Sim, excluir permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
