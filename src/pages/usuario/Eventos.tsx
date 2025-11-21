import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, Clock, Users, Loader2, MapPin, DollarSign, FileText, CheckCircle, X, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { modal } from "@/contexts/ModalContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Evento {
  id: string;
  titulo: string;
  banner_url: string | null;
  data_inicio: string;
  data_fim: string;
  data_encerramento_inscricoes: string | null;
  carga_horaria: number | null;
  local: string;
  campus: string | null;
  descricao: string;
  vagas_disponiveis: number;
  valor: number | null;
  inscrito?: boolean;
  publico_alvo_perfil?: string;
}

type FiltroEvento = "todos" | "proximos" | "andamento" | "historico";

export default function Eventos() {
  const toast = useToast();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventoSelecionado, setEventoSelecionado] = useState<Evento | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [inscrevendo, setInscrevendo] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroEvento>("todos");

  const carregarEventos = useCallback(async () => {
    console.log('🔄 Carregando eventos... Email:', userEmail);
    
    if (!userEmail) {
      console.log('⚠️ Email não disponível ainda');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('📡 Buscando eventos do Supabase...');
      
      // Obter perfil do usuário
      const { data: userProfile } = await supabase
        .from('usuarios')
        .select('perfil')
        .eq('email', userEmail)
        .single();

      const userPerfil = userProfile?.perfil || 'user';

      // Filtrar eventos por público-alvo:
      // - Eventos para 'aluno' aparecem para todos (alunos e organizadores)
      // - Eventos para 'organizador' aparecem apenas para organizadores
      let query = supabase
        .from('eventos')
        .select('id, titulo, banner_url, data_inicio, data_fim, data_encerramento_inscricoes, carga_horaria, local, campus, descricao, vagas_disponiveis, valor, publico_alvo_perfil')
        .eq('status', 'aprovado');

      // Se o usuário é aluno, mostrar apenas eventos para alunos
      if (userPerfil === 'user') {
        query = query.or('publico_alvo_perfil.eq.aluno,publico_alvo_perfil.is.null');
      }
      // Se o usuário é organizador, mostrar todos os eventos (aluno e organizador)

      const { data, error } = await query.order('data_inicio', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar eventos:', error);
        throw error;
      }

      console.log('✅ Eventos encontrados:', data?.length || 0);

      // Verificar quais eventos o usuário já está inscrito
      if (data && data.length > 0) {
        const eventosIds = data.map(e => e.id);
        console.log('🔍 Verificando inscrições para eventos:', eventosIds);
        
        const { data: inscricoes, error: inscricoesError } = await supabase
          .from('inscricoes')
          .select('evento_id, status')
          .eq('usuario_email', userEmail)
          .in('evento_id', eventosIds);

        if (inscricoesError) {
          console.error('❌ Erro ao buscar inscrições:', inscricoesError);
        }

        console.log('📝 Inscrições encontradas:', inscricoes?.length || 0);
        console.log('📝 Detalhes das inscrições:', inscricoes);

        // Considerar inscrito apenas se o status for 'confirmada' (não cancelada)
        const inscritosIds = new Set(
          inscricoes
            ?.filter(i => i.status === 'confirmada')
            .map(i => i.evento_id) || []
        );
        
        console.log('✅ IDs de eventos inscritos:', Array.from(inscritosIds));
        
        const eventosComInscricao = data.map(evento => ({
          ...evento,
          inscrito: inscritosIds.has(evento.id)
        }));

        console.log('📊 Eventos com status de inscrição:', eventosComInscricao.map(e => ({ 
          titulo: e.titulo, 
          inscrito: e.inscrito 
        })));

        setEventos(eventosComInscricao);
      } else {
        setEventos(data || []);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar eventos:', error);
      toast.error('Erro ao carregar eventos');
    } finally {
      console.log('✅ Carregamento finalizado');
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    const obterUsuario = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        console.log('✅ Email do usuário obtido:', session.user.email);
        setUserEmail(session.user.email);
      } else {
        console.log('⚠️ Nenhuma sessão ativa');
        setLoading(false);
      }
    };

    obterUsuario();
  }, []);

  useEffect(() => {
    if (userEmail) {
      carregarEventos();
    }
  }, [userEmail, carregarEventos]);

  const handleSubscribe = (evento: Evento) => {
    setEventoSelecionado(evento);
    setShowModal(true);
  };

  const confirmarInscricao = async () => {
    if (!eventoSelecionado || !userEmail) return;

    // Verificar se as inscrições já encerraram
    if (eventoSelecionado.data_encerramento_inscricoes) {
      const dataEncerramento = new Date(eventoSelecionado.data_encerramento_inscricoes);
      const agora = new Date();
      
      if (agora > dataEncerramento) {
        toast.error('As inscrições para este evento já encerraram');
        setShowModal(false);
        return;
      }
    }

    try {
      setInscrevendo(true);
      
      const { error } = await supabase
        .from('inscricoes')
        .insert({
          evento_id: eventoSelecionado.id,
          usuario_email: userEmail,
          status: 'confirmada'
        });

      if (error) throw error;

      toast.success("Inscrição realizada com sucesso!");
      setShowModal(false);
      setEventoSelecionado(null);
      carregarEventos(); // Recarregar para atualizar o status
    } catch (error: any) {
      console.error('Erro ao realizar inscrição:', error);
      if (error.code === '23505') {
        toast.error('Você já está inscrito neste evento');
      } else {
        toast.error('Erro ao realizar inscrição');
      }
    } finally {
      setInscrevendo(false);
    }
  };

  const inscricoesEncerradas = (evento: Evento): boolean => {
    if (!evento.data_encerramento_inscricoes) return false;
    const dataEncerramento = new Date(evento.data_encerramento_inscricoes);
    const agora = new Date();
    return agora > dataEncerramento;
  };

  const cancelarInscricao = async (evento: Evento) => {
    if (!userEmail) return;

    const dataInicio = new Date(evento.data_inicio);
    const agora = new Date();

    if (dataInicio <= agora) {
      toast.error('Não é possível cancelar a inscrição após o início do evento');
      return;
    }

    try {
      const { error } = await supabase
        .from('inscricoes')
        .update({ status: 'cancelada' })
        .eq('evento_id', evento.id)
        .eq('usuario_email', userEmail)
        .neq('status', 'cancelada');

      if (error) throw error;

      toast.success("Inscrição cancelada com sucesso!");
      carregarEventos(); // Recarregar para atualizar o status
    } catch (error: any) {
      console.error('Erro ao cancelar inscrição:', error);
      toast.error('Erro ao cancelar inscrição');
    }
  };

  const podeCancelarInscricao = (evento: Evento) => {
    if (!evento.inscrito) return false;
    const dataInicio = new Date(evento.data_inicio);
    const agora = new Date();
    return dataInicio > agora;
  };

  const formatarData = (dataInicio: string, dataFim: string) => {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    
    if (format(inicio, 'yyyy-MM-dd') === format(fim, 'yyyy-MM-dd')) {
      return format(inicio, "dd/MM/yyyy", { locale: ptBR });
    } else {
      return `${format(inicio, "dd/MM", { locale: ptBR })} - ${format(fim, "dd/MM/yyyy", { locale: ptBR })}`;
    }
  };

  const categorizarEvento = (evento: Evento): "proximos" | "andamento" | "historico" => {
    const agora = new Date();
    agora.setHours(0, 0, 0, 0); // Resetar horas para comparar apenas datas
    
    const dataInicio = new Date(evento.data_inicio);
    dataInicio.setHours(0, 0, 0, 0);
    
    const dataFim = new Date(evento.data_fim);
    dataFim.setHours(23, 59, 59, 999); // Fim do dia

    // Histórico: hoje é posterior à data de fim
    if (agora > dataFim) {
      return "historico";
    }
    
    // Próximos: data de início é maior que hoje
    if (dataInicio > agora) {
      return "proximos";
    }
    
    // Em andamento: hoje está entre data_inicio e data_fim
    if (agora >= dataInicio && agora <= dataFim) {
      return "andamento";
    }
    
    // Fallback (não deveria acontecer)
    return "historico";
  };

  const eventosProximos = eventos.filter(e => categorizarEvento(e) === "proximos");
  const eventosAndamento = eventos.filter(e => categorizarEvento(e) === "andamento");
  const eventosHistorico = eventos.filter(e => categorizarEvento(e) === "historico");

  const eventosFiltrados = filtroAtivo === "todos" 
    ? eventos 
    : filtroAtivo === "proximos" 
    ? eventosProximos 
    : filtroAtivo === "andamento" 
    ? eventosAndamento 
    : eventosHistorico;

  const renderEventos = (eventosLista: Evento[]) => {
    if (eventosLista.length === 0) {
      return (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nenhum evento encontrado</p>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {eventosLista.map((evento) => {
          const categoria = categorizarEvento(evento);
          const isHistorico = categoria === "historico";
          const isAndamento = categoria === "andamento";
          
          return (
          <Card 
            key={evento.id} 
            className="overflow-hidden hover:glow-border-hover transition-all cursor-pointer"
            onClick={() => {
              setEventoSelecionado(evento);
              setShowModal(true);
            }}
          >
            {evento.banner_url ? (
              <img 
                src={evento.banner_url} 
                alt={evento.titulo} 
                className={`w-full h-48 object-cover ${isHistorico ? 'grayscale' : ''}`}
              />
            ) : (
              <div className={`w-full h-48 bg-muted flex items-center justify-center ${isHistorico ? 'grayscale' : ''}`}>
                <p className="text-muted-foreground text-sm">Imagem indisponível</p>
              </div>
            )}
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-normal">{evento.titulo}</h3>
                {isAndamento ? (
                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                    <Clock className="w-3 h-3 mr-1" />
                    Evento em Andamento
                  </Badge>
                ) : evento.inscrito ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Inscrito
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    Disponível
                  </Badge>
                )}
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatarData(evento.data_inicio, evento.data_fim)}
                </div>
                {evento.data_encerramento_inscricoes && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Inscrições encerram em: {format(new Date(evento.data_encerramento_inscricoes), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                )}
                {evento.carga_horaria && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {evento.carga_horaria}h de carga horária
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {evento.campus || evento.local}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {evento.vagas_disponiveis} vagas disponíveis
                </div>
                {evento.valor && evento.valor > 0 && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    R$ {evento.valor.toFixed(2).replace('.', ',')}
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2">
                {evento.descricao}
              </p>

              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                {isHistorico && evento.inscrito ? (
                  <Button 
                    variant="outline" 
                    className="flex-1 border-destructive/20 text-destructive hover:bg-destructive/10 cursor-not-allowed"
                    disabled
                  >
                    <X className="w-4 h-4 mr-2" />
                    Evento encerrado
                  </Button>
                ) : inscricoesEncerradas(evento) ? (
                  <Button 
                    variant="outline" 
                    className="flex-1 border-destructive/20 text-destructive hover:bg-destructive/10 cursor-not-allowed"
                    disabled
                  >
                    <X className="w-4 h-4 mr-2" />
                    Inscrições encerradas
                  </Button>
                ) : evento.inscrito && podeCancelarInscricao(evento) ? (
                  <Button 
                    variant="outline" 
                    onClick={() => cancelarInscricao(evento)} 
                    className="flex-1 border-destructive/20 text-destructive hover:bg-destructive/10"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar Inscrição
                  </Button>
                ) : (
                  <Button 
                    variant="elegant" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSubscribe(evento);
                    }} 
                    className="flex-1"
                    disabled={evento.inscrito || evento.vagas_disponiveis === 0 || isHistorico || inscricoesEncerradas(evento)}
                  >
                    {evento.inscrito ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Já Inscrito
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 mr-2" />
                        Inscrever-se
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Card>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-light">Eventos</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-light">Eventos</h1>
      </div>

      {/* Filtro */}
      <Tabs value={filtroAtivo} onValueChange={(v) => setFiltroAtivo(v as FiltroEvento)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="todos">
            Todos ({eventos.length})
          </TabsTrigger>
          <TabsTrigger value="proximos">
            Próximos ({eventosProximos.length})
          </TabsTrigger>
          <TabsTrigger value="andamento">
            Em Andamento ({eventosAndamento.length})
          </TabsTrigger>
          <TabsTrigger value="historico">
            Histórico ({eventosHistorico.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="mt-6">
          {eventos.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum evento disponível no momento</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Próximos */}
              {eventosProximos.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-light text-foreground">Próximos:</h2>
                  {renderEventos(eventosProximos)}
                </div>
              )}

              {/* Em Andamento */}
              {eventosAndamento.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-light text-foreground">Andamento:</h2>
                  {renderEventos(eventosAndamento)}
                </div>
              )}

              {/* Histórico */}
              {eventosHistorico.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-light text-foreground">Histórico:</h2>
                  {renderEventos(eventosHistorico)}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="proximos" className="mt-6">
          {eventosProximos.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum evento próximo no momento</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-light text-foreground">Próximos:</h2>
              {renderEventos(eventosProximos)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="andamento" className="mt-6">
          {eventosAndamento.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum evento em andamento no momento</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-light text-foreground">Andamento:</h2>
              {renderEventos(eventosAndamento)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          {eventosHistorico.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum evento no histórico</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-light text-foreground">Histórico:</h2>
              {renderEventos(eventosHistorico)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Inscrição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg w-[90vw] max-h-[90vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle>
              {eventoSelecionado?.inscrito ? "Detalhes do Evento" : "Confirmar Inscrição"}
            </DialogTitle>
            <DialogDescription>
              {eventoSelecionado?.inscrito 
                ? "Você já está inscrito neste evento"
                : "Revise as informações do evento antes de confirmar sua inscrição"}
            </DialogDescription>
          </DialogHeader>
          
          {eventoSelecionado && (
            <div className="space-y-4">
              {/* Banner */}
              {eventoSelecionado.banner_url && (
                <img 
                  src={eventoSelecionado.banner_url} 
                  alt={eventoSelecionado.titulo} 
                  className="w-full h-32 sm:h-40 object-cover rounded-lg" 
                />
              )}

              {/* Informações do Evento */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-normal mb-1">{eventoSelecionado.titulo}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">{eventoSelecionado.descricao}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Data</p>
                        <p className="font-normal">
                          {formatarData(eventoSelecionado.data_inicio, eventoSelecionado.data_fim)}
                        </p>
                      </div>
                    </div>

                    {eventoSelecionado.carga_horaria && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Carga Horária</p>
                          <p className="font-normal">{eventoSelecionado.carga_horaria}h</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Local</p>
                        <p className="font-normal">{eventoSelecionado.campus || eventoSelecionado.local}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Vagas Disponíveis</p>
                        <p className="font-normal">{eventoSelecionado.vagas_disponiveis}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Valor */}
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Valor da Inscrição</p>
                        <p className="text-xl font-light">
                          R$ {eventoSelecionado.valor?.toFixed(2).replace('.', ',') || '0,00'}
                        </p>
                      </div>
                    </div>
                    {(!eventoSelecionado.valor || eventoSelecionado.valor === 0) ? (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <FileText className="w-3 h-3" />
                        Gratuito
                      </Badge>
                    ) : (
                      <Badge variant="default" className="gap-1 text-xs">
                        <DollarSign className="w-3 h-3" />
                        Pago
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Botões */}
              {eventoSelecionado.inscrito ? (
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowModal(false)} 
                    className="flex-1"
                  >
                    Fechar
                  </Button>
                  {podeCancelarInscricao(eventoSelecionado) && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowModal(false);
                        cancelarInscricao(eventoSelecionado);
                      }} 
                      className="flex-1 border-destructive/20 text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar Inscrição
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowModal(false)} 
                    className="flex-1"
                    disabled={inscrevendo}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="elegant" 
                    onClick={confirmarInscricao} 
                    className="flex-1"
                    disabled={inscrevendo}
                  >
                    {inscrevendo ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Confirmando...
                      </>
                    ) : (
                      'Confirmar Inscrição'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

