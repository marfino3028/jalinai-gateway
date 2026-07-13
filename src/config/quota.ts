import { env } from './env.js';
import type { Tier } from './tiers.js';

export type WindowType = 'day' | 'month';

export interface Quota {
  limit: number; // token per window
  window: WindowType;
}

/** Kuota token per tier. Free = harian, tier berbayar = bulanan (sesuai PRD). */
export const QUOTA: Record<Tier, Quota> = {
  free: { limit: env.FREE_TOKENS_PER_DAY, window: 'day' },
  starter: { limit: env.STARTER_TOKENS_PER_MONTH, window: 'month' },
  pro: { limit: env.PRO_TOKENS_PER_MONTH, window: 'month' },
  ultimate: { limit: env.ULTIMATE_TOKENS_PER_MONTH, window: 'month' },
};

/** Harga langganan per bulan (Rupiah). */
export const PRICE_IDR: Record<Tier, number> = {
  free: 0,
  starter: env.PRICE_STARTER,
  pro: env.PRICE_PRO,
  ultimate: env.PRICE_ULTIMATE,
};

/** Kunci window saat ini (UTC): 'YYYY-MM-DD' harian atau 'YYYY-MM' bulanan. */
export function currentWindowKey(window: WindowType, now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  if (window === 'month') return `${y}-${m}`;
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Estimasi kasar token (≈ 4 karakter/token) buat fallback saat provider tak lapor usage. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
