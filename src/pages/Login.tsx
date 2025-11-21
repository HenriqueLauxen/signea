import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useLocation } from "react-router-dom";
import { modal } from "@/contexts/ModalContext";
import { useToast } from "@/contexts/ToastContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/lib/supabase.ts";
import { isValidInstitutionalEmail, getEmailValidationErrorMessage } from "@/lib/emailValidation";
import bcrypt from "bcryptjs";
import { checkSession } from "@/lib/sessionManager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Login = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<"email" | "code" | "password">("email");
  const [emailOrMatricula, setEmailOrMatricula] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [showAccountNotFound, setShowAccountNotFound] = useState(false);
  const [accountNotFoundType, setAccountNotFoundType] = useState<"email" | "matricula">("email");
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Pega a rota que o usuário tentou acessar antes de ser redirecionado
  const from = (location.state as { from?: string })?.from || "/usuario/eventos";

  // Verifica se já está logado ao carregar a página
  useEffect(() => {
    const checkIfLoggedIn = async () => {
      const isAuthenticated = await checkSession();
      
      if (isAuthenticated) {
        // Usuário já está logado, redireciona para onde tentou ir ou para eventos
        toast.info("Você já está autenticado!");
        navigate(from, { replace: true });
      }
    };

    checkIfLoggedIn();

    // Escuta mudanças no estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate(from, { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, from]);

  const handleSendCode = async () => {
    if (!emailOrMatricula) {
      setErrorMessage("Por favor, insira seu e-mail institucional ou matrícula");
      setShowError(true);
      return;
    }
    
    setLoading(true);

    try {
      let userEmail = emailOrMatricula;
      
      // Verifica se é e-mail ou matrícula
      const isEmail = emailOrMatricula.includes("@");
      
      if (isEmail) {
        // Validação de domínios permitidos
        if (!emailOrMatricula.endsWith("@iffar.edu.br") && !emailOrMatricula.endsWith("@aluno.iffar.edu.br")) {
          setErrorMessage("Use um e-mail institucional (@iffar.edu.br ou @aluno.iffar.edu.br)");
          setShowError(true);
          setLoading(false);
          return;
        }
        
        // Busca usuário por e-mail
        const { data: usuario, error: userError } = await supabase
          .from("usuarios")
          .select("email, matricula, senha_hash")
          .eq("email", emailOrMatricula)
          .single();

        if (userError || !usuario) {
          // Usuário não existe, mostra modal
          setAccountNotFoundType("email");
          setShowAccountNotFound(true);
          setLoading(false);
          return;
        }
        
        setEmail(usuario.email);
        setUsePassword(!!usuario.senha_hash);
      } else {
        // É matrícula, busca o e-mail correspondente
        const { data: usuario, error: userError } = await supabase
          .from("usuarios")
          .select("email, matricula, senha_hash")
          .eq("matricula", emailOrMatricula)
          .single();

        if (userError || !usuario) {
          // Usuário não existe, mostra modal
          setAccountNotFoundType("matricula");
          setShowAccountNotFound(true);
          setLoading(false);
          return;
        }
        
        userEmail = usuario.email;
        setEmail(usuario.email);
        setUsePassword(!!usuario.senha_hash);
      }
      
      // Navega imediatamente para a tela de código
      setStep("code");

      // Envia código OTP para o e-mail
      const { data, error } = await supabase.auth.signInWithOtp({
        email: userEmail,
        options: {
          shouldCreateUser: false,
        }
      });

      if (error) {
        if (error.message.includes("rate limit") || error.message.includes("rate_limit")) {
          setErrorMessage("Muitas tentativas de envio de código. Por favor, aguarde alguns minutos antes de tentar novamente.");
        } else {
        setErrorMessage("Erro ao enviar código: " + error.message);
        }
        setShowError(true);
      } else {
        modal.success("Código de 6 dígitos enviado para seu e-mail!");
      }
    } catch (err) {
      console.error("Erro no login:", err);
      setErrorMessage("Erro ao processar login. Tente novamente.");
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = () => {
    setShowAccountNotFound(false);
    navigate("/cadastro", { state: { emailOrMatricula } });
  };

  const handleCancelCreateAccount = () => {
    setShowAccountNotFound(false);
  };

  const handleCodeChange = (index: number, value: string) => {
    // Se o usuário colou um código completo
    if (value.length > 1) {
      const digits = value.slice(0, 6).split("");
      const newCode = [...code];
      
      // Preenche os campos a partir do campo atual
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });
      
      setCode(newCode);
      
      // Foca no último campo preenchido ou no último campo disponível
      const lastFilledIndex = Math.min(index + digits.length - 1, 5);
      const lastInput = document.getElementById(`code-${lastFilledIndex}`);
      lastInput?.focus();
      
      return;
    }
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Se pressionar backspace
    if (e.key === "Backspace") {
      // Se o campo atual estiver vazio, volta para o campo anterior e apaga
      if (!code[index] && index > 0) {
        e.preventDefault();
        const newCode = [...code];
        newCode[index - 1] = "";
        setCode(newCode);
        
        const prevInput = document.getElementById(`code-${index - 1}`);
        prevInput?.focus();
      }
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
        setErrorMessage("Código inválido ou expirado. Verifique e tente novamente.");
        setShowError(true);
      } else {
        // Verifica se o e-mail está confirmado
        const { data: usuario } = await supabase
          .from("usuarios")
          .select("email_confirmado")
          .eq("email", email)
          .single();

        if (usuario && usuario.email_confirmado === false) {
          setErrorMessage("Por favor, confirme seu e-mail antes de fazer login. Verifique sua caixa de entrada.");
          setShowError(true);
          setLoading(false);
          return;
        }

        // Cria sessão personalizada
        await createSession(email);
        modal.success("Login realizado com sucesso!");
        navigate(from, { replace: true });
      }
    } catch (err) {
      setErrorMessage("Erro ao verificar código. Tente novamente.");
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!password) {
      setErrorMessage("Por favor, insira sua senha");
      setShowError(true);
      return;
    }

    setLoading(true);

    try {
      // Busca a senha hash do usuário
      const { data: usuario, error: userError } = await supabase
        .from("usuarios")
        .select("senha_hash, email_confirmado")
        .eq("email", email)
        .single();

      if (userError || !usuario || !usuario.senha_hash) {
        setErrorMessage("Erro ao verificar usuário");
        setShowError(true);
        setLoading(false);
        return;
      }

      // Verifica se o e-mail está confirmado
      if (usuario.email_confirmado === false) {
        setErrorMessage("Por favor, confirme seu e-mail antes de fazer login. Verifique sua caixa de entrada.");
        setShowError(true);
        setLoading(false);
        return;
      }

      // Verifica senha
      const senhaCorreta = await bcrypt.compare(password, usuario.senha_hash);

      if (!senhaCorreta) {
        setErrorMessage("Senha incorreta. Verifique e tente novamente.");
        setShowError(true);
        setLoading(false);
        return;
      }

      // Autentica com Supabase usando signInWithPassword
      // Como não temos a senha do Supabase Auth, vamos criar a sessão manualmente
      await createSession(email);
      
      modal.success("Login realizado com sucesso!");
      navigate(from, { replace: true });
    } catch (err) {
      console.error("Erro ao verificar senha:", err);
      setErrorMessage("Erro ao verificar senha. Tente novamente.");
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (userEmail: string) => {
    try {
      // Gera token de sessão
      const sessionToken = crypto.randomUUID();
      const sessionExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutos
      
      // Atualiza sessão no banco
      await supabase
        .from("usuarios")
        .update({
          session_token: sessionToken,
          session_expires_at: sessionExpiresAt.toISOString(),
          last_activity_at: new Date().toISOString()
        })
        .eq("email", userEmail);
      
      // Salva no localStorage para verificação frontend
      localStorage.setItem("session_token", sessionToken);
      localStorage.setItem("session_email", userEmail);
    } catch (err) {
      console.error("Erro ao criar sessão:", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md mx-auto">
        <div className="backdrop-blur-custom bg-card border border-border rounded-xl p-8 glow-border">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src="/logo-bgremoved.png" 
              alt="Logo" 
              className="h-16 w-auto object-contain"
            />
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-light tracking-wider text-foreground mb-2">
              Login
            </h1>
            <p className="text-sm text-muted-foreground">
              {step === "email" 
                ? "Entre com suas credenciais"
                : step === "code"
                ? "Digite o código enviado"
                : "Use sua senha"}
            </p>
          </div>

          {step === "email" ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="E-mail institucional ou Matrícula"
                  value={emailOrMatricula}
                  onChange={(e) => setEmailOrMatricula(e.target.value)}
                  className="h-12 bg-transparent border-border focus:glow-border-hover"
                  disabled={loading}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleSendCode();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground text-center">
                  Use seu e-mail institucional ou matrícula
                </p>
              </div>
              
              <Button
                variant="elegant"
                size="lg"
                onClick={handleSendCode}
                className="w-full"
                disabled={loading}
              >
                {loading ? "Verificando..." : "Entrar"}
              </Button>

              <button
                onClick={() => navigate("/")}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                disabled={loading}
              >
                Voltar
              </button>
            </div>
          ) : step === "code" ? (
            <div className="space-y-6">
              <div className="flex justify-center gap-2">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-12 text-center text-lg bg-transparent border border-border rounded-lg focus:glow-border-hover focus:outline-none"
                    disabled={loading}
                  />
                ))}
              </div>

              <Button
                onClick={handleVerifyCode}
                className="w-full h-12 bg-transparent border border-border hover:glow-border-hover rounded-lg text-foreground font-normal"
                disabled={loading}
              >
                {loading ? "Verificando..." : "Confirmar código"}
              </Button>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setStep("email")}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  Voltar
                </button>
                
                {usePassword && (
                  <button
                    onClick={() => setStep("password")}
                    className="w-full text-sm text-primary hover:text-primary/80 transition-colors"
                    disabled={loading}
                  >
                    Código não funcionou? Use sua senha-mestra
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Senha-Mestra</label>
                <Input
                  type="password"
                  placeholder="Digite sua senha-mestra"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-transparent border-border focus:glow-border-hover"
                  disabled={loading}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleVerifyPassword();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Use a senha-mestra cadastrada como alternativa ao código
                </p>
              </div>

              <Button
                onClick={handleVerifyPassword}
                className="w-full h-12 bg-transparent border border-border hover:glow-border-hover rounded-lg text-foreground font-normal"
                disabled={loading}
              >
                {loading ? "Verificando..." : "Entrar com senha"}
              </Button>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setStep("code")}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  Voltar para código
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal - Conta não encontrada */}
      <AlertDialog open={showAccountNotFound} onOpenChange={setShowAccountNotFound}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conta não encontrada</AlertDialogTitle>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-3 text-left">
            <AlertDialogDescription>
              {accountNotFoundType === "email" 
                ? `Não encontramos uma conta com o e-mail ${emailOrMatricula}.`
                : `Não encontramos uma conta com a matrícula ${emailOrMatricula}.`
              }
            </AlertDialogDescription>
            <AlertDialogDescription className="text-foreground/90">
              Vamos criar uma conta para você!
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleCancelCreateAccount}
              className="border-red-500/40 text-red-400/90 hover:border-red-500/60 hover:bg-red-500/10"
            >
              Humm, não
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateAccount}
              className="border-green-500/50 text-green-400 hover:border-green-500/70 hover:bg-green-500/15 shadow-[0_0_12px_rgba(34,197,94,0.15)]"
            >
              Bora lá!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal - Erros gerais */}
      <AlertDialog open={showError} onOpenChange={setShowError}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atenção</AlertDialogTitle>
          </AlertDialogHeader>
          
          <AlertDialogDescription className="py-3 text-center">
              {errorMessage}
          </AlertDialogDescription>

          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowError(false)}
              className="w-full"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Login;
