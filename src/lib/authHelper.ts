/**
 * Helper para criar sessão no Supabase Auth
 * Após validar senha na tabela usuarios (fluxo antigo restaurado)
 * 
 * IMPORTANTE: Esta função assume que o usuário JÁ EXISTE no auth.users
 * ou será criado automaticamente pelo trigger do banco de dados.
 * 
 * Se o usuário não existir no auth.users, a sessão não será criada
 * e será necessário criar o usuário manualmente no auth.users com a mesma senha.
 */
import { supabase } from "./supabase";

/**
 * Cria sessão no Supabase Auth usando signInWithPassword
 * Usado APENAS após validar senha na tabela public.usuarios
 * 
 * NOTA: Se o usuário não existir no auth.users, o signIn falhará.
 * Neste caso, o usuário precisa ser criado no auth.users manualmente
 * ou através de um trigger do banco de dados que sincroniza usuarios -> auth.users.
 */
export const createAuthSession = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Tenta fazer login direto (usuário deve existir no auth.users)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!signInError && signInData.session) {
      // Login bem-sucedido
      return { success: true };
    }

    // Se falhou, pode ser que:
    // 1. Usuário não existe no auth.users (precisa ser criado)
    // 2. Senha está diferente
    // 
    // Para manter compatibilidade, tenta criar o usuário no auth.users
    // APENAS para manter a sessão funcionando. Isso é necessário porque
    // o Supabase Auth requer usuário em auth.users para criar sessão.
    
    if (signInError) {
      // Se o erro é "Invalid login credentials", pode ser usuário não existe
      // ou senha incorreta. Como já validamos a senha na tabela usuarios,
      // assumimos que precisa criar no auth.users.
      
      if (signInError.message.includes("Invalid login credentials") || 
          signInError.message.includes("User not found")) {
        // Tenta criar usuário no auth.users (apenas para manter sessão)
        // NOTA: Isso é um workaround para manter a sessão do Supabase funcionando
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: undefined,
            data: {}
          }
        });

        if (signUpError) {
          // Se signUp falhou (ex: usuário já existe), tenta signIn novamente
          const { data: retrySignIn, error: retryError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (!retryError && retrySignIn.session) {
            return { success: true };
          }

          return { 
            success: false, 
            error: "Erro ao criar sessão. Por favor, tente novamente." 
          };
        }

        // Se signUp foi bem-sucedido, verifica se tem sessão
        if (signUpData.session) {
          return { success: true };
        }

        // Tenta signIn após criar
        const { data: finalSignIn, error: finalError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!finalError && finalSignIn.session) {
          return { success: true };
        }
      }

      return { 
        success: false, 
        error: "Erro ao criar sessão de autenticação. Tente novamente." 
      };
    }

    return { 
      success: false, 
      error: "Erro desconhecido ao criar sessão" 
    };
  } catch (error: any) {
    console.error("Erro ao criar sessão de autenticação:", error);
    return { 
      success: false, 
      error: error.message || "Erro desconhecido ao criar sessão" 
    };
  }
};

