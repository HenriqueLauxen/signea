import { useEffect, useState, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { modal } from "@/contexts/ModalContext";
import { checkSession, startActivityMonitoring } from "@/lib/sessionManager";

type ProtectedRouteProps = {
  children: ReactNode;
};

/**
 * Componente que protege rotas privadas
 * Verifica se o usuário está autenticado via sessão do Supabase
 * Redireciona para /login se não estiver autenticado
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    let cleanupActivity: (() => void) | undefined;

    const checkAuth = async () => {
      try {
        // Verifica sessão (Supabase Auth ou customizada)
        const isValid = await checkSession();

        if (!mounted) return;

        if (!isValid) {
          // Não está autenticado
          setIsAuthenticated(false);
          setIsChecking(false);

          // Redireciona para login salvando a rota tentada (sem mostrar modal)
          navigate("/login", {
            replace: true,
            state: { from: location.pathname }
          });
        } else {
          // Está autenticado
          setIsAuthenticated(true);
          setIsChecking(false);

          // Inicia monitoramento de atividade
          cleanupActivity = startActivityMonitoring();
        }
      } catch (err) {
        console.error("Erro ao verificar autenticação:", err);
        if (mounted) {
          setIsAuthenticated(false);
          setIsChecking(false);
          navigate("/login", { replace: true });
        }
      }
    };

    checkAuth();

    // Escuta mudanças na autenticação do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === "SIGNED_OUT") {
          setIsAuthenticated(false);
          navigate("/login", { replace: true });
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          // Re-verifica sessão completa para garantir
          const isValid = await checkSession();
          if (isValid) {
            setIsAuthenticated(true);
            // Reinicia monitoramento
            if (cleanupActivity) cleanupActivity();
            cleanupActivity = startActivityMonitoring();
          }
        }
      }
    );

    // Timeout de segurança para não ficar carregando infinitamente
    const timeoutId = setTimeout(() => {
      if (mounted && isChecking) {
        console.warn("Timeout na verificação de autenticação");
        setIsChecking(false);
        if (isAuthenticated === null) {
          setIsAuthenticated(false);
          navigate("/login", { replace: true });
        }
      }
    }, 10000); // 10 segundos de timeout

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (cleanupActivity) cleanupActivity();
      clearTimeout(timeoutId);
    };
  }, [navigate, location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enquanto verifica, mostra loading
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se não está autenticado, não renderiza nada (já redirecionou)
  if (!isAuthenticated) {
    return null;
  }

  // Está autenticado, renderiza o conteúdo
  return <>{children}</>;
}
