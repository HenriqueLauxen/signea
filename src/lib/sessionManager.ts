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

    // Verifica se a sessão ainda é válida no banco
    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select("session_token, session_expires_at, last_activity_at, email_confirmado")
      .eq("email", sessionEmail)
      .eq("session_token", sessionToken)
      .single();

    if (error || !usuario) {
      clearSession();
      return false;
    }

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
      .from("usuarios")
      .update({
        last_activity_at: now.toISOString(),
        session_expires_at: newExpiresAt.toISOString()
      })
      .eq("email", email)
      .eq("session_token", sessionToken);
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
  } catch (err) {
    console.error("Erro ao fazer logout:", err);
  }
};

/**
 * Inicia monitoramento de atividade
 * Atualiza a atividade a cada 5 minutos se houver interação
 */
export const startActivityMonitoring = () => {
  let activityTimeout: NodeJS.Timeout;

  const resetActivityTimer = async () => {
    clearTimeout(activityTimeout);
    
    const sessionEmail = localStorage.getItem("session_email");
    if (sessionEmail) {
      await updateActivity(sessionEmail);
    }

    // Define timeout para verificar inatividade
    activityTimeout = setTimeout(async () => {
      const isValid = await checkSession();
      if (!isValid) {
        window.location.href = "/login";
      }
    }, SESSION_TIMEOUT);
  };

  // Eventos que indicam atividade do usuário
  const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
  
  events.forEach(event => {
    document.addEventListener(event, resetActivityTimer, { passive: true });
  });

  // Inicia o timer
  resetActivityTimer();

  // Retorna função para limpar os listeners
  return () => {
    clearTimeout(activityTimeout);
    events.forEach(event => {
      document.removeEventListener(event, resetActivityTimer);
    });
  };
};

