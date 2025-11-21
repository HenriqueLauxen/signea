/**
 * Domínios de e-mail institucionais permitidos no sistema
 */
export const VALID_EMAIL_DOMAINS = [
  '@aluno.iffar.edu.br',
  '@iffarroupilha.edu.br'
] as const;

/**
 * Valida se um e-mail pertence a um dos domínios institucionais permitidos
 * @param email - O e-mail a ser validado
 * @returns true se o e-mail for válido, false caso contrário
 */
export function isValidInstitutionalEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const normalizedEmail = email.toLowerCase().trim();
  
  return VALID_EMAIL_DOMAINS.some(domain => 
    normalizedEmail.endsWith(domain)
  );
}

/**
 * Retorna uma mensagem de erro formatada com os domínios permitidos
 */
export function getEmailValidationErrorMessage(): string {
  const domains = VALID_EMAIL_DOMAINS.join(' ou ');
  return `Apenas e-mails institucionais (${domains}) são permitidos`;
}

/**
 * Extrai o domínio de um e-mail
 * @param email - O e-mail
 * @returns O domínio (incluindo @) ou null se inválido
 */
export function getEmailDomain(email: string): string | null {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) {
    return null;
  }

  return email.substring(atIndex).toLowerCase();
}
