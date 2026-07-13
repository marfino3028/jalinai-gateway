import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';
import { TIER_RANK, type Tier } from '../config/tiers.js';
import { PRICE_IDR, QUOTA } from '../config/quota.js';
import { createKey, listKeys, revokeKey, setKeyTier } from '../store/keystore.js';
import { getUsage } from '../store/usage.js';
import { listOrders, getOrder, setOrderStatus } from '../store/orders.js';
import { openaiError } from '../types/openai.js';

function requireAdmin(req: FastifyRequest, reply: FastifyReply): boolean {
  const header = req.headers['authorization'] ?? req.headers['x-admin-token'];
  const raw = Array.isArray(header) ? header[0] : header;
  const token = raw?.startsWith('Bearer ') ? raw.slice(7).trim() : raw?.trim();
  if (token !== env.ADMIN_TOKEN) {
    reply.code(401).send(openaiError('admin token tidak valid', 'authentication_error'));
    return false;
  }
  return true;
}

const isTier = (t: unknown): t is Tier => typeof t === 'string' && t in TIER_RANK;

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // Ringkasan tier + harga + kuota (buat panel super admin)
  app.get('/admin/tiers', async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return {
      data: (Object.keys(TIER_RANK) as Tier[]).map((t) => ({
        tier: t,
        priceIdr: PRICE_IDR[t],
        tokenLimit: QUOTA[t].limit,
        window: QUOTA[t].window,
      })),
    };
  });

  // ── API key CRUD ──
  app.get('/admin/keys', async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const now = new Date();
    return {
      data: listKeys().map((k) => ({
        key: k.key,
        name: k.name,
        tier: k.tier,
        active: k.active,
        createdAt: k.createdAt,
        usage: getUsage(k.key, k.tier, now),
      })),
    };
  });

  app.post('/admin/keys', async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const body = (req.body ?? {}) as { name?: string; tier?: string };
    if (!body.name) return reply.code(400).send(openaiError('field "name" wajib'));
    const tier: Tier = isTier(body.tier) ? body.tier : 'free';
    const rec = await createKey(body.name, tier);
    return reply.code(201).send(rec);
  });

  app.patch('/admin/keys/:key', async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const { key } = req.params as { key: string };
    const body = (req.body ?? {}) as { tier?: string };
    if (!isTier(body.tier)) return reply.code(400).send(openaiError('tier tidak valid'));
    const rec = await setKeyTier(key, body.tier);
    if (!rec) return reply.code(404).send(openaiError('key tidak ditemukan'));
    return rec;
  });

  app.delete('/admin/keys/:key', async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const { key } = req.params as { key: string };
    const ok = await revokeKey(key);
    if (!ok) return reply.code(404).send(openaiError('key tidak ditemukan'));
    return { revoked: key };
  });

  // ── Orders (pembayaran) ──
  app.get('/admin/orders', async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return { data: listOrders() };
  });

  // Approve manual → tandai lunas & upgrade tier key
  app.post('/admin/orders/:orderId/approve', async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const { orderId } = req.params as { orderId: string };
    const order = getOrder(orderId);
    if (!order) return reply.code(404).send(openaiError('order tidak ditemukan'));
    await setOrderStatus(orderId, 'paid');
    await setKeyTier(order.apiKey, order.tier);
    return { orderId, status: 'paid', upgradedTo: order.tier };
  });
}
