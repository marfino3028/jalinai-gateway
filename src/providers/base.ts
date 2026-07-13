export interface ProviderConfig {
  id: string;
  baseURL: string; // tanpa trailing slash; endpoint = `${baseURL}/chat/completions`
  apiKey?: string;
  extraHeaders?: Record<string, string>;
  timeoutMs?: number;
}

/**
 * Adapter generik untuk provider apa pun yang OpenAI-compatible.
 * Semua provider gratis (Groq, Gemini, OpenRouter, Cloudflare, HF) masuk sini.
 */
export class OpenAICompatProvider {
  readonly id: string;
  private readonly baseURL: string;
  private readonly apiKey?: string;
  private readonly extraHeaders: Record<string, string>;
  private readonly timeoutMs: number;

  constructor(cfg: ProviderConfig) {
    this.id = cfg.id;
    this.baseURL = cfg.baseURL.replace(/\/$/, '');
    this.apiKey = cfg.apiKey;
    this.extraHeaders = cfg.extraHeaders ?? {};
    this.timeoutMs = cfg.timeoutMs ?? 60_000;
  }

  /** Provider aktif hanya kalau key-nya terisi. */
  get enabled(): boolean {
    return !!this.apiKey;
  }

  /**
   * Kirim request chat completion. `body.model` harus sudah di-set ke nama
   * model sisi-provider oleh pemanggil. Mengembalikan `Response` mentah
   * (streaming maupun non-streaming) biar bisa langsung diteruskan.
   */
  async chat(body: Record<string, unknown>): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          ...this.extraHeaders,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
