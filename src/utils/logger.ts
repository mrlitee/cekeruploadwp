import pino from 'pino';

// Pino default sync stdout writer — kompatibel dengan Termux/Android
// (transport worker thread sering bermasalah di sana).
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: undefined,
  timestamp: () => `,"t":"${new Date().toISOString()}"`,
});
