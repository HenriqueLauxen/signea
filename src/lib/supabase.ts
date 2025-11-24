// supabase.ts
import { createClient } from '@supabase/supabase-js';

// Lendo variáveis de ambiente (para Vite)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validação para evitar erro caso as variáveis não estejam definidas
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL e Key são obrigatórias. Verifique suas variáveis de ambiente.');
}

// Criando o cliente Supabase com configurações essenciais para OTP
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
    storage: window.localStorage,
    flowType: 'pkce', // Usar PKCE flow para maior segurança
    onAuthStateChange: undefined,
  },
  global: {
    headers: {
      'X-Client-Info': '@supabase/auth-js@2',
    },
  },
});