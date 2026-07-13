import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '../config/env.js';
import type { Tier } from '../config/tiers.js';

export interface ApiKeyRecord {
  key: string;
  tier: Tier;
  name: string;
  createdAt: string;
  active: boolean;
}

const file = join(env.DATA_DIR, 'keys.json');
const keys = new Map<string, ApiKeyRecord>();

async function persist(): Promise<void> {
  await writeFile(file, JSON.stringify([...keys.values()], null, 2));
}

function seed(key: string, tier: Tier, name: string): void {
  if (key && !keys.has(key)) {
    keys.set(key, { key, tier, name, createdAt: new Date().toISOString(), active: true });
  }
}

/** Muat key dari JSON + seed dari env. Panggil sebelum server listen. */
export async function initKeystore(): Promise<void> {
  await mkdir(env.DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(file, 'utf8');
    for (const r of JSON.parse(raw) as ApiKeyRecord[]) keys.set(r.key, r);
  } catch {
    /* run pertama */
  }

  // Dev key default (tier ultimate) — jangan dipakai di produksi.
  seed(env.DEV_API_KEY, 'ultimate', 'dev');

  if (env.GATEWAY_API_KEYS) {
    try {
      const arr = JSON.parse(env.GATEWAY_API_KEYS) as { key: string; tier: Tier; name: string }[];
      for (const rec of arr) seed(rec.key, rec.tier, rec.name);
    } catch (err) {
      throw new Error(`GATEWAY_API_KEYS bukan JSON valid: ${(err as Error).message}`);
    }
  }
  await persist();
}

export function resolveApiKey(raw?: string): ApiKeyRecord | undefined {
  if (!raw) return undefined;
  const key = raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw.trim();
  const rec = keys.get(key);
  return rec && rec.active ? rec : undefined;
}

export function listKeys(): ApiKeyRecord[] {
  return [...keys.values()];
}

export function getKey(key: string): ApiKeyRecord | undefined {
  return keys.get(key);
}

export async function createKey(name: string, tier: Tier): Promise<ApiKeyRecord> {
  const key = `jln-${randomBytes(18).toString('base64url')}`;
  const rec: ApiKeyRecord = { key, tier, name, createdAt: new Date().toISOString(), active: true };
  keys.set(key, rec);
  await persist();
  return rec;
}

export async function setKeyTier(key: string, tier: Tier): Promise<ApiKeyRecord | undefined> {
  const rec = keys.get(key);
  if (!rec) return undefined;
  rec.tier = tier;
  await persist();
  return rec;
}

export async function revokeKey(key: string): Promise<boolean> {
  const rec = keys.get(key);
  if (!rec) return false;
  rec.active = false;
  await persist();
  return true;
}
