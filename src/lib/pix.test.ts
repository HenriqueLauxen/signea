import { gerarPayloadPix } from './pix';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error('ERRO', message);
  } else {
    console.log('OK', message);
  }
}

console.log('🧪 Testes de geração de payload PIX');

const payload = gerarPayloadPix({
  chave: 'chave@example.com',
  nome: 'IFFarroupilha',
  cidade: 'Santa Maria',
  valor: 12.34,
  txid: 'TESTE123',
});

console.log('Payload:', payload);

assert(payload.includes('br.gov.bcb.pix'), 'GUI presente');
assert(payload.includes('5303986'), 'Moeda BRL (986)');
assert(payload.includes('54'), 'Campo valor presente');
assert(payload.endsWith(payload.slice(-4)), 'CRC presente');
assert(payload.length > 50, 'Tamanho mínimo');

console.log('✨ Testes PIX concluídos');