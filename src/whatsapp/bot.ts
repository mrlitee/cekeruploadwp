import {
  default as makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { config } from '../config';
import { logger } from '../utils/logger';
import { handleCommand } from './commands';
import { rupiah } from '../utils/format';
import { ParsedTx } from '../email/parsers/types';

export class WhatsAppBot {
  private sock?: WASocket;

  constructor(private triggerSync: () => Promise<number>) {}

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
        logger.info('Scan QR code dengan WhatsApp -> Linked Devices:');
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
        if (!m.message || m.key.fromMe) continue;
        const jid = m.key.remoteJid || '';
        const senderNum = jid.split('@')[0].split(':')[0];
        if (!config.wa.owners.includes(senderNum)) continue; // hanya owner

        const text =
          m.message.conversation ||
          m.message.extendedTextMessage?.text ||
          m.message.imageMessage?.caption ||
          '';
        if (!text) continue;

        await handleCommand({
          from: jid,
          text,
          reply: async (msg) => {
            await this.sock!.sendMessage(jid, { text: msg });
          },
          triggerSync: this.triggerSync,
        });
      }
    });
  }

  /** Push notifikasi ke semua owner saat ada transaksi baru ter-import dari email. */
  async notifyOwners(tx: ParsedTx) {
    if (!this.sock) return;
    const tag = tx.jenis === 'in' ? '🟢 *Pemasukan*' : '🔴 *Pengeluaran*';
    const msg = [
      tag + ` — ${tx.bank}`,
      `${rupiah(tx.amount)}`,
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
