import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { modal } from "@/contexts/ModalContext";

const ConfirmarCodigo = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string })?.email || "";
  
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate("/cadastro");
    }
  }, [email, navigate]);

  const handleCodeChange = (index: number, value: string) => {
    // Se o valor tiver mais de 1 caractere, é uma colagem
    if (value.length > 1) {
      // Extrair apenas números
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newCode = [...code];
      
      // Preencher a partir do índice atual
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });
      
      setCode(newCode);
      
      // Focar no último campo preenchido ou no último campo se todos foram preenchidos
      const lastFilledIndex = Math.min(index + digits.length - 1, 5);
      const lastInput = document.getElementById(`code-${lastFilledIndex}`);
      lastInput?.focus();
      
      // Se todos os campos foram preenchidos, selecionar o texto do último campo
      if (lastFilledIndex === 5 && newCode[5]) {
        (lastInput as HTMLInputElement)?.select();
      }
      
      return;
    }
    
    // Entrada normal de um único dígito
    const newCode = [...code];
    newCode[index] = value.replace(/\D/g, "").slice(0, 1);
    setCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const digits = pastedText.replace(/\D/g, "").slice(0, 6).split("");
    
    if (digits.length > 0) {
      const newCode = [...code];
      digits.forEach((digit, i) => {
        if (i < 6) {
          newCode[i] = digit;
        }
      });
      setCode(newCode);
      
      // Focar no último campo preenchido
      const lastFilledIndex = Math.min(digits.length - 1, 5);
      const lastInput = document.getElementById(`code-${lastFilledIndex}`);
      lastInput?.focus();
      
      // Se todos os campos foram preenchidos, selecionar o texto do último campo
      if (lastFilledIndex === 5 && newCode[5]) {
        setTimeout(() => {
          (lastInput as HTMLInputElement)?.select();
        }, 0);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      modal.error("Por favor, insira o código completo");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: fullCode,
        type: 'email'
      });

      if (error) {
        modal.error("Código inválido ou expirado. Verifique e tente novamente.");
        return;
      }

      // Verificar se o e-mail está confirmado
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("email_confirmado")
        .eq("email", email)
        .single();

      if (usuario && usuario.email_confirmado === false) {
        // Atualizar como confirmado
        await supabase
          .from("usuarios")
          .update({ email_confirmado: true })
          .eq("email", email);
      }

      modal.success("E-mail confirmado com sucesso! Você já pode fazer login.");
      navigate("/login");
    } catch (err) {
      console.error("Erro ao verificar código:", err);
      modal.error("Erro ao verificar código. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: undefined, // Garante envio de OTP de 6 dígitos (não magic link)
        }
      });

      if (error) {
        if (error.message.includes("rate limit") || error.message.includes("rate_limit")) {
          modal.error("Muitas tentativas de envio de código. Por favor, aguarde alguns minutos antes de tentar novamente.");
        } else {
          modal.error("Erro ao reenviar código. Tente novamente.");
        }
      } else {
        modal.success("Código reenviado! Verifique seu e-mail.");
        setCode(["", "", "", "", "", ""]);
      }
    } catch (err) {
      console.error("Erro ao reenviar código:", err);
      modal.error("Erro ao reenviar código. Tente novamente.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-8 backdrop-blur-sm glow-border">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-light tracking-wider text-foreground mb-2">
              Confirmar E-mail
            </h1>
            <p className="text-sm text-muted-foreground">
              Digite o código de 6 dígitos enviado para
            </p>
            <p className="text-sm font-medium text-foreground mt-1">
              {email}
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex justify-center gap-2">
              {code.map((digit, index) => (
                <Input
                  key={index}
                  id={`code-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-14 text-center text-xl font-mono bg-transparent border-border focus:glow-border-hover"
                  disabled={loading}
                />
              ))}
            </div>

            <Button
              onClick={handleVerifyCode}
              disabled={loading || code.some(d => !d)}
              className="w-full h-12 bg-transparent border border-border hover:glow-border-hover hover:bg-white hover:text-black text-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Confirmar Código"
              )}
            </Button>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Não recebeu o código?
              </p>
              <button
                onClick={handleResendCode}
                disabled={resending}
                className="text-sm text-foreground hover:underline disabled:opacity-50"
              >
                {resending ? "Reenviando..." : "Reenviar código"}
              </button>
            </div>

            <button
              onClick={() => navigate("/cadastro")}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Voltar ao Cadastro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarCodigo;

