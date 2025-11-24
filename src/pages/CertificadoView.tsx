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
import { getRouteUrl } from "@/lib/config";

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
  hash_sha256: string | null;
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
    if (certificado) {
      gerarQRCode();
    }
  }, [certificado, sha256]);

  const carregarCertificado = async () => {
    try {
      setLoading(true);

      // Buscar certificado pelo hash SHA256 ou código de validação
      let certData = null;
      let certError = null;

      // Primeiro tenta buscar por hash SHA256
      const { data: certByHash, error: hashError } = await supabase
        .from("certificados")
        .select(`
          id,
          usuario_nome,
          data_emissao,
          hash_sha256,
          codigo_validacao,
          evento_id
        `)
        .eq("hash_sha256", sha256)
        .maybeSingle();

      if (certByHash && !hashError) {
        certData = certByHash;
      } else {
        // Se não encontrou por hash, tenta buscar por código de validação
        const { data: certByCode, error: codeError } = await supabase
          .from("certificados")
          .select(`
            id,
            usuario_nome,
            data_emissao,
            hash_sha256,
            codigo_validacao,
            evento_id
          `)
          .eq("codigo_validacao", sha256)
          .maybeSingle();

        if (certByCode && !codeError) {
          certData = certByCode;
        } else {
          certError = codeError || hashError;
        }
      }

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
        hash_sha256: certData.hash_sha256 || certData.codigo_validacao || null,
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
    if (!certificado) return;

    try {
      // Usar hash SHA256 se disponível, senão usar código de validação
      const codigoValidacao = certificado.hash_sha256 || sha256 || "";
      if (!codigoValidacao) return;

      const url = getRouteUrl(`/certificados/${codigoValidacao}`);
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 200,
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
    <div className="min-h-screen bg-white print:bg-white" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      {/* Botões de ação - ocultos na impressão */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm shadow-sm p-4 print:hidden">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-black hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={handlePrint} variant="default" className="bg-black hover:bg-gray-900 text-white">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Certificado */}
      <div className="max-w-4xl mx-auto p-6 print:p-0">
        <div className="bg-white print:bg-white p-10 print:p-6">
          <div className="space-y-8 print:space-y-4">
            {/* Cabeçalho com Logo */}
            <div className="flex items-center justify-center gap-8 print:gap-6 pb-6 print:pb-3">
              <img
                src="/logoiffar.png"
                alt="Logo IFFAR"
                className="h-16 print:h-12 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="text-center">
                <h2 className="text-lg print:text-sm font-light text-black tracking-wider uppercase">Instituto Federal</h2>
                <h2 className="text-lg print:text-sm font-light text-black tracking-wider uppercase">Farroupilha</h2>
              </div>
            </div>

            {/* Título Principal */}
            <div className="text-center py-2 print:py-1">
              <h1 className="text-5xl print:text-4xl font-light text-black tracking-widest mb-1 print:mb-0">
                CERTIFICADO
              </h1>
              <p className="text-lg print:text-base text-black font-light tracking-wide uppercase mt-2 print:mt-1">
                de Participação
              </p>
            </div>

            {/* Texto do Certificado */}
            <div className="text-center space-y-4 print:space-y-2 px-6 print:px-4 max-w-3xl mx-auto">
              <p className="text-base print:text-sm text-black leading-relaxed font-light">
                Certificamos que
              </p>
              <p className="text-3xl print:text-2xl font-light text-black py-3 print:py-1 my-3 print:my-1 tracking-wide">
                {certificado.usuario_nome}
              </p>
              <p className="text-base print:text-sm text-black leading-relaxed font-light">
                participou do evento
              </p>
              <p className="text-xl print:text-lg font-light text-black my-3 print:my-1 tracking-wide">
                {certificado.evento.titulo}
              </p>
              {certificado.evento.campus && (
                <p className="text-base print:text-sm text-black font-light">
                  realizado no campus {certificado.evento.campus}
                </p>
              )}
              <p className="text-base print:text-sm text-black leading-relaxed font-light">
                nos dias {dataInicio} até {dataFim}
              </p>
              {certificado.evento.carga_horaria && (
                <p className="text-base print:text-sm text-black font-light">
                  com carga horária de {certificado.evento.carga_horaria} horas
                </p>
              )}
            </div>

            {/* Rúbrica do Coordenador */}
            {certificado.evento.coordenador && (
              <div className="mt-10 print:mt-4 pt-6 print:pt-2">
                <div className="flex flex-col items-center space-y-2 print:space-y-1">
                  <div className="h-20 w-64 print:h-16 print:w-56 border-b border-black mb-3 print:mb-1"></div>
                  <p className="text-sm print:text-xs font-light text-black tracking-wide">
                    {certificado.evento.coordenador.nome}
                  </p>
                  <p className="text-xs print:text-[10px] text-black font-light">
                    {certificado.evento.coordenador.descricao}
                  </p>
                </div>
              </div>
            )}

            {/* Rodapé com Hash e QR Code */}
            <div className="mt-10 print:mt-4 pt-6 print:pt-2">
              <div className="flex justify-between items-end gap-6 print:gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs print:text-[10px] text-black mb-1 print:mb-0 font-light uppercase tracking-wide">Código de Validação</p>
                  <code className="text-xs print:text-[10px] font-mono text-black break-all block">
                    {certificado.hash_sha256 || "N/A"}
                  </code>
                </div>
                {qrCodeUrl && (
                  <div className="flex-shrink-0 text-center">
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code" 
                      className="w-24 h-24 print:w-20 print:h-20 mx-auto"
                    />
                    <p className="text-xs print:text-[10px] text-black mt-1 print:mt-0 font-light">
                      Validar certificado
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Data de Emissão */}
            <div className="text-center mt-8 print:mt-2 pt-4 print:pt-1">
              <p className="text-xs print:text-[10px] text-black font-light">
                Emitido em {dataEmissao}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos para impressão e fonte */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        
        @media print {
          @page {
            size: A4 landscape;
            margin: 1.2cm 1.5cm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: 'Inter', 'Segoe UI', system-ui, sans-serif !important;
          }
          .print\\:bg-white {
            background: white !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:p-6 {
            padding: 1.5rem !important;
          }
          .print\\:text-\\[10px\\] {
            font-size: 10px !important;
          }
          .print\\:text-xs {
            font-size: 0.75rem !important;
          }
          .print\\:text-sm {
            font-size: 0.875rem !important;
          }
          .print\\:text-base {
            font-size: 1rem !important;
          }
          .print\\:text-lg {
            font-size: 1.125rem !important;
          }
          .print\\:text-2xl {
            font-size: 1.5rem !important;
          }
          .print\\:text-4xl {
            font-size: 2.25rem !important;
          }
          .print\\:h-12 {
            height: 3rem !important;
          }
          .print\\:h-16 {
            height: 4rem !important;
          }
          .print\\:h-20 {
            height: 5rem !important;
          }
          .print\\:w-20 {
            width: 5rem !important;
          }
          .print\\:w-56 {
            width: 14rem !important;
          }
          .print\\:gap-4 {
            gap: 1rem !important;
          }
          .print\\:gap-6 {
            gap: 1.5rem !important;
          }
          .print\\:space-y-1 {
            gap: 0.25rem !important;
          }
          .print\\:space-y-2 {
            gap: 0.5rem !important;
          }
          .print\\:space-y-4 {
            gap: 1rem !important;
          }
          .print\\:py-1 {
            padding-top: 0.25rem !important;
            padding-bottom: 0.25rem !important;
          }
          .print\\:pt-1 {
            padding-top: 0.25rem !important;
          }
          .print\\:pt-2 {
            padding-top: 0.5rem !important;
          }
          .print\\:pb-3 {
            padding-bottom: 0.75rem !important;
          }
          .print\\:px-4 {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
          .print\\:my-1 {
            margin-top: 0.25rem !important;
            margin-bottom: 0.25rem !important;
          }
          .print\\:mb-0 {
            margin-bottom: 0 !important;
          }
          .print\\:mb-1 {
            margin-bottom: 0.25rem !important;
          }
          .print\\:mt-0 {
            margin-top: 0 !important;
          }
          .print\\:mt-1 {
            margin-top: 0.25rem !important;
          }
          .print\\:mt-2 {
            margin-top: 0.5rem !important;
          }
          .print\\:mt-4 {
            margin-top: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}

