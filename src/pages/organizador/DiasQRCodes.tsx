import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, Calendar, Clock, Download, Loader2, MapPin, Key, Copy, CheckCircle, XCircle, PlayCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";
import { format, differenceInDays, addDays, isAfter, isBefore, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import QRCode from "qrcode";
import { getRouteUrl } from "@/lib/config";

interface Evento {
  id: string;
  titulo: string;
  data_inicio: string;
  data_fim: string;
  carga_horaria: number | null;
  status: string;
  local: string;
  latitude: number | null;
  longitude: number | null;
  raio_validacao_metros: number | null;
  codigo_qrcode: string | null;
  organizador_email: string;
}

interface PalavraChave {
  id: string;
  evento_id: string;
  data_evento: string;
  palavra_chave: string;
  created_at: string;
}

interface EventoComPalavrasChave extends Evento {
  palavras_chave: PalavraChave[];
}

type StatusEvento = "ativa" | "em_andamento" | "expirada";

export default function DiasQRCodes() {
  const toast = useToast();
  const [eventos, setEventos] = useState<EventoComPalavrasChave[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventoExpandido, setEventoExpandido] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useState<{ [key: string]: string }>({});
  const [filtroStatus, setFiltroStatus] = useState<StatusEvento | "todos">("todos");
  const [gerandoPalavras, setGerandoPalavras] = useState<{ [key: string]: boolean }>({});
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const autoProcessadosRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    carregarEventos();
  }, []);

  const carregarEventos = async () => {
    try {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Erro ao obter sessão:", sessionError);
        toast.error("Erro ao obter sessão do usuário");
        setLoading(false);
        return;
      }

      if (!session?.user?.email) {
        console.log("Nenhum usuário autenticado");
        toast.error("Usuário não autenticado");
        setLoading(false);
        return;
      }
      setUserEmail(session.user.email);

      // Buscar eventos aprovados (todos os organizadores podem ver todos os eventos)
      const { data: eventosData, error: eventosError } = await supabase
        .from('eventos')
        .select('*')
        .eq('status', 'aprovado')
        .order('data_inicio', { ascending: false });

      if (eventosError) {
        console.error('Erro na query eventos:', eventosError);
        toast.error(`Erro ao buscar eventos: ${eventosError.message}`);
        setLoading(false);
        return;
      }

      if (!eventosData || eventosData.length === 0) {
        setEventos([]);
        setLoading(false);
        return;
      }

      // Buscar palavras-chave para cada evento
      const eventosIds = eventosData.map(e => e.id);
      const { data: palavrasChaveData, error: palavrasError } = await supabase
        .from('evento_palavras_chave')
        .select('*')
        .in('evento_id', eventosIds)
        .order('data_evento', { ascending: true });

      if (palavrasError) {
        console.error('Erro ao buscar palavras-chave:', palavrasError);
      }

      // Agrupar palavras-chave por evento
      const palavrasPorEvento: Record<string, PalavraChave[]> = {};
      (palavrasChaveData || []).forEach(pc => {
        if (!palavrasPorEvento[pc.evento_id]) {
          palavrasPorEvento[pc.evento_id] = [];
        }
        palavrasPorEvento[pc.evento_id].push(pc);
      });

      // Combinar eventos com palavras-chave
      const eventosComPalavras: EventoComPalavrasChave[] = eventosData.map(evento => ({
        ...evento,
        palavras_chave: palavrasPorEvento[evento.id] || []
      }));

      setEventos(eventosComPalavras);
    } catch (error: any) {
      console.error('Erro ao carregar eventos:', error);
      toast.error(`Erro: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusEvento = (evento: Evento): StatusEvento => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const dataInicio = new Date(evento.data_inicio);
    dataInicio.setHours(0, 0, 0, 0);
    
    const dataFim = new Date(evento.data_fim);
    dataFim.setHours(23, 59, 59, 999);

    if (isBefore(hoje, dataInicio)) {
      return "ativa";
    } else if (isWithinInterval(hoje, { start: dataInicio, end: dataFim })) {
      return "em_andamento";
    } else {
      return "expirada";
    }
  };

  const getStatusPalavraChave = (dataEvento: string): StatusEvento => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const data = new Date(dataEvento);
    data.setHours(0, 0, 0, 0);

    if (isBefore(hoje, data)) {
      return "ativa";
    } else if (hoje.getTime() === data.getTime()) {
      return "em_andamento";
    } else {
      return "expirada";
    }
  };

  const gerarQRCode = async (
    eventoId: string,
    codigoQRCode: string
  ) => {
    try {
      const url = getRouteUrl(`/registrar-presenca/${codigoQRCode}`);
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      return qrCodeDataUrl;
    } catch (error) {
      console.error('Erro ao gerar QR code:', error);
      toast.error('Erro ao gerar QR code');
      return null;
    }
  };

  const handleExpandir = async (eventoId: string) => {
    if (eventoExpandido === eventoId) {
      setEventoExpandido(null);
      return;
    }

    setEventoExpandido(eventoId);

    // Gerar QR code único para o evento
    const evento = eventos.find(e => e.id === eventoId);
    if (!evento || !evento.codigo_qrcode) return;

    const qrCode = await gerarQRCode(eventoId, evento.codigo_qrcode);
    if (qrCode) {
      setQrCodes(prev => ({ ...prev, [eventoId]: qrCode }));
    }
  };

  const handleBaixarQRCode = (qrCodeUrl: string, eventoTitulo: string) => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qrcode-${eventoTitulo.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code baixado!');
  };

  const handleCopiarCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    toast.success('Código copiado!');
  };

  const getDiasEvento = (evento: Evento) => {
    const dataInicio = new Date(evento.data_inicio);
    const dataFim = new Date(evento.data_fim);
    const dias = differenceInDays(dataFim, dataInicio) + 1;
    
    const listaDias = [];
    for (let i = 0; i < dias; i++) {
      listaDias.push(addDays(dataInicio, i));
    }
    return listaDias;
  };

  const gerarCodigoAleatorio = (tamanho = 6) => {
    const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let palavra = "";
    for (let i = 0; i < tamanho; i++) {
      palavra += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return palavra.toUpperCase();
  };

  const gerarPalavrasChaveParaEvento = async (evento: EventoComPalavrasChave) => {
    try {
      setGerandoPalavras(prev => ({ ...prev, [evento.id]: true }));

      const doFallbackUpsert = async () => {
        const dias = getDiasEvento(evento);
        const existentes = new Set(
          (evento.palavras_chave || []).map(pc =>
            format(new Date(pc.data_evento), 'yyyy-MM-dd')
          )
        );

        const registros = dias
          .map(d => format(d, 'yyyy-MM-dd'))
          .filter(dataStr => !existentes.has(dataStr))
          .map(dataStr => ({
            evento_id: evento.id,
            data_evento: dataStr,
            palavra_chave: gerarCodigoAleatorio(6)
          }));

        if (registros.length === 0) {
          toast.success('Todas as palavras-chave já foram geradas');
          return;
        }

        const { error } = await supabase
          .from('evento_palavras_chave')
          .upsert(registros, { onConflict: 'evento_id,data_evento' });

        if (error) {
          const emsg = `${error.message || ''} ${error.details || ''}`.trim().toLowerCase();
          if (emsg.includes('security') || emsg.includes('permission')) {
            toast.error('Permissão negada para gerar palavras-chave neste evento');
          } else if (emsg.includes('unique')) {
            toast.error('Conflito de chave única em evento_id,data_evento');
          } else if (emsg.includes('foreign key')) {
            toast.error('Evento inexistente para o evento_id informado');
          } else if (emsg.includes('invalid input syntax')) {
            toast.error('Evento_id inválido (UUID malformado)');
          } else {
            toast.error('Erro ao gerar palavras-chave');
          }
          return;
        }
      };

      // Primeiro tenta via RPC com SECURITY DEFINER (se existir no banco)
      // Tenta com nome de parâmetro 'p_evento_id' e, se falhar, tenta 'evento_id'
      let rpcError: any = null;
      const rpc1 = await supabase.rpc('generate_missing_event_keys', { p_evento_id: evento.id });
      rpcError = rpc1.error;
      if (rpcError) {
        const msg1 = `${rpcError.message || ''} ${rpcError.details || ''}`.trim().toLowerCase();
        // Tenta com nome alternativo do parâmetro
        const rpc2 = await supabase.rpc('generate_missing_event_keys', { evento_id: evento.id });
        rpcError = rpc2.error;
        if (!rpcError) {
          toast.success('Palavras-chave geradas com sucesso');
          await carregarEventos();
          return;
        }
        const msg2 = `${rpcError.message || ''} ${rpcError.details || ''}`.trim().toLowerCase();
        // Se a função não existir, faz fallback para upsert direto
        if (msg1.includes('function generate_missing_event_keys') || msg1.includes('not found') ||
            msg2.includes('function generate_missing_event_keys') || msg2.includes('not found')) {
          await doFallbackUpsert();
          if (!gerandoPalavras[evento.id]) return;
        } else if (msg1.includes('permission') || msg1.includes('security') ||
                   msg2.includes('permission') || msg2.includes('security')) {
          await doFallbackUpsert();
          return;
        } else if (msg1.includes('foreign key') || msg2.includes('foreign key')) {
          toast.error('Evento inexistente para o evento_id informado');
          return;
        } else if (msg1.includes('invalid input syntax') || msg2.includes('invalid input syntax')) {
          toast.error('Evento_id inválido (UUID malformado)');
          return;
        }
      }

      if (rpcError) {
        const msg = `${rpcError.message || ''} ${rpcError.details || ''}`.trim().toLowerCase();
        // Se a função não existe, faz fallback para upsert direto
        if (msg.includes('function generate_missing_event_keys') || msg.includes('not found')) {
          await doFallbackUpsert();
        } else if (msg.includes('permission') || msg.includes('security')) {
          await doFallbackUpsert();
          return;
        } else {
          toast.error('Erro ao gerar palavras-chave');
          return;
        }
      }

      toast.success('Palavras-chave geradas com sucesso');
      await carregarEventos();
    } catch (err: any) {
      console.error('Erro inesperado ao gerar palavras-chave:', err);
      toast.error(`Erro: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setGerandoPalavras(prev => ({ ...prev, [evento.id]: false }));
    }
  };

  useEffect(() => {
    if (!userEmail || eventos.length === 0) return;
    eventos.forEach(async (evento) => {
      if (autoProcessadosRef.current.has(evento.id)) return;
      const dias = getDiasEvento(evento);
      const existentes = new Set(
        (evento.palavras_chave || []).map(pc =>
          format(new Date(pc.data_evento), 'yyyy-MM-dd')
        )
      );
      if (existentes.size < dias.length) {
        autoProcessadosRef.current.add(evento.id);
        await gerarPalavrasChaveParaEvento(evento);
      }
    });
  }, [eventos, userEmail]);

  const eventosFiltrados = eventos.filter(evento => {
    if (filtroStatus === "todos") return true;
    return getStatusEvento(evento) === filtroStatus;
  });

  const getStatusBadge = (status: StatusEvento) => {
    switch (status) {
      case "ativa":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 gap-1"><CheckCircle className="w-3 h-3" />Ativa</Badge>;
      case "em_andamento":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 gap-1"><PlayCircle className="w-3 h-3" />Em Andamento</Badge>;
      case "expirada":
        return <Badge className="bg-muted text-muted-foreground border-border gap-1"><XCircle className="w-3 h-3" />Expirada</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Histórico de QR Codes e Palavras Chaves</h1>
          <p className="text-muted-foreground">Gerencie os QR Codes e palavras-chave dos seus eventos</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Histórico de QR Codes e Palavras Chaves</h1>
        <p className="text-muted-foreground">Gerencie os QR Codes e palavras-chave dos seus eventos</p>
      </div>

      {/* Filtro de Status */}
      <Tabs value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as StatusEvento | "todos")}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="ativa">Ativas</TabsTrigger>
          <TabsTrigger value="em_andamento">Em Andamento</TabsTrigger>
          <TabsTrigger value="expirada">Expiradas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {eventosFiltrados.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-muted-foreground space-y-3">
              <QrCode className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <div>
                <p className="text-lg font-normal">Nenhum evento encontrado</p>
                <p className="text-sm mt-2">
                  {filtroStatus === "todos" 
                    ? "Você ainda não tem eventos aprovados."
                    : `Nenhum evento com status "${filtroStatus}" encontrado.`}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          eventosFiltrados.map((evento) => {
            const statusEvento = getStatusEvento(evento);
            const expandido = eventoExpandido === evento.id;

            return (
              <Card key={evento.id} className="p-6">
                <div className="space-y-4">
                  {/* Header do Evento */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-normal">{evento.titulo}</h3>
                        {getStatusBadge(statusEvento)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(evento.data_inicio), "dd/MM/yyyy", { locale: ptBR })} -{' '}
                          {format(new Date(evento.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {evento.local}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExpandir(evento.id)}
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      {expandido ? 'Ocultar' : 'Ver'} Detalhes
                    </Button>
                  </div>

                  {/* QR Code e Palavras Chave */}
                  {expandido && (
                    <div className="pt-4 border-t space-y-6">
                      {/* QR Code do Evento */}
                      {evento.codigo_qrcode && (
                        <div>
                          <h4 className="text-sm font-normal mb-3 flex items-center gap-2">
                            <QrCode className="w-4 h-4" />
                            QR Code do Evento
                          </h4>
                          <Card className="p-6">
                            <div className="flex flex-col md:flex-row gap-6">
                              <div className="flex-shrink-0 text-center">
                                {qrCodes[evento.id] ? (
                                  <>
                                    <div className="bg-white p-4 rounded-lg inline-block border">
                                      <img 
                                        src={qrCodes[evento.id]} 
                                        alt="QR Code do Evento"
                                        className="w-64 h-64"
                                      />
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleBaixarQRCode(qrCodes[evento.id], evento.titulo)}
                                      className="w-full mt-3"
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Baixar QR Code
                                    </Button>
                                  </>
                                ) : (
                                  <div className="flex items-center justify-center h-64 w-64">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 space-y-4">
                                <div>
                                  <p className="text-sm text-muted-foreground mb-1">Código do QR Code:</p>
                                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                                    <code className="text-lg font-mono font-bold flex-1 text-center">
                                      {evento.codigo_qrcode}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCopiarCodigo(evento.codigo_qrcode!)}
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  <p>Status: {getStatusBadge(statusEvento)}</p>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </div>
                      )}

                      {/* Palavras Chave por Dia */}
                      <div>
                        <h4 className="text-sm font-normal mb-3 flex items-center gap-2">
                          <Key className="w-4 h-4" />
                          Palavras-chave dos Dias
                        </h4>
                        {evento.palavras_chave.length === 0 ? (
                          <Card className="p-6 text-center">
                            <p className="text-muted-foreground mb-3">Nenhuma palavra-chave cadastrada para este evento</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => gerarPalavrasChaveParaEvento(evento)}
                              disabled={gerandoPalavras[evento.id]}
                            >
                              {gerandoPalavras[evento.id] ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Gerando...
                                </>
                              ) : (
                                <>
                                  <Key className="w-4 h-4 mr-2" />
                                  Gerar palavras-chave para os dias
                                </>
                              )}
                            </Button>
                          </Card>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {evento.palavras_chave.map((palavraChave) => {
                              const statusPalavra = getStatusPalavraChave(palavraChave.data_evento);
                              const diasEvento = getDiasEvento(evento);
                              const diaIndex = diasEvento.findIndex(d => 
                                format(d, 'yyyy-MM-dd') === format(new Date(palavraChave.data_evento), 'yyyy-MM-dd')
                              ) + 1;

                              return (
                                <Card key={palavraChave.id} className="p-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-normal">Dia {diaIndex}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {format(new Date(palavraChave.data_evento), "dd/MM/yyyy", { locale: ptBR })}
                                        </p>
                                      </div>
                                      {getStatusBadge(statusPalavra)}
                                    </div>

                                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                                      <code className="text-lg font-mono font-bold flex-1 text-center uppercase">
                                        {palavraChave.palavra_chave}
                                      </code>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCopiarCodigo(palavraChave.palavra_chave)}
                                      >
                                        <Copy className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

