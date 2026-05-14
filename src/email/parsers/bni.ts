import { ParserFn, pickAmount, clean } from './types';

export const bni: ParserFn = (e) => {
  const fromOk = /bni\.co\.id|bni\.id/i.test(e.from);
  const subjOk = /BNI|transaksi|notifikasi/i.test(e.subject);
  if (!fromOk && !subjOk) return null;

  const text = clean(e.text || '');
  const isIn  = /(kredit|masuk|terima|setor)/i.test(text + ' ' + e.subject);
  const isOut = /(debet|debit|keluar|pembayaran|transfer|qris|pembelian)/i.test(text + ' ' + e.subject);
  const jenis: 'in' | 'out' = isIn && !isOut ? 'in' : 'out';

  const amount = pickAmount(text);
  if (!amount) return null;

  const merchantMatch =
    text.match(/(?:Merchant|Penerima|kepada|ke)\s*[:\-]?\s*([A-Z0-9 .,&'/-]{3,60})/i);
  const refMatch = text.match(/(?:Ref(?:erensi)?|Trace)[:\s#]*([A-Z0-9-]{4,})/i);

  return {
    bank: 'BNI',
    jenis,
    amount,
    merchant: merchantMatch ? clean(merchantMatch[1]) : undefined,
    reference: refMatch?.[1],
    channel: /qris/i.test(text) ? 'QRIS' : /transfer/i.test(text) ? 'TRANSFER' : undefined,
    occurred_at: e.date,
  };
};
