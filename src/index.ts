import { WhatsAppBot } from './whatsapp/bot';
import { Ingest } from './notif/ingest';
import { startWebhookServer } from './notif/server';
import { startNotifListener, stopNotifListener } from './notif/android-listener';
import { ImapPoller } from './email/imap';
import { config } from './config';
import { logger } from './utils/logger';

async function main() {
  let bot: WhatsAppBot;

  const ingest = new Ingest((tx) => {
    bot?.notifyOwners(tx).catch(() => {});
  });

  bot = new WhatsAppBot(ingest);

  // Sumber #1: WhatsApp (untuk command + listen pesan WA bank kalau ada)
  await bot.start();

  // Sumber #2: EMAIL IMAP — ini sumber utama untuk auto-detect transaksi
  const imap = new ImapPoller(ingest);
  if (config.email.enabled && config.email.user && config.email.pass) {
    await imap.start();
  } else if (config.email.enabled) {
    logger.warn('EMAIL_ENABLED=true tapi IMAP_USER/IMAP_PASS belum diisi → dilewati');
  }

  // Sumber #3 (opsional): Android notification listener via Termux:API
  if (config.notifListener.enabled) {
    startNotifListener(ingest, config.notifListener.intervalMs);
  }

  // Sumber #4 (opsional): Webhook untuk MacroDroid/Tasker
  if (config.webhook.enabled) {
    await startWebhookServer(ingest);
  }

  logger.info('Bot aktif. Sumber transaksi:');
  logger.info('  ✅ WhatsApp (command + self-listen)');
  if (config.email.enabled && config.email.user) logger.info(`  ✅ Email IMAP (${config.email.user})`);
  if (config.notifListener.enabled) logger.info('  ✅ Android notification listener');
  if (config.webhook.enabled) logger.info(`  ✅ Webhook port ${config.webhook.port}`);

  process.on('SIGINT', () => {
    logger.info('shutting down…');
    stopNotifListener();
    imap.stop().catch(() => {});
    process.exit(0);
  });
}

main().catch((e) => {
  logger.error(e, 'fatal');
  process.exit(1);
});
