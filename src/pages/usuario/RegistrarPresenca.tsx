import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { QrCode, Key, MapPin, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { modal } from "@/contexts/ModalContext";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/lib/supabase";
import { obterLocalizacaoAtual, calcularDistanciaGPS } from "@/lib/gpsUtils";

interface EventoInfo {
  id: string;
  titulo: string;
  latitude: number | null;
  longitude: number | null;
  raio_validacao_metros: number | null;
  permite_presenca_remota: boolean;
  nao_requer_validacao_localizacao: boolean;
}

interface PalavraChaveInfo {
  data_evento: string;
  palavra_chave: string;
}

export default function RegistrarPresenca() {
  const [metodoEntrada, setMetodoEntrada] = useState<"qrcode" | "codigo">("qrcode");
  const [scanning, setScanning] = useState(false);
  const [codigoQRCode, setCodigoQRCode] = useState("");
  const [palavraChave, setPalavraChave] = useState("");
  const [eventoInfo, setEventoInfo] = useState<EventoInfo | null>(null);
  const [dataEvento, setDataEvento] = useState<string | null>(null);
  const [localizacao, setLocalizacao] = useState<{ lat: number; lng: number } | null>(null);
  const [capturandoLocalizacao, setCapturandoLocalizacao] = useState(false);
  const [validando, setValidando] = useState(false);
  
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (qrCodeRef.current) {
        try {
          const maybePromise = qrCodeRef.current.stop();
          if (maybePromise && typeof (maybePromise as { then?: unknown }).then === "function") {
            (maybePromise as Promise<void>)
              .then(() => qrCodeRef.current?.clear())
              .catch(() => {});
          } else {
            qrCodeRef.current.clear();
          }
        } catch (err) {
          console.error("Erro no cleanup do scanner:", err);
        }
      }
    };
  }, [scanning]);

  const buscarEventoPorCodigo = async (codigo: string) => {
    try {
      const { data, error } = await supabase
        .from("eventos")
        .select("id, titulo, latitude, longitude, raio_validacao_metros, permite_presenca_remota, nao_requer_validacao_localizacao")
        .eq("codigo_qrcode", codigo.toUpperCase())
        .single();

      if (error || !data) {
        modal.error("Evento não encontrado para este código");
        return null;
      }

      return {
        id: data.id,
        titulo: data.titulo,
        latitude: data.latitude,
        longitude: data.longitude,
        raio_validacao_metros: data.raio_validacao_metros,
          permite_presenca_remota: data.permite_presenca_remota || false,
          nao_requer_validacao_localizacao: data.nao_requer_validacao_localizacao || false,
      } as EventoInfo;
    } catch (error) {
      console.error("Erro ao buscar evento:", error);
      modal.error("Erro ao buscar evento");
      return null;
    }
  };

  const buscarDataPorPalavraChave = async (eventoId: string, palavra: string) => {
    try {
      const { data, error } = await supabase
        .from("evento_palavras_chave")
        .select("data_evento, palavra_chave")
        .eq("evento_id", eventoId)
        .eq("palavra_chave", palavra.toUpperCase())
        .single();

      if (error || !data) {
        modal.error("Palavra-chave inválida para este evento");
        return null;
      }

      return data.data_evento;
    } catch (error) {
      console.error("Erro ao buscar palavra-chave:", error);
      modal.error("Erro ao validar palavra-chave");
      return null;
    }
  };

  const handleCodigoQRCodeChange = async (codigo: string) => {
    setCodigoQRCode(codigo);
    if (codigo.length === 6) {
      const evento = await buscarEventoPorCodigo(codigo);
      if (evento) {
        setEventoInfo(evento);
      } else {
        setEventoInfo(null);
      }
    } else {
      setEventoInfo(null);
    }
  };

  const handlePalavraChaveChange = async (palavra: string) => {
    setPalavraChave(palavra);
    if (palavra && eventoInfo) {
      const data = await buscarDataPorPalavraChave(eventoInfo.id, palavra);
      if (data) {
        setDataEvento(data);
      } else {
        setDataEvento(null);
      }
    } else {
      setDataEvento(null);
    }
  };

  const startScanning = async () => {
    try {
      setScanning(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const html5QrCode = new Html5Qrcode("qr-reader");
      qrCodeRef.current = html5QrCode;

      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      const cameraConfig = { facingMode: "environment" };

      await html5QrCode.start(
        cameraConfig,
        config,
        async (decodedText) => {
          // Extrair código do QRCode (pode ser URL ou código direto)
          let codigo = decodedText;
          
          // Se for uma URL, tentar extrair o código
          if (decodedText.includes("/registrar-presenca/")) {
            const match = decodedText.match(/\/registrar-presenca\/([A-Z0-9]{6})/);
            if (match) {
              codigo = match[1];
            }
          }
          
          if (codigo.length === 6) {
            await handleCodigoQRCodeChange(codigo);
            stopScanning();
            modal.success("QR Code lido com sucesso!");
          } else {
            modal.error("Código QR inválido");
          }
        },
        () => {}
      ).catch(async (err) => {
        console.log("Tentando câmera frontal...");
        await html5QrCode.start(
          { facingMode: "user" },
          config,
          async (decodedText) => {
            let codigo = decodedText;
            if (decodedText.includes("/registrar-presenca/")) {
              const match = decodedText.match(/\/registrar-presenca\/([A-Z0-9]{6})/);
              if (match) {
                codigo = match[1];
              }
            }
            if (codigo.length === 6) {
              await handleCodigoQRCodeChange(codigo);
              stopScanning();
              modal.success("QR Code lido com sucesso!");
            } else {
              modal.error("Código QR inválido");
            }
          },
          () => {}
        );
      });
    } catch (error: any) {
      console.error("Erro ao iniciar câmera:", error);
      setScanning(false);
      const name = error?.name;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        modal.error("Permissão de câmera negada. Permita o acesso à câmera.");
      } else if (name === 'NotFoundError') {
        modal.error("Nenhuma câmera encontrada.");
      } else {
        modal.error("Erro ao acessar câmera. Use o código manualmente.");
      }
    }
  };

  const stopScanning = async () => {
    if (!qrCodeRef.current) {
      setScanning(false);
      return;
    }

    try {
      const maybePromise = qrCodeRef.current.stop();
      if (maybePromise && typeof (maybePromise as { then?: unknown }).then === "function") {
        await (maybePromise as Promise<void>);
      }
    } catch (err) {
      console.warn("Aviso ao parar scanner:", err);
    }

    try {
      qrCodeRef.current.clear();
    } catch (e) {
      // ignore
    }
    qrCodeRef.current = null;
    setScanning(false);
  };

  const capturarLocalizacao = async () => {
    try {
      setCapturandoLocalizacao(true);
      const { latitude, longitude } = await obterLocalizacaoAtual();
      setLocalizacao({ lat: latitude, lng: longitude });
      modal.success("Localização capturada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao capturar localização:", error);
      modal.error(error.message || "Erro ao capturar localização");
    } finally {
      setCapturandoLocalizacao(false);
    }
  };

  const validarDistancia = (): boolean => {
    if (!eventoInfo || !localizacao) return false;
    
    // Se não requer validação de localização ou permite presença remota, não valida distância
    if (eventoInfo.nao_requer_validacao_localizacao || eventoInfo.permite_presenca_remota) return true;
    
    if (!eventoInfo.latitude || !eventoInfo.longitude) {
      modal.error("Evento não possui localização definida");
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
      modal.error(`Você está muito longe do evento. Distância: ${distanciaKm.toFixed(2)}km (máximo: ${distanciaMaximaKm}km)`);
      return false;
    }

    return true;
  };

  const handleValidarPresenca = async () => {
    if (!eventoInfo) {
      modal.error("Selecione um evento primeiro");
      return;
    }

    if (!palavraChave) {
      modal.error("Digite a palavra-chave");
      return;
    }

    if (!dataEvento) {
      modal.error("Palavra-chave inválida");
      return;
    }

    if (!localizacao) {
      modal.error("Capture sua localização primeiro");
      return;
    }

    if (!validarDistancia()) {
      return;
    }

    try {
      setValidando(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        modal.error("Você precisa estar logado");
        return;
      }

      // Verificar se está inscrito
      const { data: inscricaoData, error: inscricaoError } = await supabase
        .from("inscricoes")
        .select("id")
        .eq("evento_id", eventoInfo.id)
        .eq("usuario_email", session.user.email)
        .eq("status", "confirmada")
        .single();

      if (inscricaoError || !inscricaoData) {
        modal.error("Você não está inscrito neste evento");
        return;
      }

      // Verificar se já registrou presença neste dia
      const dataPresenca = new Date(dataEvento);
      dataPresenca.setHours(0, 0, 0, 0);
      const dataFim = new Date(dataEvento);
      dataFim.setHours(23, 59, 59, 999);

      const { data: presencaExistente } = await supabase
        .from("presencas")
        .select("id")
        .eq("evento_id", eventoInfo.id)
        .eq("usuario_email", session.user.email)
        .gte("data_presenca", dataPresenca.toISOString())
        .lte("data_presenca", dataFim.toISOString())
        .single();

      if (presencaExistente) {
        modal.error("Você já registrou presença neste dia");
        return;
      }

      // Registrar presença
      const { error: presencaError } = await supabase
        .from("presencas")
        .insert({
          evento_id: eventoInfo.id,
          usuario_email: session.user.email,
          inscricao_id: inscricaoData.id,
          data_presenca: dataPresenca.toISOString(),
          latitude_capturada: localizacao.lat,
          longitude_capturada: localizacao.lng,
          distancia_validada: true,
          palavra_chave_usada: palavraChave.toUpperCase(),
          usuario_logado: true,
        });

      if (presencaError) {
        console.error("Erro ao registrar presença:", presencaError);
        modal.error("Erro ao registrar presença");
        return;
      }

      modal.success("Presença registrada com sucesso!");
      
      // Limpar formulário
      setCodigoQRCode("");
      setPalavraChave("");
      setEventoInfo(null);
      setDataEvento(null);
      setLocalizacao(null);
    } catch (error) {
      console.error("Erro ao validar presença:", error);
      modal.error("Erro ao registrar presença");
    } finally {
      setValidando(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-light">Registrar Presença</h1>

      <Card className="p-6 max-w-2xl">
        <Tabs value={metodoEntrada} onValueChange={(v) => setMetodoEntrada(v as "qrcode" | "codigo")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="qrcode">
              <QrCode className="w-4 h-4 mr-2" />
              Escanear QRCode
            </TabsTrigger>
            <TabsTrigger value="codigo">
              <Key className="w-4 h-4 mr-2" />
              Inserir Código do QRCode
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qrcode" className="space-y-4">
            {!scanning ? (
              <Button 
                variant="elegant" 
                onClick={startScanning} 
                className="w-full"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Iniciar Leitura do QRCode
              </Button>
            ) : (
              <>
                <div 
                  id="qr-reader" 
                  ref={scannerRef}
                  className="w-full border rounded-lg overflow-hidden"
                />
                <Button 
                  variant="outline" 
                  onClick={stopScanning} 
                  className="w-full"
                >
                  Cancelar Scan
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="codigo" className="space-y-4">
            <div>
              <Label>Código do QRCode (6 dígitos)</Label>
              <Input
                value={codigoQRCode}
                onChange={(e) => handleCodigoQRCodeChange(e.target.value.toUpperCase())}
                placeholder="Ex: Q6Y7IO"
                maxLength={6}
                className="font-mono text-lg tracking-wider"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Evento (ReadOnly) */}
        {eventoInfo && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <Label className="text-xs text-muted-foreground">Evento</Label>
            <p className="text-lg font-normal">{eventoInfo.titulo}</p>
          </div>
        )}

        {/* Palavra-chave */}
        {eventoInfo && (
          <div className="mt-4">
            <Label>Palavra-chave do Dia</Label>
            <Input
              type="text"
              value={palavraChave}
              onChange={(e) => handlePalavraChaveChange(e.target.value)}
              placeholder="Digite a palavra-chave"
              className="uppercase"
            />
          </div>
        )}

        {/* Data do Evento (ReadOnly) */}
        {dataEvento && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <Label className="text-xs text-muted-foreground">Data do Evento</Label>
            <p className="text-lg font-normal">
              {format(new Date(dataEvento), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        )}

        {/* Capturar Localização */}
        {eventoInfo && (
          <div className="mt-4 space-y-2">
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
        )}

        {/* Botão Validar */}
        {eventoInfo && palavraChave && dataEvento && localizacao && (
          <div className="mt-6">
            <Button
              variant="elegant"
              onClick={handleValidarPresenca}
              disabled={validando}
              className="w-full"
            >
              {validando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Validar Presença
                </>
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
