import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { registerRateLimit } from './plugins/ratelimit.js';
import { chatRoutes } from './routes/chat.js';
import { modelRoutes } from './routes/models.js';
import { healthRoutes } from './routes/health.js';
import { enabledProviderIds } from './providers/registry.js';

async function main() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV === 'production'
          ? undefined
          : { target: 'pino-pretty', options: { colorize: true } },
    },
    bodyLimit: 5 * 1024 * 1024, // 5MB — cukup buat prompt panjang
  });

  await app.register(cors, { origin: true });
  await registerRateLimit(app);

  await app.register(healthRoutes);
  await app.register(chatRoutes);
  await app.register(modelRoutes);

  const active = enabledProviderIds();
  if (active.length === 0) {
    app.log.warn('⚠️  Tidak ada provider aktif! Isi minimal 1 API key di .env (mis. GROQ_API_KEY).');
  } else {
    app.log.info(`Provider aktif: ${active.join(', ')}`);
  }

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
