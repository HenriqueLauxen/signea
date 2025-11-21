// supabase.ts
import { createClient } from '@supabase/supabase-js';

// Lendo variáveis de ambiente (para Vite)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validação para evitar erro caso as variáveis não estejam definidas
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL e Key são obrigatórias. Verifique suas variáveis de ambiente.');
}

// Criando o cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);