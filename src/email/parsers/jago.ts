import { ParserFn, pickAmount, clean } from './types';

export const jago: ParserFn = (e) => {
  const fromOk = /jago\.com|bankjago/i.test(e.from);
  const subjOk = /Jago|transaksi/i.test(e.subject);
  if (!fromOk && !subjOk) return null;

  const text = clean(e.text || '');
  const isIn  = /(kredit|masuk|terima|uang masuk)/i.test(text + ' ' + e.subject);
  const isOut = /(debet|debit|pembayaran|transfer|qris|pembelian|uang keluar)/i.test(text + ' ' + e.subject);
  const jenis: 'in' | 'out' = isIn && !isOut ? 'in' : 'out';

  const amount = pickAmount(text);
  if (!amount) return null;

  const merchantMatch = text.match(/(?:ke|kepada|merchant|penerima)\s*[:\-]?\s*([A-Z0-9 .,&'/-]{3,60})/i);
  const refMatch = text.match(/(?:Ref(?:erensi)?|Trace)[:\s#]*([A-Z0-9-]{4,})/i);

  return {
    bank: 'JAGO',
    jenis,
    amount,
    merchant: merchantMatch ? clean(merchantMatch[1]) : undefined,
    reference: refMatch?.[1],
    channel: /qris/i.test(text) ? 'QRIS' : /transfer/i.test(text) ? 'TRANSFER' : undefined,
    occurred_at: e.date,
  };
};
