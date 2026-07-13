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

  // ── Fase 4: penyimpanan, kuota token, harga, payment ──
  DATA_DIR: z.string().default('./data'),
  ADMIN_TOKEN: z.string().default('jln-admin-dev'),

  // Kuota token per tier (free = harian, sisanya = bulanan)
  FREE_TOKENS_PER_DAY: z.coerce.number().default(10_000),
  STARTER_TOKENS_PER_MONTH: z.coerce.number().default(50_000_000),
  PRO_TOKENS_PER_MONTH: z.coerce.number().default(100_000_000),
  ULTIMATE_TOKENS_PER_MONTH: z.coerce.number().default(200_000_000),

  // Harga langganan (Rupiah / bulan)
  PRICE_STARTER: z.coerce.number().default(15_000),
  PRICE_PRO: z.coerce.number().default(25_000),
  PRICE_ULTIMATE: z.coerce.number().default(50_000),

  // Payment: 'manual' (super admin approve) atau 'midtrans' (Snap)
  PAYMENT_PROVIDER: z.enum(['manual', 'midtrans']).default('manual'),
  MIDTRANS_SERVER_KEY: z.string().optional(),
  MIDTRANS_IS_PRODUCTION: z.coerce.boolean().default(false),
  APP_BASE_URL: z.string().default('http://localhost:8080'),
});

export const env = schema.parse(process.env);
export type Env = typeof env;
