import type { Tier } from '../config/tiers.js';

export interface CheckoutParams {
  orderId: string;
  amount: number; // Rupiah
  tier: Tier;
  customerName: string;
}

export interface CheckoutResult {
  provider: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'paid';
  paymentUrl?: string; // untuk redirect (Midtrans Snap)
  token?: string; // Snap token
  instructions?: string; // untuk mode manual
}

export interface WebhookResult {
  orderId: string;
  paid: boolean;
}

export interface PaymentProvider {
  id: string;
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  /** Verifikasi payload webhook; null kalau tak valid / tak relevan. */
  verifyWebhook(
    body: Record<string, unknown>,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookResult | null>;
}
