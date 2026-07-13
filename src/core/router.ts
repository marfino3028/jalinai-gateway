import type { ModelDef, ModelRoute } from '../config/models.js';
import { getProvider } from '../providers/registry.js';

/** Cooldown sederhana per provider: kalau gagal, di-skip sementara. */
const COOLDOWN_MS = 30_000;
const cooldownUntil = new Map<string, number>();

// Counter round-robin per model (in-memory). Fase 4/3 bisa pindah ke Redis.
const rrCursor = new Map<string, number>();

function isCoolingDown(providerId: string, now: number): boolean {
  const until = cooldownUntil.get(providerId);
  return until !== undefined && until > now;
}

function markFailed(providerId: string, now: number): void {
  cooldownUntil.set(providerId, now + COOLDOWN_MS);
}

function markOk(providerId: string): void {
  cooldownUntil.delete(providerId);
}

export interface RouteAttempt {
  provider: string;
  model: string;
  ok: boolean;
  status?: number;
  error?: string;
}

export interface RouterResult {
  response?: Response; // hanya di-set kalau ada rute yang sukses
  servedBy?: string; // provider id yang berhasil
  attempts: RouteAttempt[];
}

/**
 * Pilih & panggil provider untuk sebuah model, dengan load-balancing
 * (round-robin titik-mulai) + fallback berurutan ke rute lain saat gagal.
 */
export async function route(
  modelDef: ModelDef,
  body: Record<string, unknown>,
  now: number,
): Promise<RouterResult> {
  const attempts: RouteAttempt[] = [];

  // Hanya rute yang provider-nya aktif.
  const candidates: ModelRoute[] = modelDef.routes.filter((r) => {
    const p = getProvider(r.provider);
    return p?.enabled;
  });

  if (candidates.length === 0) {
    return { attempts };
  }

  // Round-robin: geser titik-mulai tiap request biar beban nyebar.
  const start = (rrCursor.get(modelDef.id) ?? 0) % candidates.length;
  rrCursor.set(modelDef.id, start + 1);
  const ordered = [...candidates.slice(start), ...candidates.slice(0, start)];

  // Dahulukan yang tidak sedang cooldown, tapi tetap simpan sisanya sbagai cadangan.
  const fresh = ordered.filter((r) => !isCoolingDown(r.provider, now));
  const cooling = ordered.filter((r) => isCoolingDown(r.provider, now));
  const tryOrder = [...fresh, ...cooling];

  for (const r of tryOrder) {
    const provider = getProvider(r.provider)!;
    const attemptBody = { ...body, model: r.model };
    try {
      const res = await provider.chat(attemptBody);
      if (res.ok) {
        markOk(r.provider);
        attempts.push({ provider: r.provider, model: r.model, ok: true, status: res.status });
        return { response: res, servedBy: r.provider, attempts };
      }
      // Non-2xx → catat, cooldown, lanjut fallback.
      markFailed(r.provider, now);
      const text = await res.text().catch(() => '');
      attempts.push({
        provider: r.provider,
        model: r.model,
        ok: false,
        status: res.status,
        error: text.slice(0, 300),
      });
    } catch (err) {
      markFailed(r.provider, now);
      attempts.push({
        provider: r.provider,
        model: r.model,
        ok: false,
        error: (err as Error).message,
      });
    }
  }

  return { attempts };
}
