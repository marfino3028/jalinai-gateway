import type { FastifyInstance } from 'fastify';
import { enabledProviderIds } from '../providers/registry.js';

/** GET /health — publik, buat uptime check & lihat provider aktif. */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    const providers = enabledProviderIds();
    return {
      status: 'ok',
      service: 'jalinai-gateway',
      providersActive: providers.length,
      providers,
    };
  });
}
