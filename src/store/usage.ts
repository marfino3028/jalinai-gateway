import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '../config/env.js';
import type { Tier } from '../config/tiers.js';
import { QUOTA, currentWindowKey, type WindowType } from '../config/quota.js';

// Peta usage: `${apiKey}::${windowKey}` -> total token terpakai di window itu.
// Window lama tetap tersimpan sebagai histori; window baru = "reset" otomatis.
const usage = new Map<string, number>();
const file = join(env.DATA_DIR, 'usage.json');

export async function initUsage(): Promise<void> {
  await mkdir(env.DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(file, 'utf8');
    for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, number>)) {
      usage.set(k, v);
    }
  } catch {
    /* run pertama */
  }
}

async function persist(): Promise<void> {
  await writeFile(file, JSON.stringify(Object.fromEntries(usage)));
}

export interface UsageInfo {
  window: string;
  windowType: WindowType;
  used: number;
  limit: number;
  remaining: number;
}

export function getUsage(key: string, tier: Tier, now: Date): UsageInfo {
  const q = QUOTA[tier];
  const wkey = currentWindowKey(q.window, now);
  const used = usage.get(`${key}::${wkey}`) ?? 0;
  return {
    window: wkey,
    windowType: q.window,
    used,
    limit: q.limit,
    remaining: Math.max(0, q.limit - used),
  };
}

export async function recordUsage(
  key: string,
  tier: Tier,
  tokens: number,
  now: Date,
): Promise<void> {
  if (tokens <= 0) return;
  const q = QUOTA[tier];
  const id = `${key}::${currentWindowKey(q.window, now)}`;
  usage.set(id, (usage.get(id) ?? 0) + tokens);
  await persist();
}
