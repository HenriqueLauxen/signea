import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { modal } from "@/contexts/ModalContext";
import { supabase } from "@/lib/supabase";

interface CertificadoValidacao {
  usuario_nome: string;
  usuario_email: string;
  usuario_matricula: string;
  usuario_campus: string;
  data_emissao: string;
  evento: {
    titulo: string;
    carga_horaria: number;
    data_inicio: string;
    data_fim: string;
    campus: string;
  };
}

const ValidateCertificate = () => {
  const navigate = useNavigate();
  const [hash, setHash] = useState("");
  const [validationResult, setValidationResult] = useState<"valid" | "invalid" | null>(null);
  const [certificado, setCertificado] = useState<CertificadoValidacao | null>(null);
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    if (!hash) {
      modal.error("Insira o código hash do certificado");
      return;
    }

    await validateWithHash(hash);
  };


  const validateWithHash = async (hashCode: string) => {
    setLoading(true);
    try {
      // Buscar certificado pelo hash SHA256 ou código de validação
      // Primeiro tenta pelo hash SHA256
      let certData = null;
      let error = null;

      const { data: certByHash, error: hashError } = await supabase
        .from("certificados")
        .select(`
          usuario_nome,
          usuario_email,
          data_emissao,
          evento_id
        `)
        .eq("hash_sha256", hashCode.trim())
        .maybeSingle();

      if (certByHash && !hashError) {
        certData = certByHash;
      } else {
        // Se não encontrou por hash, tenta pelo código de validação
        const { data: certByCode, error: codeError } = await supabase
          .from("certificados")
          .select(`
            usuario_nome,
            usuario_email,
            data_emissao,
            evento_id
          `)
          .eq("codigo_validacao", hashCode.trim())
          .maybeSingle();

        if (certByCode && !codeError) {
          certData = certByCode;
        } else {
          error = codeError || hashError;
        }
      }

      if (error || !certData) {
        console.error("Certificado não encontrado:", error);
        setValidationResult("invalid");
        setCertificado(null);
        return;
      }

      // Buscar dados do evento
      const { data: eventoData } = await supabase
        .from("eventos")
        .select("titulo, carga_horaria, data_inicio, data_fim, campus")
        .eq("id", certData.evento_id)
        .single();

      // Buscar dados do usuário (matrícula e campus)
      const { data: userData } = await supabase
        .from("usuarios")
        .select("matricula, campus")
        .eq("email", certData.usuario_email)
        .single();
      
      setCertificado({
        usuario_nome: certData.usuario_nome,
        usuario_email: certData.usuario_email,
        usuario_matricula: userData?.matricula || "Não informada",
        usuario_campus: userData?.campus || "Não informado",
        data_emissao: certData.data_emissao,
        evento: {
          titulo: eventoData?.titulo || "Evento não especificado",
          carga_horaria: eventoData?.carga_horaria || 0,
          data_inicio: eventoData?.data_inicio || "",
          data_fim: eventoData?.data_fim || "",
          campus: eventoData?.campus || "Não especificado"
        }
      });
      setValidationResult("valid");
    } catch (error) {
      console.error("Erro ao validar certificado:", error);
      setValidationResult("invalid");
      setCertificado(null);
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const formatDateRange = (inicio: string, fim: string) => {
    const dataInicio = new Date(inicio);
    const dataFim = new Date(fim);
    
    // Se for o mesmo dia
    if (dataInicio.toDateString() === dataFim.toDateString()) {
      return formatDate(inicio);
    }
    
    return `${formatDate(inicio)} a ${formatDate(fim)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <div className="w-full max-w-md mx-4">
        <div className="bg-card border border-border rounded-xl p-8 backdrop-blur-sm glow-border">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-light tracking-wider text-foreground mb-2">
              Validar Certificado
            </h1>
            <p className="text-sm text-muted-foreground">
              Verifique a autenticidade de um certificado
            </p>
          </div>

          {!validationResult ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <Input
                  placeholder="Hash SHA256 ou Código de Validação"
                  value={hash}
                  onChange={(e) => setHash(e.target.value)}
                  className="h-12 bg-transparent border-border focus:glow-border-hover font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Digite o hash SHA256 ou o código de validação do certificado
                </p>

                <Button
                  variant="elegant"
                  size="lg"
                  onClick={handleValidate}
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    "Validar Certificado"
                  )}
                </Button>
              </div>

              <button
                onClick={() => navigate("/usuario")}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Voltar ao Menu
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {validationResult === "valid" ? (
                <>
                  <div className="text-center">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h2 className="text-xl font-semibold mb-2 text-green-500">
                      ✓ Certificado Válido
                    </h2>
                  </div>
                  
                  {certificado && (
                    <div className="bg-accent/30 border border-border rounded-lg p-6 text-left space-y-3">
                      <p className="text-sm text-foreground leading-relaxed">
                        O certificado inserido é <span className="font-semibold text-green-500">válido</span> para o evento{" "}
                        <span className="font-semibold">{certificado.evento.titulo}</span> ocorrido{" "}
                        {certificado.evento.data_inicio && certificado.evento.data_fim ? (
                          <>entre os dias <span className="font-semibold">{formatDateRange(certificado.evento.data_inicio, certificado.evento.data_fim)}</span></>
                        ) : (
                          <>em <span className="font-semibold">{formatDate(certificado.data_emissao)}</span></>
                        )}{" "}
                        para o usuário{" "}
                        <span className="font-semibold">{certificado.usuario_nome}</span>, Matrícula{" "}
                        <span className="font-semibold">{certificado.usuario_matricula}</span>, vinculado ao Campus{" "}
                        <span className="font-semibold">{certificado.usuario_campus}</span>.
                      </p>
                      
                      <div className="border-t border-border pt-3 mt-3 space-y-1">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Local do evento:</span> {certificado.evento.campus}
                        </p>
                        {certificado.evento.carga_horaria > 0 && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Carga horária:</span> {certificado.evento.carga_horaria}h
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Data de emissão:</span> {formatDate(certificado.data_emissao)}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-center">
                    <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
                    <h2 className="text-xl font-normal mb-2 text-red-500">
                      Certificado Inválido
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Certificado não encontrado ou código inválido.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Verifique se o código foi digitado corretamente.
                    </p>
                  </div>
                </>
              )}

              <Button
                onClick={() => {
                  setValidationResult(null);
                  setHash("");
                  setCertificado(null);
                }}
                className="w-full bg-transparent border border-border hover:glow-border-hover text-foreground"
              >
                Validar outro certificado
              </Button>

              <button
                onClick={() => navigate("/usuario")}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Voltar ao Menu
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidateCertificate;
