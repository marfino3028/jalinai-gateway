import type { FastifyInstance } from 'fastify';
import { requireApiKey } from '../plugins/auth.js';
import { handleChatCompletion } from '../core/gateway.js';
import { getUsage, recordUsage } from '../store/usage.js';
import { estimateTokens } from '../config/quota.js';
import { openaiError, type ChatCompletionRequest } from '../types/openai.js';

/** Gabungkan isi semua message jadi teks (buat estimasi token prompt). */
function promptText(body: ChatCompletionRequest): string {
  return (body.messages ?? []).map((m) => (typeof m.content === 'string' ? m.content : '')).join(' ');
}

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/v1/chat/completions',
    {
      preHandler: requireApiKey,
      config: { rateLimit: {} }, // rate-limit req/menit (batas per tier di plugin)
    },
    async (req, reply) => {
      const body = req.body as ChatCompletionRequest;
      const rec = req.apiKey!;
      const tier = rec.tier;
      const wantsStream = body?.stream === true;
      const now = Date.now();

      // ── Kuota token (Fase 4): tolak kalau window ini sudah habis ──
      const before = getUsage(rec.key, tier, new Date(now));
      if (before.remaining <= 0) {
        return reply.code(429).send(
          openaiError(
            `Kuota token habis (${before.used}/${before.limit} per ${before.windowType}). ` +
              `Reset di window "${before.window}" berikutnya, atau upgrade tier via /v1/billing/checkout.`,
            'insufficient_quota',
            'quota_exceeded',
          ),
        );
      }

      // Minta provider laporkan usage di stream (Groq/OpenAI mendukung).
      if (wantsStream && (body as Record<string, unknown>).stream_options === undefined) {
        (body as Record<string, unknown>).stream_options = { include_usage: true };
      }

      const outcome = await handleChatCompletion(
        body as unknown as Record<string, unknown>,
        tier,
        now,
      );
      if (!outcome.ok) return reply.code(outcome.status).send(outcome.body);

      const { response, servedBy } = outcome.result;
      reply.header('x-jalin-provider', servedBy ?? 'unknown');

      // ── Non-streaming ──
      if (!wantsStream) {
        const json = (await response!.json().catch(() => null)) as {
          usage?: { total_tokens?: number };
        } | null;
        const tokens =
          json?.usage?.total_tokens ??
          estimateTokens(promptText(body)) +
            estimateTokens(JSON.stringify(json ?? '')) / 2;
        await recordUsage(rec.key, tier, Math.round(tokens), new Date(now));
        const after = getUsage(rec.key, tier, new Date(now));
        reply.header('x-jalin-tokens-remaining', String(after.remaining));
        return reply.code(response!.status).send(json);
      }

      // ── Streaming (SSE): pipe byte + intip usage/panjang untuk akunting ──
      reply.hijack();
      const raw = reply.raw;
      raw.writeHead(response!.status, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'x-jalin-provider': servedBy ?? 'unknown',
      });

      const upstream = response!.body;
      if (!upstream) {
        raw.end();
        return;
      }

      const reader = upstream.getReader();
      const decoder = new TextDecoder();
      let lineBuf = '';
      let completion = '';
      let usageTokens = 0;
      const onClose = () => reader.cancel().catch(() => {});
      raw.on('close', onClose);

      const scan = (chunk: string) => {
        lineBuf += chunk;
        const lines = lineBuf.split('\n');
        lineBuf = lines.pop() ?? '';
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data:') || t.includes('[DONE]')) continue;
          try {
            const j = JSON.parse(t.slice(5).trim()) as {
              usage?: { total_tokens?: number };
              choices?: { delta?: { content?: string } }[];
            };
            if (j.usage?.total_tokens) usageTokens = j.usage.total_tokens;
            const d = j.choices?.[0]?.delta?.content;
            if (d) completion += d;
          } catch {
            /* chunk parsial / keep-alive */
          }
        }
      };

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            if (!raw.writableEnded) raw.write(Buffer.from(value));
            scan(decoder.decode(value, { stream: true }));
          }
        }
      } catch (err) {
        req.log.warn({ err }, 'stream terputus');
      } finally {
        raw.off('close', onClose);
        if (!raw.writableEnded) raw.end();
        const tokens =
          usageTokens || estimateTokens(promptText(body)) + estimateTokens(completion);
        await recordUsage(rec.key, tier, tokens, new Date(now));
      }
    },
  );
}
