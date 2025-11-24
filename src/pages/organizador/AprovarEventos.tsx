import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Upload, Clock, Eye, CheckCircle, Calendar as CalendarIcon, MapPin, Users, Loader2, User, X } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { DatePicker } from "@/components/DatePicker";
import MapPicker from "@/components/MapPicker";

interface EventoPendente {
  id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  latitude: number | null;
  longitude: number | null;
  raio_validacao_metros: number | null;
  nao_requer_validacao_localizacao: boolean | null;
  data_encerramento_inscricoes: string | null;
  coordenador_id: string | null;
  campus: string | null;
  sala: string | null;
  capacidade_maxima: number;
  organizador_email: string;
  organizador_nome: string;
  carga_horaria: number | null;
  gera_certificado: boolean;
  banner_url: string | null;
  categoria: string | null;
  valor: number | null;
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
  
  // Campos para preencher ao aprovar
  const [tipo, setTipo] = useState<string>("");
  const [dataEncerramentoInscricoes, setDataEncerramentoInscricoes] = useState<Date | undefined>();
  const [local, setLocal] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [raioValidacaoMetros, setRaioValidacaoMetros] = useState<number>(100);
  const [naoRequerValidacaoLocalizacao, setNaoRequerValidacaoLocalizacao] = useState(false);
  const [cargaHoraria, setCargaHoraria] = useState<number>(0);
  const [coordenadorId, setCoordenadorId] = useState<string>("");
  const [coordenadoresOptions, setCoordenadoresOptions] = useState<Array<{ id: string; nome: string; descricao: string }>>([]);
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [palestrantes, setPalestrantes] = useState<Array<{ nome: string; tema: string; descricao: string }>>([]);
  const [palestranteNome, setPalestranteNome] = useState("");
  const [palestranteTema, setPalestranteTema] = useState("");
  const [palestranteDescricao, setPalestranteDescricao] = useState("");
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Carregar coordenadores
  useEffect(() => {
    const loadCoordenadores = async () => {
      try {
        const { data, error } = await supabase
          .from("coordenadores")
          .select("id, nome, descricao")
          .eq("ativo", true)
          .order("nome", { ascending: true });

        if (error) {
          console.error("Erro ao carregar coordenadores:", error);
        } else {
          setCoordenadoresOptions(data || []);
        }
      } catch (err) {
        console.error("Erro ao buscar coordenadores:", err);
      }
    };

    loadCoordenadores();
  }, []);

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

  // Preencher campos quando uma solicitação é selecionada e o modal é aberto
  useEffect(() => {
    if (selectedSolicitacao && showModal) {
      // Preencher campos com dados do evento (se existirem)
      setTipo(selectedSolicitacao.tipo || "");
      setLocal(selectedSolicitacao.local || "");
      setCargaHoraria(selectedSolicitacao.carga_horaria || 0);
      setCoordenadorId(selectedSolicitacao.coordenador_id || "");
      
      // Preencher localização se existir
      if (selectedSolicitacao.latitude && selectedSolicitacao.longitude) {
        setLatitude(selectedSolicitacao.latitude);
        setLongitude(selectedSolicitacao.longitude);
      } else {
        setLatitude(null);
        setLongitude(null);
      }
      
      // Preencher raio de validação
      if (selectedSolicitacao.raio_validacao_metros) {
        setRaioValidacaoMetros(selectedSolicitacao.raio_validacao_metros);
      } else {
        setRaioValidacaoMetros(100);
      }
      
      // Preencher flag de validação de localização
      if (selectedSolicitacao.nao_requer_validacao_localizacao !== null) {
        setNaoRequerValidacaoLocalizacao(selectedSolicitacao.nao_requer_validacao_localizacao);
      } else {
        setNaoRequerValidacaoLocalizacao(false);
      }
      
      // Preencher data de encerramento de inscrições
      if (selectedSolicitacao.data_encerramento_inscricoes) {
        setDataEncerramentoInscricoes(new Date(selectedSolicitacao.data_encerramento_inscricoes));
      } else {
        setDataEncerramentoInscricoes(undefined);
      }
      
      // Se já tem banner, mostrar preview
      if (selectedSolicitacao.banner_url) {
        setBannerUrl(selectedSolicitacao.banner_url);
      } else {
        setBannerUrl("");
      }
      setBannerFile(null);
      
      // Carregar palestrantes existentes do evento
      const carregarPalestrantes = async () => {
        const { data } = await supabase
          .from('palestrantes')
          .select('*')
          .eq('evento_id', selectedSolicitacao.id)
          .order('ordem');
        
        if (data && data.length > 0) {
          setPalestrantes(data.map(p => ({
            nome: p.nome,
            tema: p.tema,
            descricao: p.descricao || ''
          })));
        } else {
          setPalestrantes([]);
        }
      };
      
      carregarPalestrantes();
    }
  }, [selectedSolicitacao, showModal]);

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
        .select('id, titulo, descricao, tipo, data_inicio, data_fim, local, latitude, longitude, raio_validacao_metros, nao_requer_validacao_localizacao, data_encerramento_inscricoes, coordenador_id, campus, sala, capacidade_maxima, organizador_email, organizador_nome, carga_horaria, gera_certificado, banner_url, categoria, valor, created_at')
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

