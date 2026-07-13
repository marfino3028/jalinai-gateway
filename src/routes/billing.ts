import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { requireApiKey } from '../plugins/auth.js';
import { TIER_RANK, type Tier } from '../config/tiers.js';
import { PRICE_IDR } from '../config/quota.js';
import { createOrder, getOrder, setOrderStatus } from '../store/orders.js';
import { setKeyTier } from '../store/keystore.js';
import { getPaymentProvider } from '../billing/index.js';
import { openaiError } from '../types/openai.js';

const isTier = (t: unknown): t is Tier => typeof t === 'string' && t in TIER_RANK;

export async function billingRoutes(app: FastifyInstance): Promise<void> {
  // Client mulai upgrade tier → dapat instruksi/URL pembayaran
  app.post('/v1/billing/checkout', { preHandler: requireApiKey }, async (req, reply) => {
    const rec = req.apiKey!;
    const body = (req.body ?? {}) as { tier?: string };
    if (!isTier(body.tier)) return reply.code(400).send(openaiError('tier tidak valid'));
    if (body.tier === 'free') return reply.code(400).send(openaiError('tier free tidak berbayar'));
    if (TIER_RANK[body.tier] <= TIER_RANK[rec.tier]) {
      return reply.code(400).send(openaiError(`tier "${body.tier}" bukan upgrade dari "${rec.tier}"`));
    }

    const orderId = `JLN-${Date.now()}-${randomBytes(3).toString('hex')}`;
    const amount = PRICE_IDR[body.tier];
    await createOrder({
      orderId,
      apiKey: rec.key,
      tier: body.tier,
      amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    try {
      const result = await getPaymentProvider().createCheckout({
        orderId,
        amount,
        tier: body.tier,
        customerName: rec.name,
      });
      return reply.code(201).send(result);
    } catch (err) {
      await setOrderStatus(orderId, 'failed');
      return reply.code(502).send(openaiError(`checkout gagal: ${(err as Error).message}`, 'api_error'));
    }
  });

  // Webhook payment gateway (publik). Midtrans POST ke sini saat status berubah.
  app.post('/billing/webhook', async (req, reply) => {
    const result = await getPaymentProvider().verifyWebhook(
      (req.body ?? {}) as Record<string, unknown>,
      req.headers,
    );
    if (!result) return reply.code(400).send({ ok: false, reason: 'invalid webhook' });

    const order = getOrder(result.orderId);
    if (!order) return reply.code(404).send({ ok: false, reason: 'order tidak ditemukan' });

    if (result.paid && order.status !== 'paid') {
      await setOrderStatus(order.orderId, 'paid');
      await setKeyTier(order.apiKey, order.tier);
      req.log.info({ orderId: order.orderId, tier: order.tier }, 'pembayaran sukses, tier di-upgrade');
    }
    return { ok: true };
  });
}
