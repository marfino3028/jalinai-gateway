# Jalin.AI — AI Gateway (Fase 1)

Unified **OpenAI-compatible** AI gateway di atas provider LLM gratis (Groq, Google AI
Studio/Gemini, OpenRouter, Cloudflare Workers AI, HuggingFace). Satu endpoint, banyak
model, dengan **load balancing + fallback otomatis**, **streaming (SSE)**, **API key
per tier**, dan **rate limiting**.

> Bagian dari platform **Jalin.AI** (AI Gateway + FAQ Chatbot RAG + VSCode Extension).
> Ini repo **Fase 1**. RAG/LangChain menyusul di Fase 2.

## Fitur

- ✅ Endpoint OpenAI-compatible: `POST /v1/chat/completions`, `GET /v1/models`
- ✅ 5 provider gratis, otomatis nonaktif kalau API key-nya kosong
- ✅ Load balancing (round-robin) + fallback berurutan saat provider gagal/limit
- ✅ Streaming SSE (pass-through byte dari provider)
- ✅ Validasi API key + gating per tier (free/starter/pro/ultimate)
- ✅ Rate limit per menit, batas menyesuaikan tier
- ✅ TypeScript + Fastify, konfigurasi lewat env

## Kenapa belum pakai LangChain?

Untuk gateway murni (proxy + routing), LangChain cuma nambah bloat — semua provider
sudah OpenAI-compatible jadi cukup `fetch`. LangChain baru kepakai di **Fase 2** buat
chunking / embedding / retrieval RAG.

## Jalanin

```bash
cd jalinai-gateway
cp .env.example .env      # isi minimal 1 provider key, mis. GROQ_API_KEY
npm install
npm run dev               # http://localhost:8080
```

Ambil key gratis: Groq (console.groq.com/keys), Google AI Studio
(aistudio.google.com/apikey), OpenRouter (openrouter.ai/keys).

## Contoh pakai

Health check (publik):

```bash
curl http://localhost:8080/health
```

Chat (pakai dev key default `jln-dev-key`):

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Authorization: Bearer jln-dev-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.3-70b",
    "messages": [{"role":"user","content":"Halo, siapa kamu?"}]
  }'
```

Streaming (SSE):

```bash
curl -N http://localhost:8080/v1/chat/completions \
  -H "Authorization: Bearer jln-dev-key" \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini-flash","stream":true,"messages":[{"role":"user","content":"Ceritakan 1 fakta menarik"}]}'
```

Karena OpenAI-compatible, SDK OpenAI resmi juga bisa langsung dipakai:

```js
import OpenAI from 'openai';
const client = new OpenAI({ apiKey: 'jln-dev-key', baseURL: 'http://localhost:8080/v1' });
```

## Model & tier

| Tier     | Model                                                  |
| -------- | ------------------------------------------------------ |
| free     | `llama-3.3-70b`, `gemini-flash`                        |
| starter  | + `qwen-2.5-72b`, `deepseek-v3`                        |
| pro      | + `mistral-large`                                      |
| ultimate | + `claude-opus`, `gpt-4o` (premium, via OpenRouter berbayar) |

Tier tinggi mewarisi model tier di bawahnya. Registry model ada di
[`src/config/models.ts`](src/config/models.ts) — tambah/geser rute di sana.

## Client API key

- Dev: `DEV_API_KEY` (default `jln-dev-key`, tier `ultimate`) — **jangan** dipakai di produksi.
- Produksi: `GATEWAY_API_KEYS` (JSON array), contoh:
  ```
  GATEWAY_API_KEYS=[{"key":"jln-abc","tier":"free","name":"toko-budi"}]
  ```

> Fase 3/4 akan pindahin key & tracking token ke database (Supabase) + Midtrans/Xendit.

## Struktur

```
src/
  server.ts            # bootstrap Fastify
  config/              # env, tier, api key, registry model
  providers/           # adapter OpenAI-compat + registry provider
  core/                # router (LB + fallback) + gateway (validasi)
  plugins/             # auth, rate limit
  routes/              # /v1/chat/completions, /v1/models, /health
  types/               # tipe OpenAI-compat
```

## Endpoint

| Method | Path                   | Auth | Keterangan                          |
| ------ | ---------------------- | ---- | ----------------------------------- |
| GET    | `/health`              | –    | Status + provider aktif             |
| GET    | `/v1/models`           | ✅   | Daftar model sesuai tier            |
| POST   | `/v1/chat/completions` | ✅   | Chat (streaming & non-streaming)    |

Response chat menyertakan header `x-jalin-provider` = provider yang benar-benar melayani.
