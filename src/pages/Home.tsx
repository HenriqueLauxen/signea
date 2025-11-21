import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md mx-4">
        <div className="bg-card border border-border rounded-xl p-8 backdrop-blur-sm glow-border">
          <h1 className="text-4xl font-light tracking-[0.2em] text-center mb-8">
            SIGNEA
          </h1>
          
          <div className="space-y-4">
            <Button
              variant="elegant"
              size="lg"
              className="w-full"
              onClick={() => navigate("/login")}
            >
              Login
            </Button>
            
            <Button
              variant="outline"
              size="default"
              onClick={() => navigate("/validar-certificado")}
              className="w-full border-border hover:bg-accent/50 hover:text-foreground transition-colors"
            >
              Validar Certificado
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
