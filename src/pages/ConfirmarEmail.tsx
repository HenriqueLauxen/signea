import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { modal } from "@/contexts/ModalContext";

const ConfirmarEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "expired">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const confirmEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Token de confirmação não fornecido.");
        return;
      }

      try {
        // Buscar token no banco
        const { data: tokenData, error: tokenError } = await supabase
          .from("email_confirmation_tokens")
          .select("email, expires_at, used")
          .eq("token", token)
          .single();

        if (tokenError || !tokenData) {
          setStatus("error");
          setMessage("Token inválido ou não encontrado.");
          return;
        }

        // Verificar se token já foi usado
        if (tokenData.used) {
          setStatus("error");
          setMessage("Este link de confirmação já foi utilizado.");
          return;
        }

        // Verificar se token expirou
        const expiresAt = new Date(tokenData.expires_at);
        if (expiresAt < new Date()) {
          setStatus("expired");
          setMessage("Este link de confirmação expirou. Por favor, solicite um novo link.");
          return;
        }

        // Atualizar usuário como confirmado
        const { error: updateError } = await supabase
          .from("usuarios")
          .update({ email_confirmado: true })
          .eq("email", tokenData.email);

        if (updateError) {
          setStatus("error");
          setMessage("Erro ao confirmar e-mail. Tente novamente.");
          return;
        }

        // Marcar token como usado
        await supabase
          .from("email_confirmation_tokens")
          .update({ used: true })
          .eq("token", token);

        setStatus("success");
        setMessage("E-mail confirmado com sucesso! Você já pode fazer login.");
      } catch (error) {
        console.error("Erro ao confirmar e-mail:", error);
        setStatus("error");
        setMessage("Erro ao processar confirmação. Tente novamente.");
      }
    };

    confirmEmail();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-8 backdrop-blur-sm glow-border">
          <div className="text-center space-y-6">
            {status === "loading" && (
              <>
                <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
                <h2 className="text-xl font-light text-foreground">
                  Confirmando seu e-mail...
                </h2>
                <p className="text-sm text-muted-foreground">
                  Aguarde enquanto processamos sua confirmação.
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
                <h2 className="text-xl font-light text-green-500">
                  E-mail Confirmado!
                </h2>
                <p className="text-sm text-muted-foreground">
                  {message}
                </p>
                <Button
                  onClick={() => navigate("/login")}
                  className="w-full bg-transparent border border-border hover:glow-border-hover text-foreground"
                >
                  Ir para Login
                </Button>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="w-16 h-16 mx-auto text-red-500" />
                <h2 className="text-xl font-light text-red-500">
                  Erro na Confirmação
                </h2>
                <p className="text-sm text-muted-foreground">
                  {message}
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate("/login")}
                    variant="outline"
                    className="flex-1"
                  >
                    Ir para Login
                  </Button>
                  <Button
                    onClick={() => navigate("/cadastro")}
                    className="flex-1 bg-transparent border border-border hover:glow-border-hover text-foreground"
                  >
                    Criar Conta
                  </Button>
                </div>
              </>
            )}

            {status === "expired" && (
              <>
                <XCircle className="w-16 h-16 mx-auto text-yellow-500" />
                <h2 className="text-xl font-light text-yellow-500">
                  Link Expirado
                </h2>
                <p className="text-sm text-muted-foreground">
                  {message}
                </p>
                <p className="text-xs text-muted-foreground">
                  O link de confirmação expira após 15 minutos por segurança.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate("/login")}
                    variant="outline"
                    className="flex-1"
                  >
                    Ir para Login
                  </Button>
                  <Button
                    onClick={() => navigate("/cadastro")}
                    className="flex-1 bg-transparent border border-border hover:glow-border-hover text-foreground"
                  >
                    Criar Nova Conta
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarEmail;

