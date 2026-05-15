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
    bankSources: req('WA_BANK_SOURCES', '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    autoDetectAll: req('WA_AUTO_DETECT', 'true') === 'true',
  },
  email: {
    enabled: req('EMAIL_ENABLED', 'true') === 'true',
    host: req('IMAP_HOST', 'imap.gmail.com'),
    port: Number(req('IMAP_PORT', '993')),
    secure: req('IMAP_TLS', 'true') === 'true',
    user: req('IMAP_USER', ''),
    pass: req('IMAP_PASS', ''),
    mailbox: req('IMAP_MAILBOX', 'INBOX'),
    pollIntervalMs: Number(req('IMAP_POLL_INTERVAL_MS', '60000')),
  },
  webhook: {
    enabled: req('WEBHOOK_ENABLED', 'false') === 'true',
    port: Number(req('WEBHOOK_PORT', '3000')),
    token: req('WEBHOOK_TOKEN', 'default-token-change-me'),
  },
  notifListener: {
    enabled: req('NOTIF_LISTENER', 'false') === 'true',
    intervalMs: Number(req('NOTIF_INTERVAL_MS', '5000')),
  },
  db: {
    path: req('DB_PATH', './data/finance.db'),
  },
  tz: req('TZ', 'Asia/Jakarta'),
};
