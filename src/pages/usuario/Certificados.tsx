import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Award, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { modal } from "@/contexts/ModalContext";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface Certificado {
  id: string;
  evento_id: string;
  usuario_email: string;
  usuario_nome: string;
  codigo_validacao: string;
  hash_sha256: string | null;
  url_pdf: string | null;
  data_emissao: string;
  evento: {
    id: string;
    titulo: string;
    carga_horaria: number;
    data_inicio: string;
    data_fim: string;
  };
  presenca_percentual?: number;
}

export default function Certificados() {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const fetchCertificados = useCallback(async () => {
    if (!userEmail) {
      console.log('⚠️ Email não disponível');
      return;
    }
    
    console.log('🔄 Buscando certificados para:', userEmail);
    
    try {
      setLoading(true);
      
      // Buscar certificados do usuário
      const { data: certData, error: certError } = await supabase
        .from("certificados")
        .select(`
          id,
          evento_id,
          usuario_email,
          usuario_nome,
          codigo_validacao,
          hash_sha256,
          url_pdf,
          data_emissao,
          eventos:evento_id (
            id,
            titulo,
            carga_horaria,
            data_inicio,
            data_fim
          )
        `)
        .eq("usuario_email", userEmail)
        .order("data_emissao", { ascending: false });

      if (certError) {
        console.error('❌ Erro ao buscar certificados:', certError);
        throw certError;
      }

      console.log('✅ Certificados encontrados:', certData?.length || 0);

      // Filtrar apenas eventos que já terminaram
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0); // Zerar horas para comparação correta
      
      const certificadosFiltrados = (certData || []).filter((cert) => {
        const eventos = cert.eventos;
        if (!eventos) return false;
        
        const evento = Array.isArray(eventos) ? eventos[0] : eventos;
        if (!evento || typeof evento !== 'object' || !('data_fim' in evento)) return false;
        
        const dataFim = new Date(evento.data_fim as string);
        return dataFim < hoje; // Mostrar apenas se o evento já terminou
      });

      console.log(`📅 Certificados de eventos finalizados: ${certificadosFiltrados.length}/${certData?.length || 0}`);

      // Para cada certificado, calcular percentual de presença
      type RawCert = {
        id: string;
        evento_id: string;
        usuario_email: string;
        usuario_nome: string;
        codigo_validacao: string;
        url_pdf?: string | null;
        data_emissao: string;
        eventos?: unknown;
      };

      const certificadosComPresenca = await Promise.all(
        certificadosFiltrados.map(async (certItem) => {
          const cert = certItem as RawCert;
          // Garantir que temos evento_id válido antes de consultar
          if (!cert.evento_id) {
            console.warn("Certificado sem evento_id, pulando cálculo de presença:", cert);
            return {
              id: cert.id,
              evento_id: cert.evento_id,
              usuario_email: cert.usuario_email,
              usuario_nome: cert.usuario_nome,
              codigo_validacao: cert.codigo_validacao,
              url_pdf: cert.url_pdf,
              data_emissao: cert.data_emissao,
              evento: Array.isArray(cert.eventos) ? (cert.eventos[0] as unknown as Certificado['evento']) : (cert.eventos as unknown as Certificado['evento']),
              presenca_percentual: 0
            };
          }

          // Buscar total de dias do evento (somente count)
          const { count: totalDiasCount, error: presError } = await supabase
            .from("presencas")
            .select("dia_evento", { count: "exact", head: true })
            .eq("evento_id", cert.evento_id);

          if (presError) {
            console.error("Erro ao buscar total de dias (presencas):", presError);
          }

          // Buscar presenças do usuário (count exato)
          const { count: presencasUsuario, error: userPresError } = await supabase
            .from("presencas")
            .select("*", { count: "exact", head: true })
            .eq("evento_id", cert.evento_id)
            .eq("usuario_email", userEmail);

          if (userPresError) {
            console.error("Erro ao buscar presenças do usuário:", userPresError);
          }

          const totalDias = (totalDiasCount ?? 1) as number;
          const diasPresentes = (presencasUsuario ?? 0) as number;
          const percentual = Math.round((diasPresentes / totalDias) * 100);

          return {
            id: cert.id,
            evento_id: cert.evento_id,
            usuario_email: cert.usuario_email,
            usuario_nome: cert.usuario_nome,
            codigo_validacao: cert.codigo_validacao,
            hash_sha256: cert.hash_sha256,
            url_pdf: cert.url_pdf,
            data_emissao: cert.data_emissao,
            evento: Array.isArray(cert.eventos) ? (cert.eventos[0] as unknown as Certificado['evento']) : (cert.eventos as unknown as Certificado['evento']),
            presenca_percentual: percentual
          };
        })
      );

      setCertificados(certificadosComPresenca);
    } catch (error: unknown) {
      console.error("Erro ao buscar certificados:", error);
      modal.error("Erro ao carregar certificados");
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    const obterUsuario = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      } else {
        setLoading(false);
      }
    };

    obterUsuario();
  }, []);

  useEffect(() => {
    if (userEmail) {
      fetchCertificados();
    }
  }, [userEmail, fetchCertificados]);


  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    modal.success("Código de validação copiado!");
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-light">Meus Certificados</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-light">Meus Certificados</h1>

      {certificados.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Você ainda não possui certificados emitidos</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {certificados.map((cert) => {
            const elegivel = (cert.presenca_percentual || 0) >= 75;
            
            return (
              <Card key={cert.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-normal">{cert.evento.titulo}</h3>
                      {elegivel ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Apto
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="w-3 h-3" />
                          Não Apto
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Emitido em {formatDate(cert.data_emissao)}</p>
                      <p>{cert.evento.carga_horaria}h de carga horária</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden max-w-xs">
                          <div
                            className="bg-primary h-full transition-all"
                            style={{ width: `${cert.presenca_percentual}%` }}
                          />
                        </div>
                        <span className="text-xs">{cert.presenca_percentual}% presença</span>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Código de Validação:</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono flex-1 truncate">{cert.codigo_validacao}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyHash(cert.codigo_validacao)}
                        >
                          Copiar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {elegivel && (
                  <div className="flex gap-2">
                    <Button 
                      variant="elegant" 
                      size="sm" 
                      onClick={() => {
                        const hash = cert.hash_sha256 || cert.codigo_validacao;
                        if (hash) {
                          window.location.href = `/certificado/${hash}`;
                        } else {
                          modal.error("Hash do certificado não disponível");
                        }
                      }}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Imprimir Certificado
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
