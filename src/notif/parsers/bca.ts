import { ParserFn, pickAmount, clean, detectJenis } from './types';

// Dipakai untuk:
// - Notif Android dari app BCA mobile / myBCA / blu by BCA
// - Pesan WA dari "BCA" (nomor resmi BCA WhatsApp)
//
// Pola umum:
// "Transfer ke BCA 1234******5678 a.n. JOHN DOE Rp 250.000"
// "QRIS di MERCHANT XYZ Rp 25.000"
// "Penarikan tunai ATM Rp 500.000"
// "Setoran tunai Rp 1.000.000"
// "Pembayaran TOKOPEDIA Rp 199.000"
const ID_HINTS = /(BCA|myBCA|blu|HaloBCA)/i;
const APP_HINTS = /(bca|blu)/i;

export const bca: ParserFn = (n) => {
  const haystack = `${n.title || ''} ${n.text}`;
  const fromBca = ID_HINTS.test(haystack) || (n.app ? APP_HINTS.test(n.app) : false);
  if (!fromBca) return null;

  const text = clean(n.text);
  const amount = pickAmount(text, /(?:Rp|IDR)\s*[\d.,]+/i);
  if (!amount) return null;

  const jenis = detectJenis(text + ' ' + (n.title || ''));

  // Merchant ekstraksi:
  //  - "QRIS di <NAMA>"
  //  - "ke <NAMA>" / "kepada <NAMA>"
  //  - "Pembayaran <NAMA>"
  const merchantMatch =
    text.match(/QRIS\s+(?:di\s+)?([A-Z0-9 .,&'/-]{3,60})/i) ||
    text.match(/(?:ke|kepada)\s+([A-Z0-9 .,&'/-]{3,60})/i) ||
    text.match(/Pembayaran\s+([A-Z0-9 .,&'/-]{3,60})/i) ||
    text.match(/Transfer\s+(?:ke\s+)?(?:BCA|BANK)?\s*[0-9*\s]*?a\.?n\.?\s+([A-Z0-9 .'-]{3,60})/i);

  const refMatch = text.match(/(?:ref(?:erensi)?|trace|no\.?\s*ref)[:\s#]*([A-Z0-9-]{4,})/i);

  const channel = /qris/i.test(text) ? 'QRIS'
                : /transfer/i.test(text) ? 'TRANSFER'
                : /atm|tarikan/i.test(text) ? 'ATM'
                : /setoran/i.test(text) ? 'SETOR'
                : /pembayaran/i.test(text) ? 'PAYMENT'
                : undefined;

  return {
    bank: 'BCA',
    jenis,
    amount,
    merchant: merchantMatch ? clean(merchantMatch[1]).slice(0, 80) : undefined,
    reference: refMatch?.[1],
    channel,
    occurred_at: new Date(n.receivedAt),
  };
};
