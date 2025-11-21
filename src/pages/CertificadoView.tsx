import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { modal } from "@/contexts/ModalContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import QRCode from "qrcode";

interface CertificadoData {
  id: string;
  usuario_nome: string;
  evento: {
    titulo: string;
    campus: string | null;
    data_inicio: string;
    data_fim: string;
    carga_horaria: number | null;
    coordenador: {
      nome: string;
      descricao: string;
    } | null;
  };
  data_emissao: string;
  hash_sha256: string;
}

export default function CertificadoView() {
  const { sha256 } = useParams<{ sha256: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [certificado, setCertificado] = useState<CertificadoData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    if (!sha256) {
      modal.error("Hash do certificado não fornecido");
      navigate("/");
      return;
    }

    carregarCertificado();
  }, [sha256]);

  useEffect(() => {
    if (certificado?.hash_sha256) {
      gerarQRCode();
    }
  }, [certificado]);

  const carregarCertificado = async () => {
    try {
      setLoading(true);

      // Buscar certificado pelo hash
      const { data: certData, error: certError } = await supabase
        .from("certificados")
        .select(`
          id,
          usuario_nome,
          data_emissao,
          hash_sha256,
          evento_id
        `)
        .eq("hash_sha256", sha256)
        .single();

      if (certError || !certData) {
        console.error("Erro ao buscar certificado:", certError);
        modal.error("Certificado não encontrado");
        navigate("/");
        return;
      }

      // Buscar dados do evento com coordenador
      const { data: eventoData, error: eventoError } = await supabase
        .from("eventos")
        .select(`
          titulo,
          campus,
          data_inicio,
          data_fim,
          carga_horaria,
          coordenador_id,
          coordenadores:coordenador_id (
            nome,
            descricao
          )
        `)
        .eq("id", certData.evento_id)
        .single();

      if (eventoError || !eventoData) {
        console.error("Erro ao buscar evento:", eventoError);
        modal.error("Dados do evento não encontrados");
        navigate("/");
        return;
      }

      const coordenador = eventoData.coordenadores
        ? (Array.isArray(eventoData.coordenadores)
            ? eventoData.coordenadores[0]
            : eventoData.coordenadores)
        : null;

      setCertificado({
        id: certData.id,
        usuario_nome: certData.usuario_nome,
        evento: {
          titulo: eventoData.titulo,
          campus: eventoData.campus,
          data_inicio: eventoData.data_inicio,
          data_fim: eventoData.data_fim,
          carga_horaria: eventoData.carga_horaria,
          coordenador: coordenador
            ? {
                nome: coordenador.nome,
                descricao: coordenador.descricao,
              }
            : null,
        },
        data_emissao: certData.data_emissao,
        hash_sha256: certData.hash_sha256,
      });
    } catch (error) {
      console.error("Erro ao carregar certificado:", error);
      modal.error("Erro ao carregar certificado");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const gerarQRCode = async () => {
    if (!certificado?.hash_sha256) return;

    try {
      const url = `${window.location.origin}/certificados/${certificado.hash_sha256}`;
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 150,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
      setQrCodeUrl(qrCodeDataUrl);
    } catch (error) {
      console.error("Erro ao gerar QR Code:", error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Carregando certificado...</p>
        </div>
      </div>
    );
  }

  if (!certificado) {
    return null;
  }

  const dataInicio = format(new Date(certificado.evento.data_inicio), "dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });
  const dataFim = format(new Date(certificado.evento.data_fim), "dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });
  const dataEmissao = format(new Date(certificado.data_emissao), "dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Botões de ação - ocultos na impressão */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border p-4 print:hidden">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={handlePrint} variant="elegant">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Certificado */}
      <div className="max-w-4xl mx-auto p-8 print:p-12">
        <Card className="p-12 print:p-16 bg-white print:shadow-none border-2 print:border-0">
          <div className="space-y-8">
            {/* Título */}
            <div className="text-center">
              <h1 className="text-4xl font-light tracking-wide mb-4 print:text-5xl">
                Certificado de Participação
              </h1>
            </div>

            {/* Texto do certificado */}
            <div className="text-center space-y-4 text-lg print:text-xl leading-relaxed">
              <p className="text-foreground">
                Certificamos que <strong>{certificado.usuario_nome}</strong>
              </p>
              <p className="text-foreground">
                participou do evento <strong>{certificado.evento.titulo}</strong>
                {certificado.evento.campus && (
                  <span>, realizado no campus <strong>{certificado.evento.campus}</strong></span>
                )}
                , nos dias <strong>{dataInicio}</strong> até <strong>{dataFim}</strong>
                {certificado.evento.carga_horaria && (
                  <span>, com carga horária de <strong>{certificado.evento.carga_horaria} horas</strong></span>
                )}.
              </p>
            </div>

            {/* Rúbrica do Coordenador */}
            {certificado.evento.coordenador && (
              <div className="mt-12 pt-8 border-t border-border">
                <div className="flex flex-col items-center space-y-2">
                  <div className="h-24 w-64 border-b-2 border-foreground mb-2"></div>
                  <p className="text-sm font-normal text-foreground">
                    {certificado.evento.coordenador.nome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {certificado.evento.coordenador.descricao}
                  </p>
                </div>
              </div>
            )}

            {/* Hash e QR Code */}
            <div className="mt-12 pt-8 border-t border-border flex justify-between items-end">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Hash de Validação:</p>
                <code className="text-xs font-mono text-foreground break-all">
                  {certificado.hash_sha256}
                </code>
              </div>
              {qrCodeUrl && (
                <div className="ml-8 flex-shrink-0">
                  <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24" />
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Validar certificado
                  </p>
                </div>
              )}
            </div>

            {/* Logo IFFAR */}
            <div className="mt-8 pt-8 border-t border-border">
              <div className="flex items-center">
                <img
                  src="/logoiffar.png"
                  alt="Logo IFFAR"
                  className="h-16 print:h-20 object-contain"
                  onError={(e) => {
                    // Se a imagem não carregar, ocultar
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            </div>

            {/* Data de emissão */}
            <div className="text-center mt-8">
              <p className="text-sm text-muted-foreground">
                Emitido em {dataEmissao}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Estilos para impressão */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            background: white;
          }
          .print\\:bg-white {
            background: white !important;
          }
          .print\\:p-16 {
            padding: 4rem !important;
          }
          .print\\:text-5xl {
            font-size: 3rem !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-0 {
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}

