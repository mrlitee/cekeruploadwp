import Fastify from 'fastify';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Ingest } from './ingest';
import { RawNotif } from './parsers/types';

export async function startWebhookServer(ingest: Ingest) {
  const app = Fastify({ logger: false, bodyLimit: 1024 * 1024 });

  app.addHook('onRequest', async (req, reply) => {
    if (req.url === '/health') return;
    const auth = req.headers['authorization'] || '';
    const token = String(auth).replace(/^Bearer\s+/i, '').trim();
    if (!token || token !== config.webhook.token) {
      reply.code(401).send({ error: 'unauthorized' });
    }
  });

  app.get('/health', async () => ({ ok: true }));

  /**
   * POST /notif
   * body: {
   *   source?: 'android' | 'wa' | 'manual',
   *   app?: string,
   *   title?: string,
   *   text: string,
   *   receivedAt?: number
   * }
   */
  app.post('/notif', async (req, reply) => {
    const b = req.body as Partial<RawNotif>;
    if (!b || typeof b.text !== 'string' || !b.text.trim()) {
      return reply.code(400).send({ error: 'text required' });
    }
    const n: RawNotif = {
      id: b.id || '',
      source: (b.source as RawNotif['source']) || 'android',
      app: b.app,
      title: b.title,
      text: b.text,
      receivedAt: typeof b.receivedAt === 'number' ? b.receivedAt : Date.now(),
    };
    const r = ingest.ingest(n);
    return reply.send(r);
  });

  app.post('/notif/batch', async (req, reply) => {
    const list = (req.body as Partial<RawNotif>[]) || [];
    if (!Array.isArray(list)) return reply.code(400).send({ error: 'array required' });
    const results = list.map((b) => {
      if (!b || typeof b.text !== 'string') return { matched: false, inserted: false };
      return ingest.ingest({
        id: b.id || '',
        source: (b.source as RawNotif['source']) || 'android',
        app: b.app,
        title: b.title,
        text: b.text,
        receivedAt: typeof b.receivedAt === 'number' ? b.receivedAt : Date.now(),
      });
    });
    return reply.send({ count: results.length, results });
  });

  await app.listen({ host: '0.0.0.0', port: config.webhook.port });
  logger.info({ port: config.webhook.port }, 'webhook server listening');
  return app;
}
