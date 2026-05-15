import { WhatsAppBot } from './whatsapp/bot';
import { Ingest } from './notif/ingest';
import { startWebhookServer } from './notif/server';
import { startNotifListener, stopNotifListener } from './notif/android-listener';
import { config } from './config';
import { logger } from './utils/logger';

async function main() {
  let bot: WhatsAppBot;

  // Ingest service: satu-satunya pintu masuk transaksi.
  const ingest = new Ingest((tx) => {
    bot?.notifyOwners(tx).catch(() => {});
  });

  bot = new WhatsAppBot(ingest);

  // 1) Start WhatsApp bot (sumber utama: self-listen pesan WA bank)
  await bot.start();

  // 2) Start Android Notification Listener (termux-api, opsional)
  if (config.notifListener.enabled) {
    startNotifListener(ingest, config.notifListener.intervalMs);
  }

  // 3) Start webhook server (opsional, untuk advanced user / MacroDroid)
  if (config.webhook.enabled) {
    await startWebhookServer(ingest);
  }

  logger.info('Bot aktif. Sumber notif:');
  logger.info('  ✅ WhatsApp self-listen (otomatis)');
  if (config.notifListener.enabled) {
    logger.info('  ✅ Android notification listener (termux-api)');
  }
  if (config.webhook.enabled) {
    logger.info(`  ✅ Webhook server di port ${config.webhook.port}`);
  }

  process.on('SIGINT', () => {
    logger.info('shutting down…');
    stopNotifListener();
    process.exit(0);
  });
}

main().catch((e) => {
  logger.error(e, 'fatal');
  process.exit(1);
});
