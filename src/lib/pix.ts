import QRCode from 'qrcode';

type PixParams = {
  chave: string;
  nome: string;
  cidade: string;
  valor: number;
  txid: string;
};

function tlv(id: string, value: string) {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16(payload: string) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021; else crc <<= 1;
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function gerarPayloadPix({ chave, nome, cidade, valor, txid }: PixParams) {
  const gui = tlv('00', 'br.gov.bcb.pix');
  const chaveTlv = tlv('01', chave);
  const desc = tlv('02', 'SIGNEA');
  const merchantAccountInfo = tlv('26', `${gui}${chaveTlv}${desc}`);

  const payloadSemCRC =
    tlv('00', '01') +
    tlv('01', '12') +
    merchantAccountInfo +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('54', valor.toFixed(2)) +
    tlv('58', 'BR') +
    tlv('59', nome.slice(0, 25)) +
    tlv('60', cidade.slice(0, 15)) +
    tlv('62', tlv('05', txid));

  const full = payloadSemCRC + '6304';
  const crc = crc16(full);
  return full + crc;
}

export async function gerarQrCodePixDataUrl(payload: string) {
  return QRCode.toDataURL(payload, { width: 300 });
}