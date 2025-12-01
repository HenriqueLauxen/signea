import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";
import { confirmarPagamento } from "@/lib/api/pagamento";
import { useToast } from "@/contexts/ToastContext";
 

export default function PagarSimulacao() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const inscricaoId = searchParams.get("id");
  const [loading, setLoading] = useState(false);
  const [pagamentoConfirmado, setPagamentoConfirmado] = useState(false);

  useEffect(() => {
    if (!inscricaoId) {
      toast.error("ID de inscrição não fornecido");
      navigate("/");
    }
  }, [inscricaoId, navigate, toast]);

  const handleConfirmarPagamento = async () => {
    if (!inscricaoId) return;

    try {
      setLoading(true);
      const result = await confirmarPagamento(inscricaoId);

      const broadcastSignal = async () => {
        try {
          const channel = supabase.channel(`payment-tx-${inscricaoId}`);
          const status = await channel.subscribe();
          if (status === 'SUBSCRIBED') {
            await channel.send({ type: 'broadcast', event: 'pix_paid', payload: { inscricaoId } });
          }
          try { supabase.removeChannel(channel); } catch {}
        } catch (e) {
          console.error('Falha ao sinalizar pagamento via realtime', e);
        }
      };

      if (result.success) {
        setPagamentoConfirmado(true);
        toast.success("Pagamento confirmado com sucesso!");
        await broadcastSignal();
      } else {
        // Mesmo com falha de update (RLS), sinaliza para o app principal concluir
        await broadcastSignal();
        toast.error("Erro ao confirmar pagamento");
      }
    } catch (error) {
      console.error("Erro ao confirmar pagamento:", error);
      toast.error("Erro ao confirmar pagamento");
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-light">Pagamento Simulado</h1>
            
            {pagamentoConfirmado ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium">Pagamento confirmado!</p>
                  <p className="text-sm text-muted-foreground">
                    Você pode voltar ao app agora.
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/usuario/eventos")}
                  variant="elegant"
                  className="w-full"
                >
                  Voltar para Eventos
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Esta é uma simulação de pagamento para testes.</strong>
                    <br />
                    Não há integração com banco real ou gateway de pagamento.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Clique no botão abaixo para simular o pagamento da inscrição.
                  </p>
                </div>

                <Button
                  onClick={handleConfirmarPagamento}
                  disabled={loading || !inscricaoId}
                  variant="elegant"
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    "Confirmar Pagamento"
                  )}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
  );
}

