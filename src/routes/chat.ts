import type { FastifyInstance } from 'fastify';
import { requireApiKey } from '../plugins/auth.js';
import { handleChatCompletion } from '../core/gateway.js';
import type { ChatCompletionRequest } from '../types/openai.js';

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/v1/chat/completions',
    {
      preHandler: requireApiKey,
      config: { rateLimit: {} }, // aktifkan rate-limit (batas per tier di plugin)
    },
    async (req, reply) => {
      const body = req.body as ChatCompletionRequest;
      const tier = req.apiKey!.tier;
      const wantsStream = body?.stream === true;
      const now = Date.now();

      const outcome = await handleChatCompletion(
        body as unknown as Record<string, unknown>,
        tier,
        now,
      );

      if (!outcome.ok) {
        return reply.code(outcome.status).send(outcome.body);
      }

      const { response, servedBy } = outcome.result;
      reply.header('x-jalin-provider', servedBy ?? 'unknown');

      // ── Non-streaming: parse & teruskan JSON ──
      if (!wantsStream) {
        const json = await response!.json().catch(() => null);
        return reply.code(response!.status).send(json);
      }

      // ── Streaming (SSE): pipe byte mentah dari provider ke client ──
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
      const onClose = () => reader.cancel().catch(() => {});
      raw.on('close', onClose);

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value && !raw.writableEnded) raw.write(Buffer.from(value));
        }
      } catch (err) {
        req.log.warn({ err }, 'stream terputus');
      } finally {
        raw.off('close', onClose);
        if (!raw.writableEnded) raw.end();
      }
    },
  );
}
