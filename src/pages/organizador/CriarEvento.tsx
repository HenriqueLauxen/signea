import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Save, Pen, Calendar as CalendarIcon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import MapPicker from "@/components/MapPicker";
import { DatePicker } from "@/components/DatePicker";

export default function CriarEvento() {
  const navigate = useNavigate();
  const toast = useToast();
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  const [titulo, setTitulo] = useState("Nome do Evento");
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [dataEncerramentoInscricoes, setDataEncerramentoInscricoes] = useState<Date | undefined>();
  const [local, setLocal] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [raioValidacaoMetros, setRaioValidacaoMetros] = useState<number>(100);
  const [naoRequerValidacaoLocalizacao, setNaoRequerValidacaoLocalizacao] = useState(false);
  const [campus, setCampus] = useState("");
  const [campusOptions, setCampusOptions] = useState<string[]>([]);
  const [coordenadorId, setCoordenadorId] = useState<string>("");
  const [coordenadoresOptions, setCoordenadoresOptions] = useState<Array<{ id: string; nome: string; descricao: string }>>([]);
  const [cursosSelecionados, setCursosSelecionados] = useState<string[]>([]);
  const [cursosOptions, setCursosOptions] = useState<Array<{ id: string; nome: string }>>([]);
  const [sala, setSala] = useState("");
  const [capacidadeMaxima, setCapacidadeMaxima] = useState<number>(0);
  const [cargaHoraria, setCargaHoraria] = useState<number>(0);
  const [valor, setValor] = useState<number>(0);
  const [categoria, setCategoria] = useState("");
  const [publicoAlvoPerfil, setPublicoAlvoPerfil] = useState<string>("aluno");
  
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  
  const [palestranteNome, setPalestranteNome] = useState("");
  const [palestranteTema, setPalestranteTema] = useState("");
  const [palestranteDescricao, setPalestranteDescricao] = useState("");
  const [palestrantes, setPalestrantes] = useState<Array<{ nome: string; tema: string; descricao: string }>>([]);
  
  const [loading, setLoading] = useState(false);

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

  // Carregar coordenadores do banco de dados
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

  // Carregar cursos do banco de dados
  useEffect(() => {
    const loadCursos = async () => {
      try {
        const { data, error } = await supabase
          .from("cursos")
          .select("id, nome")
          .eq("ativo", true)
          .order("nome", { ascending: true });

        if (error) {
          console.error("Erro ao carregar cursos:", error);
        } else {
          setCursosOptions(data || []);
        }
      } catch (err) {
        console.error("Erro ao buscar cursos:", err);
      }
    };

    loadCursos();
  }, []);

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

      if (uploadError) {
        console.error('Erro ao fazer upload do banner:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('eventos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload do banner:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        toast.error(" Bucket 'eventos' não encontrado. Crie o bucket no Supabase Storage.");
      } else if (errorMessage.includes('permission') || errorMessage.includes('policy')) {
        toast.error(" Sem permissão para upload. Configure as políticas do bucket.");
      } else if (errorMessage.includes('size')) {
        toast.error(" Arquivo muito grande. Máximo: 5MB");
      } else {
        toast.error(` Erro ao fazer upload: ${errorMessage}`);
      }
      
      return null;
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleCriarEvento = async () => {
    // Validações
    if (titulo === "Nome do Evento" || !titulo.trim()) {
      toast.error("Por favor, defina um título para o evento");
      setEditandoTitulo(true);
      return;
    }

    if (!descricao.trim()) {
      toast.error("Por favor, adicione uma descrição");
      return;
    }

    if (!tipo) {
      toast.error("Por favor, selecione o tipo de evento");
      return;
    }

    if (!dateRange?.from || !dateRange?.to) {
      toast.error("Por favor, selecione o período do evento");
      return;
    }

    if (!local.trim() || !latitude || !longitude) {
      toast.error("Por favor, selecione o local do evento no mapa");
      return;
    }

    if (!capacidadeMaxima || capacidadeMaxima <= 0) {
      toast.error("Por favor, informe a capacidade máxima (maior que 0)");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        toast.error("Você precisa estar logado");
        navigate("/login");
        return;
      }

      // Busca ou cria usuário
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('nome_completo, perfil')
        .eq('email', session.user.email)
        .single();

      let nomeOrganizador = session.user.email;
      let isOrganizador = false;

      // Se usuário não existe, cria
      if (userError || !userData) {
        const { error: createUserError } = await supabase
          .from('usuarios')
          .insert({
            email: session.user.email,
            nome_completo: session.user.email,
            perfil: 'organizador'
          });

        if (createUserError) {
          console.error('Erro ao criar usuário:', createUserError);
        }
        isOrganizador = true; // Se acabou de criar, é organizador
      } else {
        nomeOrganizador = userData.nome_completo || session.user.email;
        isOrganizador = userData.perfil === 'organizador';
      }

      // Upload do banner se houver
      let bannerUrlFinal = null;
      if (bannerFile) {
        toast.info("Fazendo upload do banner...");
        bannerUrlFinal = await uploadBanner();
        if (!bannerUrlFinal) {
          toast.warning("Evento será criado sem banner");
        }
      }

      // Se for organizador, aprovar automaticamente
      const statusEvento = isOrganizador ? 'aprovado' : 'pendente';
      const aprovadorEmail = isOrganizador ? null : undefined;
      const dataAprovacao = isOrganizador ? new Date().toISOString() : undefined;

      // Validar data de encerramento das inscrições
      let dataEncerramentoValidada = dataEncerramentoInscricoes;
      if (dataEncerramentoInscricoes && dataEncerramentoInscricoes > dateRange.from) {
        dataEncerramentoValidada = dateRange.from;
      }

      // Criar evento
      const { data: evento, error } = await supabase
        .from('eventos')
        .insert({
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          tipo: tipo,
          data_inicio: dateRange.from.toISOString(),
          data_fim: dateRange.to.toISOString(),
          local: local.trim(),
          latitude: latitude,
          longitude: longitude,
          raio_validacao_metros: raioValidacaoMetros,
          campus: campus?.trim() || null,
          sala: sala?.trim() || null,
          capacidade_maxima: capacidadeMaxima,
          vagas_disponiveis: capacidadeMaxima,
          organizador_email: session.user.email,
          organizador_nome: nomeOrganizador,
          carga_horaria: cargaHoraria || null,
          valor: valor || 0,
          coordenador_id: coordenadorId || null,
          banner_url: bannerUrlFinal,
          categoria: categoria?.trim() || null,
          publico_alvo_perfil: publicoAlvoPerfil || 'aluno',
          data_encerramento_inscricoes: dataEncerramentoValidada ? dataEncerramentoValidada.toISOString() : null,
          nao_requer_validacao_localizacao: naoRequerValidacaoLocalizacao,
          gera_certificado: true,
          status: statusEvento,
          aprovador_email: aprovadorEmail,
          data_aprovacao: dataAprovacao
        })
        .select()
        .single();

      if (error) {
        console.error('Erro do Supabase ao criar evento:', error);
        throw new Error(error.message);
      }

      // Salvar palestrantes na tabela relacionada
      if (palestrantes.length > 0 && evento) {
        const palestrantesData = palestrantes.map((p, index) => ({
          evento_id: evento.id,
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
          toast.warning("Evento criado, mas houve erro ao salvar alguns palestrantes");
        }
      }

      // Salvar cursos selecionados
      if (cursosSelecionados.length > 0 && evento) {
        const cursosData = cursosSelecionados.map(cursoId => ({
          evento_id: evento.id,
          curso_id: cursoId
        }));

        const { error: cursosError } = await supabase
          .from('eventos_cursos')
          .insert(cursosData);

        if (cursosError) {
          console.error('Erro ao salvar cursos:', cursosError);
          toast.warning("Evento criado, mas houve erro ao salvar alguns cursos");
        }
      }

      toast.success("Evento criado com sucesso! Aguardando aprovação.");
      
      // Pequeno delay para mostrar a mensagem antes de redirecionar
      setTimeout(() => {
        navigate("/organizador/eventos");
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      if (errorMessage.includes('permission denied')) {
        toast.error(" Erro de permissão. Verifique as políticas de RLS no Supabase.");
      } else if (errorMessage.includes('relation "eventos" does not exist')) {
        toast.error(" Tabela 'eventos' não encontrada. Execute o script SQL do banco de dados.");
      } else {
        toast.error(` Erro ao criar evento: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = () => {
    navigate("/organizador/eventos");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-light text-foreground">Criar Evento</h1>

      <Card className="overflow-hidden bg-card border-border">
        {/* Banner */}
        <div 
          className="relative h-48 bg-muted flex flex-col items-center justify-center bg-cover bg-center gap-2"
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
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploadingBanner ? "Enviando..." : bannerUrl ? "Trocar Banner" : "Adicionar Banner"}
          </Button>
          
          {!bannerUrl && (
            <p className="text-xs text-muted-foreground bg-background/80 px-3 py-1 rounded-full backdrop-blur-sm">
              Opcional - Imagem até 5MB
            </p>
          )}
        </div>

        <div className="p-8 space-y-6">
          {/* Título */}
          <div className="flex items-center gap-3">
            {editandoTitulo ? (
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                onBlur={() => setEditandoTitulo(false)}
                onKeyPress={(e) => e.key === 'Enter' && setEditandoTitulo(false)}
                className="text-2xl font-normal"
                autoFocus
              />
            ) : (
              <>
                <h2 className="text-2xl font-normal">{titulo}</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setEditandoTitulo(true)}
                >
                  <Pen className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          {/* Tipo de Evento */}
          <div>
            <Label>Tipo de Evento</Label>
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

          {/* Descrição */}
          <div>
            <Label>Descrição do Evento</Label>
            <Textarea
              placeholder="Descreva o evento..."
              rows={4}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          {/* Período */}
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

          {/* Data de Encerramento de Inscrições */}
          <div>
            <Label>Inscrições encerram em:</Label>
            <DatePicker
              date={dataEncerramentoInscricoes}
              onDateChange={(date) => setDataEncerramentoInscricoes(date)}
              placeholder="Selecione a data de encerramento"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Após esta data, os alunos não poderão mais se inscrever no evento
            </p>
          </div>

          {/* Local com Mapa */}
          <div className="space-y-4">
            <div>
              <Label>Localização do Evento</Label>
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
            </div>

            {/* Local selecionado */}
            {local && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Endereço selecionado:</p>
                <p className="text-sm text-muted-foreground">{local}</p>
              </div>
            )}

            {/* Raio de Validação GPS */}
            <div>
              <Label>Raio de Validação GPS</Label>
              <div className="flex gap-3 items-start">
                <div className="flex-1">
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
                  {!naoRequerValidacaoLocalizacao ? (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      📍 Alunos devem estar a até <strong>{raioValidacaoMetros}m</strong> ({(raioValidacaoMetros / 1000).toFixed(raioValidacaoMetros >= 1000 ? 1 : 2)}km) do local para confirmar presença
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      📍 A validação de localização não será requisitada para este evento
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Campus e Sala */}
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
          </div>

          {/* Capacidade e Carga Horária */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Label>Carga Horária (horas)</Label>
              <Input
                type="number"
                placeholder="Ex: 40"
                value={cargaHoraria || ""}
                onChange={(e) => setCargaHoraria(Number(e.target.value))}
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

          {/* Categoria */}
          <div>
            <Label>Categoria (opcional)</Label>
            <Input
              placeholder="Ex: Tecnologia, Educação, Saúde"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            />
          </div>

          {/* Palestrantes */}
          <div>
            <Label>Palestrantes</Label>
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
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleAdicionarPalestrante();
                  }
                }}
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
            
            <div className="space-y-3">
              {palestrantes.map((p, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  {/* Avatar circular */}
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border-2 border-primary/20">
                    <span className="text-lg font-semibold text-primary">
                      {p.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  {/* Informações */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-medium text-sm">{p.nome}</p>
                    <p className="text-xs text-muted-foreground font-medium">{p.tema}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{p.descricao}</p>
                  </div>
                  
                  {/* Botão remover */}
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

          {/* Público Alvo */}
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

          {/* Cursos que podem participar */}
          <div>
            <Label>Cursos que podem participar (opcional)</Label>
            <div className="space-y-2">
              <Select 
                value="" 
                onValueChange={(value) => {
                  if (value && !cursosSelecionados.includes(value)) {
                    setCursosSelecionados([...cursosSelecionados, value]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um curso para adicionar" />
                </SelectTrigger>
                <SelectContent>
                  {cursosOptions
                    .filter(curso => !cursosSelecionados.includes(curso.id))
                    .map((curso) => (
                      <SelectItem key={curso.id} value={curso.id}>
                        {curso.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              
              {cursosSelecionados.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {cursosSelecionados.map((cursoId) => {
                    const curso = cursosOptions.find(c => c.id === cursoId);
                    return (
                      <Badge 
                        key={cursoId} 
                        variant="outline" 
                        className="gap-2 pr-1"
                      >
                        {curso?.nome}
                        <button
                          type="button"
                          onClick={() => setCursosSelecionados(cursosSelecionados.filter(id => id !== cursoId))}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Se nenhum curso for selecionado, o evento estará disponível para todos os cursos
            </p>
          </div>

          {/* Coordenador do Curso */}
          <div>
            <Label>Coordenador do Curso</Label>
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
            <p className="text-xs text-muted-foreground mt-1">
              O coordenador selecionado aparecerá na rúbrica do certificado
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleCancelar} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              variant="elegant" 
              onClick={handleCriarEvento}
              disabled={loading || uploadingBanner}
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Criando..." : "Criar Evento"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

