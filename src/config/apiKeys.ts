import { env } from './env.js';
import type { Tier } from './tiers.js';

export interface ApiKeyRecord {
  key: string;
  tier: Tier;
  name: string;
}

function loadKeys(): Map<string, ApiKeyRecord> {
  const map = new Map<string, ApiKeyRecord>();

  // Dev key default → tier ultimate biar gampang testing lokal.
  // JANGAN dipakai di produksi (ganti DEV_API_KEY atau kosongkan).
  map.set(env.DEV_API_KEY, {
    key: env.DEV_API_KEY,
    tier: 'ultimate',
    name: 'dev',
  });

  if (env.GATEWAY_API_KEYS) {
    try {
      const arr = JSON.parse(env.GATEWAY_API_KEYS) as ApiKeyRecord[];
      for (const rec of arr) {
        if (rec.key && rec.tier && rec.name) map.set(rec.key, rec);
      }
    } catch (err) {
      throw new Error(`GATEWAY_API_KEYS bukan JSON valid: ${(err as Error).message}`);
    }
  }

  return map;
}

const keys = loadKeys();

export function resolveApiKey(raw?: string): ApiKeyRecord | undefined {
  if (!raw) return undefined;
  const key = raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw.trim();
  return keys.get(key);
}
