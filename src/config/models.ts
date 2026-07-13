import type { Tier } from './tiers.js';

/** Satu kandidat rute: provider mana + nama model spesifik di provider itu. */
export interface ModelRoute {
  provider: string; // id provider (lihat providers/registry.ts)
  model: string; // nama model di sisi provider
}

/** Model publik yang diekspos gateway. `routes` diurut prioritas → dipakai fallback. */
export interface ModelDef {
  id: string; // nama model yang dipanggil client
  tier: Tier; // tier minimum yang boleh akses
  routes: ModelRoute[]; // kandidat provider (load balance + fallback)
}

/**
 * Registry model publik → provider gratis.
 * Satu model bisa punya banyak rute; router muter (round-robin) & fallback
 * ke rute berikut kalau satu provider gagal/limit.
 */
export const MODELS: ModelDef[] = [
  // ── FREE ──────────────────────────────────────────────
  {
    id: 'llama-3.3-70b',
    tier: 'free',
    routes: [
      { provider: 'groq', model: 'llama-3.3-70b-versatile' },
      { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
      { provider: 'cloudflare', model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' },
    ],
  },
  {
    id: 'gemini-flash',
    tier: 'free',
    routes: [
      { provider: 'google', model: 'gemini-2.0-flash' },
      { provider: 'openrouter', model: 'google/gemini-2.0-flash-exp:free' },
    ],
  },

  // ── STARTER ───────────────────────────────────────────
  {
    id: 'qwen-2.5-72b',
    tier: 'starter',
    routes: [
      { provider: 'openrouter', model: 'qwen/qwen-2.5-72b-instruct:free' },
      { provider: 'huggingface', model: 'Qwen/Qwen2.5-72B-Instruct' },
    ],
  },
  {
    id: 'deepseek-v3',
    tier: 'starter',
    routes: [
      { provider: 'openrouter', model: 'deepseek/deepseek-chat-v3-0324:free' },
    ],
  },

  // ── PRO ───────────────────────────────────────────────
  {
    id: 'mistral-large',
    tier: 'pro',
    routes: [
      { provider: 'openrouter', model: 'mistralai/mistral-large' },
    ],
  },

  // ── ULTIMATE (model premium — provider berbayar via OpenRouter) ──
  {
    id: 'claude-opus',
    tier: 'ultimate',
    routes: [
      { provider: 'openrouter', model: 'anthropic/claude-opus-4.1' },
    ],
  },
  {
    id: 'gpt-4o',
    tier: 'ultimate',
    routes: [
      { provider: 'openrouter', model: 'openai/gpt-4o' },
    ],
  },
];

export const MODEL_BY_ID = new Map(MODELS.map((m) => [m.id, m]));

export function getModel(id: string): ModelDef | undefined {
  return MODEL_BY_ID.get(id);
}
