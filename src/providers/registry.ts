import { env } from '../config/env.js';
import { OpenAICompatProvider } from './base.js';

/**
 * Bangun semua provider dari env. Provider tanpa API key otomatis nggak
 * masuk registry (enabled=false), jadi router bakal skip.
 */
function buildProviders(): Map<string, OpenAICompatProvider> {
  const list: OpenAICompatProvider[] = [
    new OpenAICompatProvider({
      id: 'groq',
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: env.GROQ_API_KEY,
    }),
    new OpenAICompatProvider({
      id: 'google',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: env.GOOGLE_API_KEY,
    }),
    new OpenAICompatProvider({
      id: 'openrouter',
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: env.OPENROUTER_API_KEY,
      extraHeaders: {
        'HTTP-Referer': 'https://jalin.ai',
        'X-Title': 'Jalin.AI Gateway',
      },
    }),
    new OpenAICompatProvider({
      id: 'cloudflare',
      // Cloudflare Workers AI OpenAI-compat butuh account id di path.
      baseURL: env.CLOUDFLARE_ACCOUNT_ID
        ? `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`
        : 'https://api.cloudflare.com/client/v4/accounts/_/ai/v1',
      apiKey: env.CLOUDFLARE_API_KEY,
    }),
    new OpenAICompatProvider({
      id: 'huggingface',
      baseURL: 'https://router.huggingface.co/v1',
      apiKey: env.HUGGINGFACE_API_KEY,
    }),
  ];

  const map = new Map<string, OpenAICompatProvider>();
  for (const p of list) map.set(p.id, p);
  return map;
}

const providers = buildProviders();

export function getProvider(id: string): OpenAICompatProvider | undefined {
  return providers.get(id);
}

export function enabledProviderIds(): string[] {
  return [...providers.values()].filter((p) => p.enabled).map((p) => p.id);
}
