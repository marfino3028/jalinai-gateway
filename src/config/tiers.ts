import { env } from './env.js';

export type Tier = 'free' | 'starter' | 'pro' | 'ultimate';

/** Urutan tier — dipakai buat cek "apakah tier X boleh akses model tier Y". */
export const TIER_RANK: Record<Tier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  ultimate: 3,
};

export function tierAllows(userTier: Tier, modelMinTier: Tier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[modelMinTier];
}

export const RATE_LIMIT_PER_MIN: Record<Tier, number> = {
  free: env.FREE_RATE_LIMIT_PER_MIN,
  starter: env.STARTER_RATE_LIMIT_PER_MIN,
  pro: env.PRO_RATE_LIMIT_PER_MIN,
  ultimate: env.ULTIMATE_RATE_LIMIT_PER_MIN,
};
