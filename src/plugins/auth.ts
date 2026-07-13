import type { FastifyReply, FastifyRequest } from 'fastify';
import { resolveApiKey, type ApiKeyRecord } from '../config/apiKeys.js';
import { openaiError } from '../types/openai.js';

declare module 'fastify' {
  interface FastifyRequest {
    apiKey?: ApiKeyRecord;
  }
}

/** Ekstrak & validasi API key dari header Authorization / x-api-key. */
export function authenticate(req: FastifyRequest): ApiKeyRecord | undefined {
  const header = req.headers['authorization'] ?? req.headers['x-api-key'];
  const raw = Array.isArray(header) ? header[0] : header;
  return resolveApiKey(raw);
}

/**
 * preHandler hook: tolak request tanpa key valid dengan error ala OpenAI.
 * Dipasang per-route (bukan global) supaya /health tetap publik.
 */
export async function requireApiKey(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const record = authenticate(req);
  if (!record) {
    await reply.code(401).send(
      openaiError(
        'API key tidak valid atau tidak ada. Sertakan header: Authorization: Bearer <key>',
        'authentication_error',
        'invalid_api_key',
      ),
    );
    return;
  }
  req.apiKey = record;
}
