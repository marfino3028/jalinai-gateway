/** Subset tipe OpenAI Chat Completions yang gateway pakai. */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  [k: string]: unknown;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stop?: string | string[];
  [k: string]: unknown; // teruskan param lain apa adanya ke provider
}

export interface OpenAIError {
  error: {
    message: string;
    type: string;
    code?: string;
    param?: string | null;
  };
}

export function openaiError(
  message: string,
  type = 'invalid_request_error',
  code?: string,
): OpenAIError {
  return { error: { message, type, code, param: null } };
}
