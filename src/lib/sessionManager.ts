import { supabase } from "./supabase";

const SESSION_CACHE_KEY = "app_session_cache";

/**
 * Obtém sessão de forma INSTANTÂNEA (síncrona) via localStorage
 * Retorna objeto session ou null
 */
export const getSessionSync = (): any => {
  try {
    // Lê localStorage do Supabase diretamente (instantâneo)
    const supabaseSession = localStorage.getItem("supabase.auth.token");
    if (supabaseSession) {
      try {
        const parsed = JSON.parse(supabaseSession);
        const session = parsed?.currentSession;

        // Verifica se tem token e se não expirou
        if (session?.access_token) {
          const expiresAt = session.expires_at;
          if (expiresAt && expiresAt * 1000 > Date.now()) {
            // Retorna objeto session válido
            return {
              access_token: session.access_token,
              expires_at: session.expires_at,
              expires_in: session.expires_in,
              refresh_token: session.refresh_token,
              token_type: session.token_type,
              user: session.user,
            };
          }
        }
      } catch (e) {
        // Ignora erro de parse
      }
    }

    return null;
  } catch (err) {
    console.error("Erro ao obter sessão sync:", err);
    return null;
  }
};

/**
 * Verifica sessão de forma INSTANTÂNEA (síncrona) via cache
 * Não bloqueia a UI
 */
export const checkSessionSync = (): boolean => {
  return getSessionSync() !== null;
};

/**
 * Verifica sessão completa de forma assíncrona (em background)
 * Atualiza o cache
 */
export const checkSessionAsync = async (): Promise<boolean> => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    const isAuthenticated = !error && !!session;

    // Atualiza cache
    sessionStorage.setItem(
      SESSION_CACHE_KEY,
      JSON.stringify({
        isAuthenticated,
        timestamp: Date.now(),
      })
    );

    return isAuthenticated;
  } catch (err) {
    console.error("Erro ao verificar sessão async:", err);
    return false;
  }
};

/**
 * Limpa o cache de sessão
 */
export const clearSessionCache = () => {
  sessionStorage.removeItem(SESSION_CACHE_KEY);
};

/**
 * Faz logout do usuário
 */
export const logout = async () => {
  try {
    clearSessionCache();
    await supabase.auth.signOut();
    window.location.href = "/login";
  } catch (err) {
    console.error("Erro ao fazer logout:", err);
    clearSessionCache();
    window.location.href = "/login";
  }
};

/**
 * Salva sessão após login bem-sucedido
 */
export const saveSessionCache = () => {
  sessionStorage.setItem(
    SESSION_CACHE_KEY,
    JSON.stringify({
      isAuthenticated: true,
      timestamp: Date.now(),
    })
  );
};

/**
 * Inicia monitoramento de sessão em background
 * Verifica periodicamente sem bloquear a UI
 */
export const startSessionMonitoring = () => {
  // Verifica a sessão real a cada 30 segundos em background
  const intervalId = setInterval(async () => {
    const isValid = await checkSessionAsync();

    if (!isValid) {
      // Sessão inválida, limpa cache
      clearSessionCache();
      // NÃO faz logout automático - apenas limpa o cache
    }
  }, 30000); // 30 segundos

  // Retorna função para limpar
  return () => {
    clearInterval(intervalId);
  };
};