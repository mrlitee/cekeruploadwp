import {
  default as makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  WAMessage,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';
import { handleCommand } from './commands';
import { rupiah } from '../utils/format';
import { ParsedTx, RawNotif } from '../notif/parsers/types';
import { Ingest } from '../notif/ingest';

export class WhatsAppBot {
  private sock?: WASocket;

  constructor(private ingest: Ingest) {}

  async start() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', (u) => {
      const { connection, lastDisconnect, qr } = u;
      if (qr) {
        logger.info('Scan QR via WhatsApp -> Linked Devices:');
        qrcode.generate(qr, { small: true });
      }
      if (connection === 'close') {
        const code = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;
        logger.warn({ code }, 'connection closed');
        if (shouldReconnect) this.start();
      } else if (connection === 'open') {
        logger.info('WhatsApp connected ✅');
      }
    });

    this.sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const m of messages) {
        await this.routeMessage(m).catch((e) => logger.warn({ e }, 'routeMessage err'));
      }
    });
  }

  private async routeMessage(m: WAMessage) {
    if (!m.message || m.key.fromMe) return;
    const jid = m.key.remoteJid || '';
    if (!jid.endsWith('@s.whatsapp.net')) return;

    const senderNum = jid.split('@')[0].split(':')[0];
    const text = extractText(m);
    if (!text) return;

    // 1) Pesan dari nomor bank yang di-whitelist -> ingest
    if (config.wa.bankSources.includes(senderNum)) {
      this.ingestWaMessage(senderNum, m, text);
      return;
    }

    // 2) Pesan dari owner -> jalankan command ATAU ingest jika bukan command
    if (config.wa.owners.includes(senderNum)) {
      if (text.startsWith('/')) {
        await handleCommand({
          from: jid,
          text,
          reply: async (msg) => { await this.sock!.sendMessage(jid, { text: msg }); },
        });
        return;
      }
    }

    // 3) Auto-detect: coba parse pesan dari siapa pun yang mengandung pola bank
    if (config.wa.autoDetectAll) {
      this.ingestWaMessage(senderNum, m, text);
    }
  }

  private ingestWaMessage(senderNum: string, m: WAMessage, text: string) {
    const id = crypto
      .createHash('sha1')
      .update(`wa|${senderNum}|${m.key.id}|${text}`)
      .digest('hex');
    const notif: RawNotif = {
      id,
      source: 'wa',
      app: senderNum,
      title: `WA ${senderNum}`,
      text,
      receivedAt: (Number(m.messageTimestamp) || Date.now() / 1000) * 1000,
    };
    const r = this.ingest.ingest(notif);
    if (r.inserted && r.tx) {
      this.notifyOwners(r.tx).catch(() => {});
    }
  }

  /** Push notifikasi ke semua owner saat ada transaksi baru terdeteksi. */
  async notifyOwners(tx: ParsedTx) {
    if (!this.sock) return;
    const tag = tx.jenis === 'in' ? '🟢 *Pemasukan*' : '🔴 *Pengeluaran*';
    const msg = [
      `${tag} — ${tx.bank}`,
      rupiah(tx.amount),
      tx.merchant ? `📍 ${tx.merchant}` : null,
      tx.channel ? `🔗 ${tx.channel}` : null,
      tx.reference ? `🆔 ${tx.reference}` : null,
    ].filter(Boolean).join('\n');

    for (const num of config.wa.owners) {
      const jid = `${num}@s.whatsapp.net`;
      try { await this.sock.sendMessage(jid, { text: msg }); }
      catch (e) { logger.warn({ e }, 'failed notify ' + num); }
    }
  }
}

function extractText(m: WAMessage): string {
  return (
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    ''
  );
}
