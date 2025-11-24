import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { DatePicker } from "@/components/DatePicker";
import { cn } from "@/lib/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/ThemeToggle";

const Cadastro = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const emailOrMatricula = (location.state as { emailOrMatricula?: string })?.emailOrMatricula || "";
  
  const [formData, setFormData] = useState({
    nomeCompleto: "",
    dataNascimento: undefined as Date | undefined,
    email: "",
    matricula: "",
    campusId: "",
    cursoId: "",
    senha: "",
    confirmarSenha: ""
  });
  const [loading, setLoading] = useState(false);
  const [showMatriculaDialog, setShowMatriculaDialog] = useState(false);
  const [matriculaConfirmed, setMatriculaConfirmed] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [campusOptions, setCampusOptions] = useState<Array<{ id: string; nome: string }>>([]);
  const [cursosOptions, setCursosOptions] = useState<Array<{ id: string; nome: string }>>([]);

  // Preencher email ou matrícula quando vier do login
  useEffect(() => {
    if (emailOrMatricula) {
      // Verifica se é um email (contém @)
      if (emailOrMatricula.includes("@")) {
        setFormData(prev => ({ ...prev, email: emailOrMatricula }));
      } else {
        // Caso contrário, é uma matrícula
        setFormData(prev => ({ ...prev, matricula: emailOrMatricula }));
      }
    }
  }, [emailOrMatricula]);

  // Carregar campus do banco de dados
  useEffect(() => {
    const loadCampus = async () => {
      try {
        const { data, error } = await supabase
          .from("campus")
          .select("id, nome")
          .eq("ativo", true)
          .order("nome", { ascending: true });

        if (error) {
          console.error("Erro ao carregar campus:", error);
        } else {
          setCampusOptions(data || []);
        }
      } catch (err) {
        console.error("Erro ao buscar campus:", err);
      }
    };

    loadCampus();
  }, []);

  // Carregar cursos do banco de dados
  useEffect(() => {
    const loadCursos = async () => {
      try {
        const { data, error } = await supabase
          .from("cursos")
          .select("id, nome")
          .eq("ativo", true)
          .order("nome", { ascending: true });

        if (error) {
          console.error("Erro ao carregar cursos:", error);
        } else {
          setCursosOptions(data || []);
        }
      } catch (err) {
        console.error("Erro ao buscar cursos:", err);
      }
    };

    loadCursos();
  }, []);

  const handleInputChange = (field: string, value: string | Date | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Reset confirmação ao alterar matrícula
    if (field === "matricula") {
      setMatriculaConfirmed(false);
    }
  };

  const handleMatriculaBlur = () => {
    if (formData.matricula && !matriculaConfirmed) {
      setShowMatriculaDialog(true);
    }
  };

  const handleMatriculaConfirm = () => {
    setMatriculaConfirmed(true);
    setShowMatriculaDialog(false);
  };

  const handleMatriculaEdit = () => {
    setShowMatriculaDialog(false);
    // Foca no campo de matrícula
    setTimeout(() => {
      document.getElementById("matricula-input")?.focus();
    }, 100);
  };

  const handleCadastro = async () => {
    // Validações
    if (!formData.nomeCompleto || !formData.dataNascimento || !formData.email || 
        !formData.matricula || !formData.campusId || !formData.cursoId || !formData.senha || !formData.confirmarSenha) {
      setErrorMessage("Por favor, preencha todos os campos obrigatórios para continuar.");
      setShowError(true);
      return;
    }

    // Validar confirmação de matrícula
    if (!matriculaConfirmed) {
      setErrorMessage("Por favor, confirme sua matrícula antes de continuar.");
      setShowError(true);
      setShowMatriculaDialog(true);
      return;
    }

    // Validar e-mail institucional
    if (!formData.email.endsWith("@iffar.edu.br") && !formData.email.endsWith("@aluno.iffar.edu.br")) {
      setErrorMessage("Use um e-mail institucional válido (@iffar.edu.br ou @aluno.iffar.edu.br)");
      setShowError(true);
      return;
    }

    // Validar senhas
    if (formData.senha !== formData.confirmarSenha) {
      setErrorMessage("As senhas não coincidem. Por favor, verifique e tente novamente.");
      setShowError(true);
      return;
    }

    if (formData.senha.length < 8) {
      setErrorMessage("A senha deve ter no mínimo 8 caracteres para garantir a segurança da sua conta.");
      setShowError(true);
      return;
    }

    setLoading(true);

    try {
      // Criptografar senha
      const salt = await bcrypt.genSalt(10);
      const senhaHash = await bcrypt.hash(formData.senha, salt);

      // Formatar data para string no formato ISO
      const dataNascimentoStr = formData.dataNascimento.toISOString().split('T')[0];

      // Inserir usuário no banco (com email confirmado)
      const { data, error } = await supabase
        .from("usuarios")
        .insert([{
          email: formData.email,
          nome_completo: formData.nomeCompleto,
          matricula: formData.matricula,
          campus_id: formData.campusId,
          curso_id: formData.cursoId,
          data_nascimento: dataNascimentoStr,
          senha_hash: senhaHash,
          perfil: "user",
          email_confirmado: true // Email já confirmado no cadastro
        }])
        .select();

      if (error) {
        if (error.code === "23505") { // Duplicate key
          if (error.message.includes("email")) {
            setErrorMessage("Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.");
          } else if (error.message.includes("matricula")) {
            setErrorMessage("Esta matrícula já está cadastrada. Tente fazer login ou verifique sua matrícula.");
          } else {
            setErrorMessage("E-mail ou matrícula já cadastrados no sistema.");
          }
        } else {
          setErrorMessage("Erro ao cadastrar: " + error.message);
        }
        setShowError(true);
      } else {
        // Cadastro realizado com sucesso!
        // NÃO enviar OTP - usuário já está cadastrado e pode fazer login
        
        toast.success("Cadastro realizado com sucesso! Faça login para continuar.");
        
        // Redirecionar para tela de login
        navigate("/login", { state: { email: formData.email } });
      }
    } catch (err) {
      console.error("Erro no cadastro:", err);
      setErrorMessage("Erro ao realizar cadastro. Por favor, tente novamente.");
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 py-12 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <div className="w-full max-w-2xl mx-auto">
          <div className="backdrop-blur-custom bg-card border border-border rounded-xl p-6 sm:p-8 glow-border">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img 
                src="/logo-bgremoved.png" 
                alt="Logo" 
                className="h-12 w-auto object-contain"
              />
            </div>
            
            <div className="text-center mb-6">
              <h1 className="text-2xl font-light tracking-wider text-foreground mb-2">
                Cadastro
              </h1>
              <p className="text-sm text-muted-foreground">
                Preencha seus dados para criar sua conta
              </p>
            </div>

            <div className="space-y-4">
              {/* Nome Completo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nome Completo</label>
                <Input
                  type="text"
                  placeholder="Seu nome completo"
                  value={formData.nomeCompleto}
                  onChange={(e) => handleInputChange("nomeCompleto", e.target.value)}
                  className="h-12 bg-transparent border-border focus:glow-border-hover"
                  disabled={loading}
                />
              </div>

              {/* Data de Nascimento */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Data de Nascimento</label>
                <DatePicker
                  date={formData.dataNascimento}
                  onDateChange={(date) => handleInputChange("dataNascimento", date)}
                  placeholder="Selecione sua data"
                  disabled={loading}
                />
              </div>

              {/* Matrícula */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Matrícula {matriculaConfirmed && <span className="text-green-500 text-xs">✓ Confirmada</span>}
                </label>
                <Input
                  id="matricula-input"
                  type="text"
                  placeholder="Sua matrícula"
                  value={formData.matricula}
                  onChange={(e) => handleInputChange("matricula", e.target.value)}
                  onBlur={handleMatriculaBlur}
                  className="h-12 bg-transparent border-border focus:glow-border-hover"
                  disabled={loading || matriculaConfirmed}
                  autoComplete="off"
                  style={matriculaConfirmed ? { color: 'hsl(var(--foreground))', opacity: 1 } : undefined}
                />
              </div>

              {/* Campus e Curso (Grid 2 colunas) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Campus</label>
                  <Select
                    value={formData.campusId}
                    onValueChange={(value) => handleInputChange("campusId", value)}
                    disabled={loading}
                  >
                    <SelectTrigger className="h-12 bg-transparent border-border focus:glow-border-hover">
                      <SelectValue placeholder="Selecione seu campus" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border" side="bottom">
                      {campusOptions.map((campus) => (
                        <SelectItem key={campus.id} value={campus.id}>
                          {campus.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Curso</label>
                  <Select
                    value={formData.cursoId}
                    onValueChange={(value) => handleInputChange("cursoId", value)}
                    disabled={loading}
                  >
                    <SelectTrigger className="h-12 bg-transparent border-border focus:glow-border-hover">
                      <SelectValue placeholder="Selecione seu curso" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border" side="bottom">
                      {cursosOptions.map((curso) => (
                        <SelectItem key={curso.id} value={curso.id}>
                          {curso.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* E-mail */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">E-mail Institucional</label>
                <Input
                  type="email"
                  placeholder="seu.email@aluno.iffar.edu.br"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="h-12 bg-transparent border-border focus:glow-border-hover"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Use @iffar.edu.br ou @aluno.iffar.edu.br
                </p>
              </div>

              {/* Senhas (Grid 2 colunas) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Senha</label>
                  <Input
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={formData.senha}
                    onChange={(e) => handleInputChange("senha", e.target.value)}
                    className="h-12 bg-transparent border-border focus:glow-border-hover"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Confirmar Senha</label>
                  <Input
                    type="password"
                    placeholder="Digite novamente"
                    value={formData.confirmarSenha}
                    onChange={(e) => handleInputChange("confirmarSenha", e.target.value)}
                    className="h-12 bg-transparent border-border focus:glow-border-hover"
                    disabled={loading}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground italic">
                A senha será usada como autenticação alternativa ao código enviado por e-mail
              </p>

              <Button
                variant="elegant"
                size="lg"
                onClick={handleCadastro}
                className="w-full mt-6"
                disabled={loading}
              >
                {loading ? "Cadastrando..." : "Cadastrar"}
              </Button>

              <button
                onClick={() => navigate("/login")}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                disabled={loading}
              >
                Já tem uma conta? Faça login
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de confirmação de matrícula */}
      <AlertDialog open={showMatriculaDialog} onOpenChange={setShowMatriculaDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirme sua matrícula</AlertDialogTitle>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-3 text-left">
            <AlertDialogDescription>
              Sua matrícula <span className="font-medium text-foreground">{formData.matricula}</span> está correta?
            </AlertDialogDescription>
            <AlertDialogDescription className="text-muted-foreground/80">
              Este dado será usado para validação dos seus certificados no Campus.
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleMatriculaEdit}
              className="border-red-500/40 text-red-400/90 hover:border-red-500/60 hover:bg-red-500/10"
            >
              Não, vou ajustar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMatriculaConfirm}
              className="border-green-500/50 text-green-400 hover:border-green-500/70 hover:bg-green-500/15 shadow-[0_0_12px_rgba(34,197,94,0.15)]"
            >
              Sim, está correto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de erros */}
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
    </>
  );
};

export default Cadastro;


