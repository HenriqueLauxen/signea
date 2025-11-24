import { useEffect, useState, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { startSessionMonitoring, clearSessionCache } from "@/lib/sessionManager";

type ProtectedRouteProps = {
  children: ReactNode;
};

/**
 * Rota protegida:
 * - Usa SOMENTE a sessão do Supabase como fonte de verdade
 * - Não mostra "verificando autenticação"
 * - Se não tiver sessão, redireciona para /login
 * - Se tiver sessão, renderiza o conteúdo normalmente
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // undefined = ainda carregando sessão
  // null      = sem sessão
  // objeto    = sessão válida
  const [session, setSession] = useState<any | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    let stopMonitoring: (() => void) | undefined;

    const hydrateSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      const currentSession = error ? null : data?.session ?? null;
      setSession(currentSession);

      // Se tem sessão válida, inicia monitoramento em background
      if (currentSession && !stopMonitoring) {
        stopMonitoring = startSessionMonitoring();
      }
    };

    // Carrega sessão uma vez ao montar
    hydrateSession();

    // Escuta mudanças globais de autenticação (login/logout/refresh)
    const { data } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;

        if (event === "SIGNED_OUT") {
          // Logout global: limpa sessão e cache
          setSession(null);
          clearSessionCache();
          if (stopMonitoring) {
            stopMonitoring();
            stopMonitoring = undefined;
          }
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          // Login/refresh: atualiza sessão e garante monitoramento
          setSession(newSession);
          if (newSession && !stopMonitoring) {
            stopMonitoring = startSessionMonitoring();
          }
        }
      }
    );

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
      if (stopMonitoring) stopMonitoring();
    };
  }, []);

  // Se detectamos claramente que NÃO há sessão, manda para /login
  useEffect(() => {
    if (session === null) {
      navigate("/login", {
        replace: true,
        state: { from: location.pathname + location.search },
      });
    }
  }, [session, navigate, location.pathname, location.search]);

  // Ainda carregando sessão → não mostra nada, evita flicker feio
  if (session === undefined) {
    return null;
  }

  // Já sabemos que não tem sessão → o useEffect acima cuida do redirect
  if (session === null) {
    return null;
  }

  // Sessão válida → renderiza conteúdo protegido
  return <>{children}</>;
}
