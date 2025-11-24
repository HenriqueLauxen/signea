/**
 * Testes para validação de e-mails institucionais
 * Execute este arquivo para verificar se a validação está funcionando corretamente
 */

import { isValidInstitutionalEmail, getEmailDomain, VALID_EMAIL_DOMAINS } from './emailValidation';

// Função auxiliar para testar
function testEmail(email: string, expected: boolean, description: string) {
  const result = isValidInstitutionalEmail(email);
  const status = result === expected ? 'OK' : 'ERRO';
  console.log(`${status} ${description}`);
  console.log(`   Email: "${email}" - Resultado: ${result} (Esperado: ${expected})`);
  if (result !== expected) {
    console.error('   FALHOU!');
  }
}

console.log('🧪 Iniciando testes de validação de e-mail institucional\n');
console.log(`📋 Domínios válidos configurados: ${VALID_EMAIL_DOMAINS.join(', ')}\n`);

// Testes de e-mails válidos
console.log('--- Testando e-mails VÁLIDOS ---');
testEmail('aluno@aluno.iffar.edu.br', true, 'E-mail válido com @aluno.iffar.edu.br');
testEmail('ALUNO@ALUNO.IFFAR.EDU.BR', true, 'E-mail válido em maiúsculas');
testEmail('  aluno@aluno.iffar.edu.br  ', true, 'E-mail válido com espaços');
testEmail('professor@iffarroupilha.edu.br', true, 'E-mail válido com @iffarroupilha.edu.br');
testEmail('coordenador.curso@iffarroupilhamedu.br', true, 'E-mail válido com ponto no nome');
testEmail('usuario123@aluno.iffar.edu.br', true, 'E-mail válido com números');

console.log('\n--- Testando e-mails INVÁLIDOS ---');
testEmail('aluno@gmail.com', false, 'E-mail de domínio público (gmail)');
testEmail('aluno@iffar.edu.br', false, 'E-mail sem o subdomínio correto');
testEmail('aluno@aluno.iffar.com', false, 'E-mail com extensão errada');
testEmail('', false, 'String vazia');
testEmail('   ', false, 'Apenas espaços');
testEmail('alunoaluno.iffar.edu.br', false, 'Sem @ no e-mail');
testEmail('@aluno.iffar.edu.br', false, 'Apenas o domínio');
testEmail('aluno@iffarroupilha.edu.br', false, 'Domínio incorreto');

console.log('\n--- Testando extração de domínio ---');
console.log('Domínio de "aluno@aluno.iffar.edu.br":', getEmailDomain('aluno@aluno.iffar.edu.br'));
console.log('Domínio de "professor@iffarroupilha.edu.br":', getEmailDomain('professor@iffarroupilha.edu.br'));
console.log('Domínio de "invalido":', getEmailDomain('invalido'));

console.log('\n✨ Testes concluídos!\n');
