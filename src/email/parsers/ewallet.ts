import { ParserFn, pickAmount, clean } from './types';

// E-wallet umumnya juga kirim email resi: GoPay, OVO, Dana, ShopeePay, LinkAja.
export const ewallet: ParserFn = (e) => {
  const map: Array<[RegExp, string]> = [
    [/gopay|gojek/i, 'GOPAY'],
    [/ovo/i, 'OVO'],
    [/dana\.id|dana@/i, 'DANA'],
    [/shopeepay|shopee\.co\.id/i, 'SHOPEEPAY'],
    [/linkaja/i, 'LINKAJA'],
  ];
  const hit = map.find(([re]) => re.test(e.from) || re.test(e.subject));
  if (!hit) return null;
  const bank = hit[1];

  const text = clean(e.text || '');
  const isIn  = /(masuk|terima|top\s*up|received|cashback|refund)/i.test(text + ' ' + e.subject);
  const isOut = /(bayar|payment|paid|keluar|transfer|qris|pembelian|sent)/i.test(text + ' ' + e.subject);
  const jenis: 'in' | 'out' = isIn && !isOut ? 'in' : 'out';

  const amount = pickAmount(text);
  if (!amount) return null;

  const merchantMatch =
    text.match(/(?:Merchant|to|ke|Penjual|Outlet|Toko)\s*[:\-]?\s*([A-Z0-9 .,&'/-]{3,60})/i);
  const refMatch = text.match(/(?:Order|Transaction|Trx|Ref)\s*ID?\s*[:#]?\s*([A-Z0-9-]{6,})/i);

  return {
    bank,
    jenis,
    amount,
    merchant: merchantMatch ? clean(merchantMatch[1]) : undefined,
    reference: refMatch?.[1],
    channel: 'EWALLET',
    occurred_at: e.date,
  };
};
