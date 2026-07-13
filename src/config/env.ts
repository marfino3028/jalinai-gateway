import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Provider keys (semua optional — provider tanpa key otomatis di-disable)
  GROQ_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_API_KEY: z.string().optional(),
  HUGGINGFACE_API_KEY: z.string().optional(),

  // Gateway client keys
  DEV_API_KEY: z.string().default('jln-dev-key'),
  GATEWAY_API_KEYS: z.string().optional(),

  // Rate limit per tier (req/menit)
  FREE_RATE_LIMIT_PER_MIN: z.coerce.number().default(10),
  STARTER_RATE_LIMIT_PER_MIN: z.coerce.number().default(60),
  PRO_RATE_LIMIT_PER_MIN: z.coerce.number().default(120),
  ULTIMATE_RATE_LIMIT_PER_MIN: z.coerce.number().default(300),
});

export const env = schema.parse(process.env);
export type Env = typeof env;
