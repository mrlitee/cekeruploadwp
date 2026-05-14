export interface ParsedTx {
  bank: string;
  jenis: 'in' | 'out';
  amount: number;          // rupiah integer
  merchant?: string;
  channel?: string;
  reference?: string;
  occurred_at: Date;       // fall back to email date if not in body
}

export interface RawEmail {
  uid: string;
  messageId?: string;
  from: string;            // "Name <a@b>"
  subject: string;
  date: Date;
  text: string;            // plain text body (we'll prefer text over html)
  html?: string;
}

export type ParserFn = (e: RawEmail) => ParsedTx | null;

/** Helpers shared across parsers */
export function parseRupiah(s: string): number | null {
  // accepts "Rp 12.345,67", "Rp12.345", "IDR 12,345.67", "12.345"
  const m = s.match(/(?:Rp|IDR)?\s*([\d.,]+)/i);
  if (!m) return null;
  let raw = m[1];
  // if both '.' and ',' exist -> decide separator
  if (raw.includes('.') && raw.includes(',')) {
    // Indonesian: '.' thousand, ',' decimal
    raw = raw.replace(/\./g, '').replace(',', '.');
  } else if (raw.includes(',') && !raw.includes('.')) {
    // could be decimal comma
    raw = raw.replace(',', '.');
  } else {
    // only '.' or none -> assume thousands
    raw = raw.replace(/\./g, '');
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

export function pickAmount(text: string, near?: RegExp): number | null {
  if (near) {
    const win = text.match(near);
    if (win) {
      const v = parseRupiah(win[0]);
      if (v) return v;
    }
  }
  // fallback: largest rupiah amount in text
  const all = [...text.matchAll(/(?:Rp|IDR)\s*([\d.,]+)/gi)];
  if (!all.length) return null;
  const nums = all.map((m) => parseRupiah(m[0])!).filter((n) => n && n > 0);
  if (!nums.length) return null;
  return Math.max(...nums);
}

export function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}
