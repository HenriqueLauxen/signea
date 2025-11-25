export function getUserMenuPermissions(email: string) {
  if (!email) return { usuario: false, organizador: false, campus: false };

  const emailLower = email.toLowerCase();
  const fullAccessEmails = [
    "arthur.29024@aluno.iffar.edu.br",
    "henrique.09021@aluno.iffar.edu.br"
  ];

  if (fullAccessEmails.includes(emailLower)) {
    return { usuario: true, organizador: true, campus: true };
  }

  if (emailLower.endsWith("@iffarroupilha.edu.br")) {
    return { usuario: true, organizador: true, campus: true };
  }

  if (emailLower.endsWith("@aluno.iffar.edu.br")) {
    return { usuario: true, organizador: false, campus: false };
  }

  // Default: no access
  return { usuario: false, organizador: false, campus: false };
}
