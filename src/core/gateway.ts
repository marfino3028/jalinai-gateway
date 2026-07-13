import { getModel } from '../config/models.js';
import { tierAllows, type Tier } from '../config/tiers.js';
import { route, type RouterResult } from './router.js';
import { openaiError, type OpenAIError } from '../types/openai.js';

export interface GatewayOk {
  ok: true;
  result: RouterResult;
}
export interface GatewayErr {
  ok: false;
  status: number;
  body: OpenAIError;
}
export type GatewayOutcome = GatewayOk | GatewayErr;

/**
 * Validasi (model ada? tier boleh?) lalu teruskan ke router.
 * Tidak menyentuh objek reply — streaming/non-streaming diurus caller.
 */
export async function handleChatCompletion(
  body: Record<string, unknown>,
  userTier: Tier,
  now: number,
): Promise<GatewayOutcome> {
  const modelId = typeof body.model === 'string' ? body.model : '';
  if (!modelId) {
    return { ok: false, status: 400, body: openaiError('Field "model" wajib diisi.') };
  }

  const modelDef = getModel(modelId);
  if (!modelDef) {
    return {
      ok: false,
      status: 404,
      body: openaiError(`Model "${modelId}" tidak dikenal.`, 'invalid_request_error', 'model_not_found'),
    };
  }

  if (!tierAllows(userTier, modelDef.tier)) {
    return {
      ok: false,
      status: 403,
      body: openaiError(
        `Model "${modelId}" butuh tier "${modelDef.tier}". Tier kamu sekarang "${userTier}". Upgrade untuk akses.`,
        'permission_error',
        'tier_upgrade_required',
      ),
    };
  }

  const result = await route(modelDef, body, now);
  if (!result.response) {
    const detail = result.attempts.length
      ? result.attempts.map((a) => `${a.provider}(${a.status ?? 'err'})`).join(', ')
      : 'tidak ada provider aktif untuk model ini';
    return {
      ok: false,
      status: 502,
      body: openaiError(
        `Semua provider gagal untuk "${modelId}": ${detail}.`,
        'api_error',
        'upstream_unavailable',
      ),
    };
  }

  return { ok: true, result };
}
