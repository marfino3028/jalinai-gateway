import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { authenticate } from './auth.js';
import { RATE_LIMIT_PER_MIN, type Tier } from '../config/tiers.js';
import { openaiError } from '../types/openai.js';

/**
 * Rate limit per API key, dengan batas menyesuaikan tier.
 * Free = 10 req/menit (default PRD), tier lebih tinggi lebih longgar.
 *
 * Catatan: hook rate-limit jalan di `onRequest` (sebelum preHandler auth),
 * jadi tier di-resolve ulang di sini lewat authenticate(req).
 */
export async function registerRateLimit(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    global: false, // aktif hanya di route yang set config.rateLimit
    timeWindow: '1 minute',
    keyGenerator: (req) => authenticate(req)?.key ?? req.ip,
    max: (req) => {
      const tier: Tier = authenticate(req)?.tier ?? 'free';
      return RATE_LIMIT_PER_MIN[tier];
    },
    errorResponseBuilder: (_req, ctx) =>
      openaiError(
        `Rate limit terlampaui. Maks ${ctx.max} request/menit untuk tier ini. Coba lagi dalam ${Math.ceil(ctx.ttl / 1000)}s.`,
        'rate_limit_error',
        'rate_limit_exceeded',
      ),
  });
}
