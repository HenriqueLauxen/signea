import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle, MapPin, Key, User, Mail } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { obterLocalizacaoAtual, calcularDistanciaGPS } from "@/lib/gpsUtils";

interface EventoInfo {
  id: string;
  titulo: string;
  data_inicio: string;
  data_fim: string;
  latitude: number | null;
  longitude: number | null;
  raio_validacao_metros: number | null;
  permite_presenca_remota: boolean;
  nao_requer_validacao_localizacao: boolean;
}

export default function RegistrarPresencaPublica() {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [eventoInfo, setEventoInfo] = useState<EventoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [palavraChave, setPalavraChave] = useState("");
  const [matricula, setMatricula] = useState("");
  const [email, setEmail] = useState("");
  const [dataEvento, setDataEvento] = useState<string | null>(null);
  const [validando, setValidando] = useState(false);
  const [usuarioEncontrado, setUsuarioEncontrado] = useState<any>(null);
  const [localizacao, setLocalizacao] = useState<{ lat: number; lng: number } | null>(null);
  const [capturandoLocalizacao, setCapturandoLocalizacao] = useState(false);

  useEffect(() => {
    if (codigo && codigo.length === 6) {
      buscarEventoPorCodigo(codigo);
    } else {
      setLoading(false);
      toast.error("Código QR inválido. O código deve ter 6 dígitos.");
    }
  }, [codigo]);

  const buscarEventoPorCodigo = async (codigoQR: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("eventos")
        .select("id, titulo, data_inicio, data_fim, latitude, longitude, raio_validacao_metros, permite_presenca_remota, nao_requer_validacao_localizacao")
        .eq("codigo_qrcode", codigoQR.toUpperCase())
        .single();

      if (error || !data) {
        toast.error("Evento não encontrado para este código QR");
        setLoading(false);
        return;
      }

      setEventoInfo({
        id: data.id,
        titulo: data.titulo,
        data_inicio: data.data_inicio,
        data_fim: data.data_fim,
        latitude: data.latitude,
        longitude: data.longitude,
        raio_validacao_metros: data.raio_validacao_metros,
        permite_presenca_remota: data.permite_presenca_remota || false,
        nao_requer_validacao_localizacao: data.nao_requer_validacao_localizacao || false,
      });
    } catch (error) {
      console.error("Erro ao buscar evento:", error);
      toast.error("Erro ao buscar evento");
    } finally {
      setLoading(false);
    }
  };

  const buscarUsuario = async () => {
    if (!matricula && !email) {
      toast.error("Informe a matrícula ou o e-mail");
      return;
    }

    try {
      let query = supabase.from("usuarios").select("email, nome_completo, matricula");

      if (matricula) {
        query = query.eq("matricula", matricula);
      } else if (email) {
        query = query.eq("email", email);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        toast.error("Usuário não encontrado. Verifique a matrícula ou e-mail informado.");
        setUsuarioEncontrado(null);
        return;
      }

      setUsuarioEncontrado(data);
      toast.success("Usuário encontrado!");
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      toast.error("Erro ao buscar usuário");
    }
  };

  const validarPalavraChave = async () => {
    if (!palavraChave || !eventoInfo) {
      toast.error("Digite a palavra-chave");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("evento_palavras_chave")
        .select("data_evento, palavra_chave")
        .eq("evento_id", eventoInfo.id)
        .eq("palavra_chave", palavraChave.toUpperCase())
        .single();

      if (error || !data) {
        toast.error("Palavra-chave inválida para este evento");
        setDataEvento(null);
        return;
      }

      setDataEvento(data.data_evento);
      toast.success("Palavra-chave válida!");
    } catch (error) {
      console.error("Erro ao validar palavra-chave:", error);
      toast.error("Erro ao validar palavra-chave");
    }
  };

  const capturarLocalizacao = async () => {
    try {
      setCapturandoLocalizacao(true);
      const { latitude, longitude } = await obterLocalizacaoAtual();
      setLocalizacao({ lat: latitude, lng: longitude });
      toast.success("Localização capturada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao capturar localização:", error);
      toast.error(error.message || "Erro ao capturar localização");
    } finally {
      setCapturandoLocalizacao(false);
    }
  };

  const validarDistancia = (): boolean => {
    if (!eventoInfo || !localizacao) return false;
    
    // Se não requer validação de localização ou permite presença remota, não valida distância
    if (eventoInfo.nao_requer_validacao_localizacao || eventoInfo.permite_presenca_remota) return true;
    
    if (!eventoInfo.latitude || !eventoInfo.longitude) {
      toast.error("Evento não possui localização definida");
      return false;
    }

    const distanciaMetros = calcularDistanciaGPS(
      localizacao.lat,
      localizacao.lng,
      eventoInfo.latitude,
      eventoInfo.longitude
    );

    const distanciaKm = distanciaMetros / 1000;
    const distanciaMaximaKm = 2.5;
    
    if (distanciaKm > distanciaMaximaKm) {
      toast.error(`Você está muito longe do evento. Distância: ${distanciaKm.toFixed(2)}km (máximo: ${distanciaMaximaKm}km)`);
      return false;
    }

    return true;
  };

  const handleRegistrarPresenca = async () => {
    if (!eventoInfo) {
      toast.error("Evento não encontrado");
      return;
    }

    if (!usuarioEncontrado) {
      toast.error("Busque o usuário primeiro");
      return;
    }

    if (!dataEvento) {
      toast.error("Valide a palavra-chave primeiro");
      return;
    }

    if (!localizacao) {
      toast.error("Capture sua localização primeiro");
      return;
    }

    if (!validarDistancia()) {
      return;
    }

    try {
      setValidando(true);

      // Verificar se está inscrito
      const { data: inscricaoData, error: inscricaoError } = await supabase
        .from("inscricoes")
        .select("id")
        .eq("evento_id", eventoInfo.id)
        .eq("usuario_email", usuarioEncontrado.email)
        .eq("status", "confirmada")
        .maybeSingle();

      if (inscricaoError || !inscricaoData) {
        toast.error("Usuário não está inscrito neste evento");
        return;
      }

      // Calcular dia do evento
      const dataInicio = new Date(eventoInfo.data_inicio);
      dataInicio.setHours(0, 0, 0, 0);
      const dataPalavraChave = new Date(dataEvento);
      dataPalavraChave.setHours(0, 0, 0, 0);
      
      const diffTime = dataPalavraChave.getTime() - dataInicio.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diaEvento = diffDays + 1;

      // Verificar se já registrou presença neste dia
      const { data: presencaExistente } = await supabase
        .from("presencas")
        .select("id")
        .eq("evento_id", eventoInfo.id)
        .eq("usuario_email", usuarioEncontrado.email)
        .eq("dia_evento", diaEvento)
        .maybeSingle();

      if (presencaExistente) {
        toast.error("Presença já registrada para este dia");
        return;
      }

      // Registrar presença
      const { error: presencaError } = await supabase
        .from("presencas")
        .insert({
          evento_id: eventoInfo.id,
          usuario_email: usuarioEncontrado.email,
          usuario_nome: usuarioEncontrado.nome_completo,
          inscricao_id: inscricaoData.id,
          data_presenca: new Date().toISOString(),
          dia_evento: diaEvento,
          palavra_chave_usada: palavraChave.toUpperCase(),
          latitude_capturada: localizacao.lat,
          longitude_capturada: localizacao.lng,
          distancia_validada: true,
          usuario_logado: false, // Registro público, não logado
        });

      if (presencaError) {
        console.error("Erro ao registrar presença:", presencaError);
        toast.error("Erro ao registrar presença");
        return;
      }

      toast.success("Presença registrada com sucesso!");
      
      // Limpar formulário
      setPalavraChave("");
      setMatricula("");
      setEmail("");
      setDataEvento(null);
      setUsuarioEncontrado(null);
      setLocalizacao(null);
    } catch (error) {
      console.error("Erro ao registrar presença:", error);
      toast.error("Erro ao registrar presença");
    } finally {
      setValidando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Carregando evento...</p>
        </div>
      </div>
    );
  }

  if (!eventoInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-normal mb-2">Evento não encontrado</h2>
          <p className="text-muted-foreground mb-4">
            O código QR informado não corresponde a nenhum evento.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            Voltar ao início
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="p-8 max-w-2xl w-full">
        <div className="space-y-6">
          {/* Informações do Evento */}
          <div className="text-center space-y-2 pb-4 border-b">
            <h1 className="text-2xl font-light">{eventoInfo.titulo}</h1>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span>
                {format(new Date(eventoInfo.data_inicio), "dd/MM/yyyy", { locale: ptBR })} -{" "}
                {format(new Date(eventoInfo.data_fim), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>

          {/* Buscar Usuário */}
          <div className="space-y-4">
            <h2 className="text-lg font-normal">1. Identificar Usuário</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="matricula">Matrícula</Label>
                <Input
                  id="matricula"
                  placeholder="Digite a matrícula"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") buscarUsuario();
                  }}
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Digite o e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") buscarUsuario();
                  }}
                />
              </div>
            </div>
            <Button onClick={buscarUsuario} variant="outline" className="w-full">
              <User className="w-4 h-4 mr-2" />
              Buscar Usuário
            </Button>

            {usuarioEncontrado && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Usuário encontrado:</span>
                </div>
                <p className="mt-1">{usuarioEncontrado.nome_completo}</p>
                <p className="text-sm text-muted-foreground">{usuarioEncontrado.email}</p>
              </div>
            )}
          </div>

          {/* Validar Palavra Chave */}
          <div className="space-y-4">
            <h2 className="text-lg font-normal">2. Validar Palavra-Chave do Dia</h2>
            <div>
              <Label htmlFor="palavraChave">Palavra-Chave</Label>
              <div className="flex gap-2">
                <Input
                  id="palavraChave"
                  placeholder="Digite a palavra-chave do dia"
                  value={palavraChave}
                  onChange={(e) => setPalavraChave(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") validarPalavraChave();
                  }}
                  className="flex-1"
                />
                <Button onClick={validarPalavraChave} variant="outline">
                  <Key className="w-4 h-4 mr-2" />
                  Validar
                </Button>
              </div>
            </div>

            {dataEvento && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Palavra-chave válida!</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Dia: {format(new Date(dataEvento), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            )}
          </div>

          {/* Capturar Localização */}
          {eventoInfo && (
            <div className="space-y-4">
              <h2 className="text-lg font-normal">3. Capturar Localização</h2>
              <div className="space-y-2">
                <Label>Localização *</Label>
                {!localizacao ? (
                  <Button
                    variant="outline"
                    onClick={capturarLocalizacao}
                    disabled={capturandoLocalizacao}
                    className="w-full"
                  >
                    {capturandoLocalizacao ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Capturando...
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4 mr-2" />
                        Capturar Localização
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Localização capturada</p>
                        <p className="text-xs text-muted-foreground">
                          Lat: {localizacao.lat.toFixed(6)}, Lng: {localizacao.lng.toFixed(6)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={capturarLocalizacao}
                        disabled={capturandoLocalizacao}
                      >
                        Recapturar
                      </Button>
                    </div>
                  </div>
                )}
                {(eventoInfo.nao_requer_validacao_localizacao || eventoInfo.permite_presenca_remota) && (
                  <p className="text-xs text-muted-foreground">
                    Este evento permite presença remota
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Registrar Presença */}
          <div className="pt-4 border-t">
            <Button
              onClick={handleRegistrarPresenca}
              disabled={!usuarioEncontrado || !dataEvento || !localizacao || validando}
              className="w-full"
              size="lg"
            >
              {validando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Registrar Presença
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

