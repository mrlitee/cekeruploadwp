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
     * Kosongkan kalau belum ada - bot tetap auto-detect semua pesan
     * yang cocok pola bank dari chat manapun.
     */
    bankSources: req('WA_BANK_SOURCES', '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    /**
     * Kalau true, bot juga auto-detect pesan yang mengandung pola
     * transaksi bank dari semua chat yang masuk (tidak hanya dari nomor
     * yang ada di bankSources). Berguna kalau kamu forward notif manual.
     */
    autoDetectAll: req('WA_AUTO_DETECT', 'true') === 'true',
  },
  webhook: {
    enabled: req('WEBHOOK_ENABLED', 'false') === 'true',
    port: Number(req('WEBHOOK_PORT', '3000')),
    token: req('WEBHOOK_TOKEN', 'default-token-change-me'),
  },
  notifListener: {
    enabled: req('NOTIF_LISTENER', 'true') === 'true',
    intervalMs: Number(req('NOTIF_INTERVAL_MS', '5000')),
  },
  db: {
    path: req('DB_PATH', './data/finance.db'),
  },
  tz: req('TZ', 'Asia/Jakarta'),
};
