import 'dotenv/config';

function req(name: string, def?: string): string {
  const v = process.env[name] ?? def;
  if (v === undefined) throw new Error(`Missing env: ${name}`);
  return v;
}

export const config = {
  wa: {
    owners: req('WA_OWNERS')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    /**
     * Daftar nomor/JID resmi bank yang chat ke kamu via WA.
     * Pesan dari nomor-nomor ini akan ikut diparse sebagai sumber transaksi.
     * Contoh: 6281804500888 (BCA), 6281190001946 (BRI), dst.
     */
    bankSources: req('WA_BANK_SOURCES', '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
  webhook: {
    port: Number(req('WEBHOOK_PORT', '3000')),
    token: req('WEBHOOK_TOKEN'),
  },
  db: {
    path: req('DB_PATH', './data/finance.db'),
  },
  tz: req('TZ', 'Asia/Jakarta'),
};