  const handleBannerClick = () => {
    bannerInputRef.current?.click();
  };

  const handleBannerChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setBannerFile(file);
    
    // Preview local
    const reader = new FileReader();
    reader.onloadend = () => {
      setBannerUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadBanner = async (): Promise<string | null> => {
    if (!bannerFile) return null;

    setUploadingBanner(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) throw new Error("Usuário não autenticado");

      const fileExt = bannerFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('eventos')
        .upload(filePath, bannerFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('eventos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload do banner:', error);
      toast.error("Erro ao fazer upload do banner");
      return null;
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleAdicionarPalestrante = () => {
    if (!palestranteNome.trim()) {
      toast.error("Digite o nome do palestrante");
      return;
    }

    if (!palestranteTema.trim()) {
      toast.error("Digite o tema da palestra");
      return;
    }

    if (!palestranteDescricao.trim()) {
      toast.error("Digite a descrição do que será apresentado");
      return;
    }
    
    if (palestrantes.some(p => p.nome === palestranteNome)) {
      toast.error("Este palestrante já foi adicionado");
      return;
    }

    setPalestrantes([...palestrantes, { 
      nome: palestranteNome, 
      tema: palestranteTema,
      descricao: palestranteDescricao 
    }]);
    setPalestranteNome("");
    setPalestranteTema("");
    setPalestranteDescricao("");
    toast.success("Palestrante adicionado!");
  };

  const handleRemoverPalestrante = (nome: string) => {
    setPalestrantes(palestrantes.filter(p => p.nome !== nome));
  };

  const resetarCamposAprovacao = () => {
    setTipo("");
    setDataEncerramentoInscricoes(undefined);
    setLocal("");
    setLatitude(null);
    setLongitude(null);
    setRaioValidacaoMetros(100);
    setNaoRequerValidacaoLocalizacao(false);
    setCargaHoraria(0);
    setCoordenadorId("");
    setBannerUrl("");
    setBannerFile(null);
    setPalestrantes([]);
    setPalestranteNome("");
    setPalestranteTema("");
    setPalestranteDescricao("");
  };

  const handleAprovar = async () => {
    if (!selectedSolicitacao) return;

    // Validações
    if (!tipo) {
      toast.error("Selecione o tipo de evento");
      return;
    }

    if (!local.trim() || !latitude || !longitude) {
      toast.error("Selecione o local do evento no mapa");
      return;
    }

    if (!cargaHoraria || cargaHoraria <= 0) {
      toast.error("Informe a carga horária (maior que 0)");
      return;
    }

    if (!coordenadorId) {
      toast.error("Selecione o coordenador do curso");
      return;
    }

    setProcessando(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        toast.error("Você precisa estar logado");
        return;
      }

      // Upload do banner se houver
      let bannerUrlFinal = null;
      if (bannerFile) {
        bannerUrlFinal = await uploadBanner();
        if (!bannerUrlFinal) {
          toast.warning("Evento será aprovado sem banner");
        }
      }

      // Atualizar evento com todos os campos
      const updateData: Record<string, unknown> = {
        status: 'aprovado',
        aprovador_email: session.user.email,
        data_aprovacao: new Date().toISOString(),
        tipo: tipo,
        data_encerramento_inscricoes: dataEncerramentoInscricoes ? dataEncerramentoInscricoes.toISOString() : null,
        local: local.trim(),
        latitude: latitude,
        longitude: longitude,
        raio_validacao_metros: raioValidacaoMetros,
        nao_requer_validacao_localizacao: naoRequerValidacaoLocalizacao,
        carga_horaria: cargaHoraria,
        coordenador_id: coordenadorId,
        banner_url: bannerUrlFinal,
      };

      const { error: updateError } = await supabase
        .from('eventos')
        .update(updateData)
        .eq('id', selectedSolicitacao.id);

      if (updateError) throw updateError;

      // Salvar palestrantes
      if (palestrantes.length > 0) {
        const palestrantesData = palestrantes.map((p, index) => ({
          evento_id: selectedSolicitacao.id,
          nome: p.nome,
          tema: p.tema,
          descricao: p.descricao,
          ordem: index
        }));

        const { error: palestrantesError } = await supabase
          .from('palestrantes')
          .insert(palestrantesData);

        if (palestrantesError) {
          console.error('Erro ao salvar palestrantes:', palestrantesError);
          toast.warning("Evento aprovado, mas houve erro ao salvar alguns palestrantes");
        }
      }

      toast.success("Solicitação aprovada com sucesso!");
      setShowModal(false);
      setSelectedSolicitacao(null);
      resetarCamposAprovacao();
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
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-base font-normal mb-2">{evento.titulo}</h3>
                      <p className="text-sm text-muted-foreground">
                        <User className="w-3 h-3 inline mr-1" />
                        {evento.organizador_nome || evento.organizador_email}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {evento.local || evento.campus || "Localização não informada"}
                      </p>
                    </div>
                    <Button
                      variant="elegant"
                      size="sm"
                      onClick={() => {
                        setSelectedSolicitacao(evento);
                        setShowModal(true);
                      }}
                      className="w-full"
                    >
                      Analisar Aprovação
                    </Button>
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

      {/* Modal Analisar e Preencher Campos */}
      <Dialog open={showModal} onOpenChange={(open) => {
        setShowModal(open);
        if (!open) {
          resetarCamposAprovacao();
          setSelectedSolicitacao(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle>Analisar e Aprovar Solicitação</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Informações da Solicitação */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h3 className="text-xl font-normal">{selectedSolicitacao?.titulo}</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p><span className="font-medium">Solicitante:</span> {selectedSolicitacao?.organizador_nome || selectedSolicitacao?.organizador_email}</p>
                <p><span className="font-medium">Período:</span> {selectedSolicitacao && format(new Date(selectedSolicitacao.data_inicio), "dd/MM/yyyy", { locale: ptBR })} até {selectedSolicitacao && format(new Date(selectedSolicitacao.data_fim), "dd/MM/yyyy", { locale: ptBR })}</p>
                <p><span className="font-medium">Campus:</span> {selectedSolicitacao?.campus || "Não informado"}{selectedSolicitacao?.sala && ` - Sala: ${selectedSolicitacao.sala}`}</p>
                <p><span className="font-medium">Capacidade:</span> {selectedSolicitacao?.capacidade_maxima} pessoas</p>
                <p><span className="font-medium">Valor:</span> R$ {selectedSolicitacao?.valor ? selectedSolicitacao.valor.toFixed(2).replace('.', ',') : '0,00'}</p>
                <p><span className="font-medium">Categoria:</span> {selectedSolicitacao?.categoria || "Não informada"}</p>
              </div>
              {selectedSolicitacao?.descricao && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-sm font-medium mb-1">Descrição:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedSolicitacao.descricao}</p>
                </div>
              )}
            </div>

            {/* Campos para Preencher */}
            <div className="space-y-4">
              <h4 className="text-lg font-normal">Preencha os campos obrigatórios:</h4>

              {/* Banner */}
              <div>
                <Label>Banner do Evento (opcional)</Label>
                <div 
                  className="relative h-32 bg-muted flex flex-col items-center justify-center bg-cover bg-center gap-2 rounded-lg"
                  style={{ backgroundImage: bannerUrl ? `url(${bannerUrl})` : 'none' }}
                >
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBannerChange}
                    className="hidden"
                  />
                  
                  <Button 
                    variant="outline" 
                    onClick={handleBannerClick}
                    disabled={uploadingBanner}
                    className="bg-background/80 backdrop-blur-sm"
                    size="sm"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingBanner ? "Enviando..." : bannerUrl ? "Trocar Banner" : "Adicionar Banner"}
                  </Button>
                </div>
              </div>

              {/* Tipo de Evento */}
              <div>
                <Label>Tipo de Evento *</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="palestra">Palestra</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="seminario">Seminário</SelectItem>
                    <SelectItem value="conferencia">Conferência</SelectItem>
                    <SelectItem value="curso">Curso</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data de Encerramento de Inscrições */}
              <div>
                <Label>Inscrições encerram em: (opcional)</Label>
                <DatePicker
                  date={dataEncerramentoInscricoes}
                  onDateChange={(date) => setDataEncerramentoInscricoes(date)}
                  placeholder="Selecione a data de encerramento"
                />
              </div>

              {/* Localização */}
              <div>
                <Label>Localização do Evento *</Label>
                <MapPicker
                  onLocationSelect={(location) => {
                    setLocal(location.address);
                    setLatitude(location.lat);
                    setLongitude(location.lng);
                  }}
                  initialLocation={
                    latitude && longitude
                      ? { lat: latitude, lng: longitude }
                      : undefined
                  }
                  raioValidacaoMetros={raioValidacaoMetros}
                />
                {local && (
                  <div className="p-3 bg-muted rounded-lg mt-2">
                    <p className="text-sm font-medium">Endereço selecionado:</p>
                    <p className="text-sm text-muted-foreground">{local}</p>
                  </div>
                )}
              </div>

              {/* Raio de Validação GPS */}
              <div>
                <Label>Raio de Validação GPS</Label>
                <Select 
                  value={naoRequerValidacaoLocalizacao ? "none" : raioValidacaoMetros.toString()} 
                  onValueChange={(value) => {
                    if (value === "none") {
                      setNaoRequerValidacaoLocalizacao(true);
                      setRaioValidacaoMetros(100);
                    } else {
                      setNaoRequerValidacaoLocalizacao(false);
                      setRaioValidacaoMetros(Number(value));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o raio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50 metros (Dentro do prédio)</SelectItem>
                    <SelectItem value="100">100 metros (No campus) - Recomendado</SelectItem>
                    <SelectItem value="200">200 metros (Área próxima)</SelectItem>
                    <SelectItem value="500">500 metros (Quarteirão)</SelectItem>
                    <SelectItem value="1000">1 km (Eventos externos)</SelectItem>
                    <SelectItem value="2000">2 km (Eventos em área ampla)</SelectItem>
                    <SelectItem value="none">Não requisitar validação de localização</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Carga Horária */}
              <div>
                <Label>Carga Horária (horas) *</Label>
                <Input
                  type="number"
                  placeholder="Ex: 40"
                  value={cargaHoraria || ""}
                  onChange={(e) => setCargaHoraria(Number(e.target.value))}
                />
              </div>

              {/* Coordenador do Curso */}
              <div>
                <Label>Coordenador do Curso *</Label>
                <Select value={coordenadorId} onValueChange={setCoordenadorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o coordenador" />
                  </SelectTrigger>
                  <SelectContent>
                    {coordenadoresOptions.length === 0 ? (
                      <SelectItem value="__no_coord" disabled>
                        Nenhum coordenador disponível
                      </SelectItem>
                    ) : (
                      coordenadoresOptions.map((coord) => (
                        <SelectItem key={coord.id} value={coord.id}>
                          {coord.nome} - {coord.descricao}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Palestrantes */}
              <div>
                <Label>Palestrantes (opcional)</Label>
                <div className="space-y-3 mb-4">
                  <Input
                    placeholder="Nome do palestrante"
                    value={palestranteNome}
                    onChange={(e) => setPalestranteNome(e.target.value)}
                  />
                  <Input
                    placeholder="Tema da apresentação"
                    value={palestranteTema}
                    onChange={(e) => setPalestranteTema(e.target.value)}
                  />
                  <Textarea
                    placeholder="Descrição do que será apresentado..."
                    value={palestranteDescricao}
                    onChange={(e) => setPalestranteDescricao(e.target.value)}
                    rows={3}
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={handleAdicionarPalestrante}
                    className="w-full"
                  >
                    Adicionar Palestrante
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {palestrantes.map((p, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 border rounded-lg bg-card"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="font-medium text-sm">{p.nome}</p>
                        <p className="text-xs text-muted-foreground font-medium">{p.tema}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{p.descricao}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoverPalestrante(p.nome)}
                        className="flex-shrink-0 w-8 h-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {palestrantes.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                      Nenhum palestrante adicionado
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-2 pt-4 border-t">
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
                disabled={processando || uploadingBanner}
                className="flex-1"
              >
                {processando ? "Processando..." : "Criar Evento"}
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


