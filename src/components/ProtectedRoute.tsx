import { useEffect, useState, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { startSessionMonitoring, clearSessionCache } from "@/lib/sessionManager";

type ProtectedRouteProps = {
  children: ReactNode;
  requiredMenu?: "usuario" | "organizador" | "campus";
};

/**
 * Rota protegida:
 * - Usa SOMENTE a sessão do Supabase como fonte de verdade
 * - Não mostra "verificando autenticação"
 * - Se não tiver sessão, redireciona para /login
 * - Se tiver sessão, renderiza o conteúdo normalmente
 */
export function ProtectedRoute(props: ProtectedRouteProps) {
  const { children, requiredMenu } = props;
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<any | null | undefined>(undefined);
  const [email, setEmail] = useState<string | null>(null);
  const [permChecked, setPermChecked] = useState(false);
  const [hasPerm, setHasPerm] = useState(true);

  useEffect(() => {
    let mounted = true;
    let stopMonitoring: (() => void) | undefined;
    const hydrateSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      const currentSession = error ? null : data?.session ?? null;
      setSession(currentSession);
      setEmail(currentSession?.user?.email || null);
      if (currentSession && !stopMonitoring) {
        stopMonitoring = startSessionMonitoring();
      }
    };
    hydrateSession();
    const { data } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        if (event === "SIGNED_OUT") {
          setSession(null);
          setEmail(null);
          clearSessionCache();
          if (stopMonitoring) {
            stopMonitoring();
            stopMonitoring = undefined;
          }
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          setSession(newSession);
          setEmail(newSession?.user?.email || null);
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

  useEffect(() => {
    // Corrigir escopo: usar a prop corretamente
    const menu = requiredMenu;
    if (!menu || !email) {
      setPermChecked(true);
      setHasPerm(true);
      return;
    }
    import("@/lib/menuPermissions").then(({ getUserMenuPermissions }) => {
      const perms = getUserMenuPermissions(email);
      setHasPerm(perms[menu]);
      setPermChecked(true);
    });
  }, [requiredMenu, email]);

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
    if (requiredMenu && permChecked && !hasPerm) {
      return (
        <div style={{ padding: 32, textAlign: "center" }}>
          <h2 style={{ fontSize: 24, color: "#e53e3e" }}>Acesso negado</h2>
          <p style={{ marginTop: 16 }}>Você não tem permissão para acessar este menu.</p>
        </div>
      );
    }
    return <>{children}</>;
}
