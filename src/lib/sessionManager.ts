import { supabase } from "./supabase";

const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 minutos em milissegundos

/**
 * Verifica se existe uma sessão ativa válida
 */
export const checkSession = async (): Promise<boolean> => {
  try {
    // Primeiro verifica sessão do Supabase Auth
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      // Atualiza a atividade
      await updateActivity(session.user.email || "");
      return true;
    }

    // Se não tem sessão do Supabase, verifica sessão customizada
    const sessionToken = localStorage.getItem("session_token");
    const sessionEmail = localStorage.getItem("session_email");

    if (!sessionToken || !sessionEmail) {
      return false;
    }

    // Verifica se a sessão ainda é válida no banco usando RPC (bypassing RLS)
    const { data: usuarios, error } = await supabase
      .rpc('validate_session', {
        p_email: sessionEmail,
        p_token: sessionToken
      });

    if (error || !usuarios || usuarios.length === 0) {
      clearSession();
      return false;
    }

    const usuario = usuarios[0];

    // Verifica se o e-mail está confirmado
    if (usuario.email_confirmado === false) {
      clearSession();
      return false;
    }

    // Verifica se a sessão expirou por timeout
    const sessionExpiresAt = new Date(usuario.session_expires_at);
    const now = new Date();

    if (sessionExpiresAt < now) {
      await clearSessionInDB(sessionEmail);
      clearSession();
      return false;
    }

    // Verifica inatividade (60 minutos)
    if (usuario.last_activity_at) {
      const lastActivity = new Date(usuario.last_activity_at);
      const timeSinceLastActivity = now.getTime() - lastActivity.getTime();

      if (timeSinceLastActivity > SESSION_TIMEOUT) {
        await clearSessionInDB(sessionEmail);
        clearSession();
        return false;
      }
    }

    // Sessão válida, atualiza última atividade
    await updateActivity(sessionEmail);
    return true;
  } catch (err) {
    console.error("Erro ao verificar sessão:", err);
    return false;
  }
};

/**
 * Atualiza a última atividade do usuário
 */
export const updateActivity = async (email: string) => {
  try {
    const sessionToken = localStorage.getItem("session_token");

    if (!sessionToken) return;

    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + SESSION_TIMEOUT);

    await supabase
      .rpc('update_session_activity', {
        p_email: email,
        p_token: sessionToken
      });
  } catch (err) {
    console.error("Erro ao atualizar atividade:", err);
  }
};

/**
 * Limpa a sessão no banco de dados
 */
export const clearSessionInDB = async (email: string) => {
  try {
    await supabase
      .from("usuarios")
      .update({
        session_token: null,
        session_expires_at: null
      })
      .eq("email", email);
  } catch (err) {
    console.error("Erro ao limpar sessão no BD:", err);
  }
};

/**
 * Limpa a sessão local
 */
export const clearSession = () => {
  localStorage.removeItem("session_token");
  localStorage.removeItem("session_email");
  // Also clear any other potential auth items
  localStorage.removeItem("supabase.auth.token");
};

/**
 * Faz logout do usuário
 */
export const logout = async () => {
  try {
    const sessionEmail = localStorage.getItem("session_email");

    // Limpa sessão customizada
    if (sessionEmail) {
      await clearSessionInDB(sessionEmail);
    }

    clearSession();

    // Limpa sessão do Supabase Auth
    await supabase.auth.signOut();

    // Force reload to clear any in-memory state
    window.location.href = "/login";
  } catch (err) {
    console.error("Erro ao fazer logout:", err);
    // Force logout anyway
    clearSession();
    window.location.href = "/login";
  }
};

/**
 * Inicia monitoramento de atividade
 * Atualiza a atividade a cada 5 minutos se houver interação
 */
export const startActivityMonitoring = () => {
  let activityTimeout: NodeJS.Timeout;
  let lastUpdate = Date.now();
  const UPDATE_INTERVAL = 5 * 60 * 1000; // Atualizar no banco a cada 5 minutos

  const handleActivity = async () => {
    // Limpa o timeout de logout
    clearTimeout(activityTimeout);

    // Verifica se precisa atualizar no banco (throttle)
    const now = Date.now();
    if (now - lastUpdate > UPDATE_INTERVAL) {
      lastUpdate = now;
      const sessionEmail = localStorage.getItem("session_email");
      if (sessionEmail) {
        // Não aguarda o update para não bloquear a UI
        updateActivity(sessionEmail).catch(console.error);
      }
    }

    // Reinicia o timeout de logout
    activityTimeout = setTimeout(async () => {
      const isValid = await checkSession();
      if (!isValid) {
        window.location.href = "/login";
      }
    }, SESSION_TIMEOUT);
  };

  // Eventos que indicam atividade do usuário
  const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];

  // Usa um debounce leve para os eventos de alta frequência
  let debounceTimer: NodeJS.Timeout;
  const onUserActivity = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(handleActivity, 1000);
  };

  events.forEach(event => {
    document.addEventListener(event, onUserActivity, { passive: true });
  });

  // Inicia o timer
  handleActivity();

  // Retorna função para limpar os listeners
  return () => {
    clearTimeout(activityTimeout);
    clearTimeout(debounceTimer);
    events.forEach(event => {
      document.removeEventListener(event, onUserActivity);
    });
  };
};


