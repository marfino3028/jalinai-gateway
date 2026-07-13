import type { FastifyInstance } from 'fastify';
import { requireApiKey } from '../plugins/auth.js';
import { MODELS } from '../config/models.js';
import { tierAllows } from '../config/tiers.js';
import { enabledProviderIds } from '../providers/registry.js';

/** GET /v1/models — daftar model ala OpenAI, difilter sesuai tier pemakai. */
export async function modelRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/models', { preHandler: requireApiKey }, async (req) => {
    const tier = req.apiKey!.tier;
    const active = new Set(enabledProviderIds());

    const data = MODELS.filter((m) => tierAllows(tier, m.tier)).map((m) => ({
      id: m.id,
      object: 'model',
      owned_by: 'jalin.ai',
      tier: m.tier,
      // hanya rute yang provider-nya benar-benar aktif (punya API key)
      providers: m.routes.map((r) => r.provider).filter((p) => active.has(p)),
    }));

    return { object: 'list', data };
  });
}
