import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { modal } from "@/contexts/ModalContext";

const ValidateAttendance = () => {
  const navigate = useNavigate();
  const [matricula, setMatricula] = useState("");
  const [keyword, setKeyword] = useState("");
  const [validated, setValidated] = useState(false);

  const handleValidate = () => {
    if (!matricula || !keyword) {
      modal.error("Preencha todos os campos");
      return;
    }

    // Simular validação
    setValidated(true);
    modal.success("Presença validada com sucesso!");
  };

  if (validated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="backdrop-blur-custom bg-card border border-border rounded-xl p-8 glow-border text-center space-y-6">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
            <div>
              <h2 className="text-2xl font-light mb-2">Presença Validada!</h2>
              <p className="text-sm text-muted-foreground">
                Sua presença foi registrada em {new Date().toLocaleDateString()} às{" "}
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <Button
              onClick={() => navigate("/")}
              className="w-full bg-transparent border border-border hover:glow-border-hover"
            >
              Voltar à página inicial
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md mx-4">
        <div className="bg-card border border-border rounded-xl p-8 backdrop-blur-sm glow-border">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-light tracking-wider text-foreground mb-2">
              Validar Presença
            </h1>
            <p className="text-sm text-muted-foreground">Evento: Semana de Tecnologia 2025</p>
          </div>

          <div className="space-y-6">
            <Input
              placeholder="Matrícula ou E-mail Institucional"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              className="h-12 bg-transparent border-border focus:glow-border-hover"
            />

            <Input
              placeholder="Palavra-chave do dia"
              type="password"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="h-12 bg-transparent border-border focus:glow-border-hover"
            />

            <Button
              variant="elegant"
              size="lg"
              onClick={handleValidate}
              className="w-full"
            >
              Validar Presença
            </Button>

            <button
              onClick={() => navigate("/")}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidateAttendance;
