export interface ParsedTx {
  bank: string;            // BCA, MANDIRI, BNI, BRI, BSI, CIMB, PERMATA, JAGO, JENIUS, GOPAY, OVO, DANA, SHOPEEPAY, LINKAJA, OTHER
  jenis: 'in' | 'out';
  amount: number;          // rupiah, integer
  merchant?: string;       // nama outlet / counterparty
  channel?: string;        // QRIS, TRANSFER, DEBIT, CC, EWALLET
  reference?: string;
  occurred_at: Date;
}

export interface RawNotif {
  /** unique id (sumber+timestamp+hash) untuk anti-duplikat */
  id: string;
  /** sumber notif: 'android', 'wa', 'email', 'manual' */
  source: 'android' | 'wa' | 'email' | 'manual';
  /** package name app sumber, atau alamat email pengirim */
  app?: string;
  /** title notif Android, nama pengirim WA, atau subject email */
  title?: string;
  /** isi pesan (plain-text) */
  text: string;
  /** epoch ms saat notif diterima */
  receivedAt: number;
}

export type ParserFn = (n: RawNotif) => ParsedTx | null;

export function parseRupiah(s: string): number | null {
  const m = s.match(/(?:Rp|IDR)?\s*([\d.,]+)/i);
  if (!m) return null;
  let raw = m[1];
  if (raw.includes('.') && raw.includes(',')) {
    raw = raw.replace(/\./g, '').replace(',', '.');
  } else if (raw.includes(',') && !raw.includes('.')) {
    raw = raw.replace(',', '.');
  } else {
    raw = raw.replace(/\./g, '');
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

export function pickAmount(text: string, near?: RegExp): number | null {
  if (near) {
    const w = text.match(near);
    if (w) {
      const v = parseRupiah(w[0]);
      if (v) return v;
    }
  }
  const all = [...text.matchAll(/(?:Rp|IDR)\s*([\d.,]+)/gi)];
  if (!all.length) {
    // fallback: angka besar saja
    const big = [...text.matchAll(/\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?\b/g)];
    const nums = big.map((m) => parseRupiah(m[0])!).filter(Boolean);
    if (!nums.length) return null;
    return Math.max(...nums);
  }
  const nums = all.map((m) => parseRupiah(m[0])!).filter((n) => n && n > 0);
  if (!nums.length) return null;
  return Math.max(...nums);
}

export function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Util: deteksi jenis dari teks ID. */
export function detectJenis(text: string, fallback: 'in' | 'out' = 'out'): 'in' | 'out' {
  const t = text.toLowerCase();
  const inHit  = /(masuk|terima|kredit|received|topup|top\s*up|cashback|refund|setor)/.test(t);
  const outHit = /(keluar|bayar|payment|paid|debet|debit|transfer|qris|pembelian|tarikan|sent)/.test(t);
  if (inHit && !outHit) return 'in';
  if (outHit && !inHit) return 'out';
  return fallback;
}
