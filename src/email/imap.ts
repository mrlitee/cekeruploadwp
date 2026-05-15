import { ImapFlow, FetchMessageObject } from 'imapflow';
import { simpleParser } from 'mailparser';
import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Ingest } from '../notif/ingest';
import { RawNotif } from '../notif/parsers/types';
import { getKV, setKV } from '../db/index';

const LAST_UID_KEY = 'imap_last_uid';

/**
 * IMAP Email Poller
 *
 * Mengambil email baru dari mailbox (default INBOX), parse,
 * lalu kirim ke ingest service. Anti-duplikat via UID + Message-ID.
 *
 * Cara pakai:
 * - Operator setup 1x: Gmail App Password atau IMAP credential
 * - User bisa pakai inbox yang sama (yang sudah dapat notif email bank)
 * - Atau forward semua email bank ke inbox khusus bot
 */
export class ImapPoller {
  private client?: ImapFlow;
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private ingest: Ingest) {}

  async start() {
    if (!config.email.enabled) {
      logger.info('Email IMAP listener disabled');
      return;
    }

    this.client = new ImapFlow({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: { user: config.email.user, pass: config.email.pass },
      logger: false,
    });

    try {
      await this.client.connect();
      logger.info({ user: config.email.user, host: config.email.host }, 'IMAP connected ✅');
    } catch (e: any) {
      logger.error({ err: e?.message }, 'IMAP connect failed');
      return;
    }

    this.running = true;
    await this.scanOnce();
    this.timer = setInterval(
      () => this.scanOnce().catch((e) => logger.warn({ err: e?.message }, 'imap scan err')),
      config.email.pollIntervalMs,
    );
  }

  async stop() {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    try { await this.client?.logout(); } catch { /* */ }
  }

  /** Tarik email baru (UID > last_uid). */
  async scanOnce(): Promise<number> {
    if (!this.client) return 0;
    let imported = 0;
    const lock = await this.client.getMailboxLock(config.email.mailbox);
    try {
      const lastUid = Number(getKV(LAST_UID_KEY) || '0');
      const range = `${lastUid + 1}:*`;
      let maxUid = lastUid;

      for await (const msg of this.client.fetch(range, {
        uid: true,
        source: true,
        envelope: true,
        internalDate: true,
      }, { uid: true })) {
        try {
          if (await this.processMessage(msg)) imported++;
          if (Number(msg.uid) > maxUid) maxUid = Number(msg.uid);
        } catch (e: any) {
          logger.warn({ uid: msg.uid, err: e?.message }, 'failed processing email');
        }
      }
      if (maxUid > lastUid) setKV(LAST_UID_KEY, String(maxUid));
      if (imported) logger.info({ imported }, 'email scan done');
    } finally {
      lock.release();
    }
    return imported;
  }

  private async processMessage(msg: FetchMessageObject): Promise<boolean> {
    if (!msg.source) return false;
    const parsed = await simpleParser(msg.source);

    const fromAddr =
      (parsed.from?.value?.[0]?.address || '') +
      (parsed.from?.text ? ` ${parsed.from.text}` : '');

    const subject = parsed.subject || '';
    const date = parsed.date || msg.internalDate || new Date();
    const text =
      parsed.text ||
      (typeof parsed.html === 'string' ? stripHtml(parsed.html) : '') ||
      '';

    if (!text.trim()) return false;

    // Hash unik supaya anti-duplikat lintas re-scan
    const id = crypto
      .createHash('sha1')
      .update(`email|${parsed.messageId || msg.uid}|${fromAddr}|${subject}`)
      .digest('hex');

    const notif: RawNotif = {
      id,
      source: 'email',
      app: fromAddr,
      title: subject,
      // Gabungkan subject + body supaya parser punya kontex bank yang cukup
      text: `${subject}\n\n${text}`,
      receivedAt: date.getTime(),
    };

    const r = this.ingest.ingest(notif);
    if (r.inserted) {
      logger.info(
        { bank: r.tx?.bank, amount: r.tx?.amount, merchant: r.tx?.merchant },
        'Transaksi terdeteksi dari email',
      );
    }
    return r.inserted;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
