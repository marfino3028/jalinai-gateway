import type { FastifyInstance } from 'fastify';
import { requireApiKey } from '../plugins/auth.js';
import { getUsage } from '../store/usage.js';
import { PRICE_IDR } from '../config/quota.js';

/** GET /v1/usage — client lihat pemakaian token & sisa kuota tier-nya. */
export async function usageRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/usage', { preHandler: requireApiKey }, async (req) => {
    const rec = req.apiKey!;
    const u = getUsage(rec.key, rec.tier, new Date());
    return {
      name: rec.name,
      tier: rec.tier,
      priceIdr: PRICE_IDR[rec.tier],
      window: u.window,
      windowType: u.windowType,
      tokensUsed: u.used,
      tokensLimit: u.limit,
      tokensRemaining: u.remaining,
    };
  });
}
