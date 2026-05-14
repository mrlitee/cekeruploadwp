import { ImapFlow, FetchMessageObject } from 'imapflow';
import { simpleParser } from 'mailparser';
import { config } from '../config';
import { logger } from '../utils/logger';
import { dispatch } from './dispatcher';
import { insertTx } from '../db/transactions';
import { getKV, setKV } from '../db/index';

const LAST_UID_KEY = 'last_uid';

export type OnNewTx = (tx: ReturnType<typeof dispatch>) => void;

export class ImapPoller {
  private client: ImapFlow;
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private onNewTx?: OnNewTx) {
    this.client = new ImapFlow({
      host: config.imap.host,
      port: config.imap.port,
      secure: config.imap.secure,
      auth: config.imap.auth,
      logger: false,
    });
  }

  async start() {
    await this.client.connect();
    logger.info({ user: config.imap.auth.user }, 'IMAP connected');
    this.running = true;
    // initial scan + interval polling
    await this.scanOnce();
    this.timer = setInterval(() => this.scanOnce().catch((e) => logger.error(e)), config.imap.pollInterval);
  }

  async stop() {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    try { await this.client.logout(); } catch { /* */ }
  }

  /** Scan messages with UID > last_uid in mailbox. */
  async scanOnce(): Promise<number> {
    const lock = await this.client.getMailboxLock(config.imap.mailbox);
    let imported = 0;
    try {
      const lastUid = Number(getKV(LAST_UID_KEY) || '0');
      // imapflow uses uid range like "N:*"
      const range = `${lastUid + 1}:*`;
      let maxUid = lastUid;

      for await (const msg of this.client.fetch(range, {
        uid: true,
        source: true,
        envelope: true,
        internalDate: true,
      }, { uid: true })) {
        try {
          const ok = await this.processMessage(msg);
          if (ok) imported++;
          if (Number(msg.uid) > maxUid) maxUid = Number(msg.uid);
        } catch (e) {
          logger.warn({ err: e, uid: msg.uid }, 'failed to process message');
        }
      }
      if (maxUid > lastUid) setKV(LAST_UID_KEY, String(maxUid));
      if (imported) logger.info({ imported }, 'IMAP scan done');
    } finally {
      lock.release();
    }
    return imported;
  }

  private async processMessage(msg: FetchMessageObject): Promise<boolean> {
    if (!msg.source) return false;
    const parsed = await simpleParser(msg.source);
    const fromAddr =
      (parsed.from?.value?.[0]?.address || '') + ' ' +
      (parsed.from?.text || '');
    const email = {
      uid: String(msg.uid),
      messageId: parsed.messageId,
      from: fromAddr,
      subject: parsed.subject || '',
      date: parsed.date || msg.internalDate || new Date(),
      text: parsed.text || (parsed.html ? stripHtml(parsed.html) : ''),
      html: typeof parsed.html === 'string' ? parsed.html : undefined,
    };

    const tx = dispatch(email);
    if (!tx) return false;

    const r = insertTx({
      email_uid: email.uid,
      message_id: email.messageId,
      bank: tx.bank,
      jenis: tx.jenis,
      amount: tx.amount,
      merchant: tx.merchant,
      channel: tx.channel,
      reference: tx.reference,
      occurred_at: tx.occurred_at.toISOString(),
      raw_subject: email.subject,
      raw_snippet: email.text.slice(0, 400),
    });
    if (r.inserted && this.onNewTx) this.onNewTx(tx);
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
