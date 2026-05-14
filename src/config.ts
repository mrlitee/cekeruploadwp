import 'dotenv/config';

function req(name: string, def?: string): string {
  const v = process.env[name] ?? def;
  if (v === undefined) throw new Error(`Missing env: ${name}`);
  return v;
}

export const config = {
  imap: {
    host: req('IMAP_HOST'),
    port: Number(req('IMAP_PORT', '993')),
    secure: req('IMAP_TLS', 'true') === 'true',
    auth: {
      user: req('IMAP_USER'),
      pass: req('IMAP_PASS'),
    },
    mailbox: req('IMAP_MAILBOX', 'INBOX'),
    pollInterval: Number(req('IMAP_POLL_INTERVAL', '60')) * 1000,
  },
  wa: {
    owners: req('WA_OWNERS')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
  db: {
    path: req('DB_PATH', './data/finance.db'),
  },
  tz: req('TZ', 'Asia/Jakarta'),
};
