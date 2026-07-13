import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import type { CheckoutParams, CheckoutResult, PaymentProvider, WebhookResult } from './types.js';

const SNAP_BASE = env.MIDTRANS_IS_PRODUCTION
  ? 'https://app.midtrans.com'
  : 'https://app.sandbox.midtrans.com';

/**
 * Midtrans Snap. Butuh MIDTRANS_SERVER_KEY. createCheckout bikin transaksi Snap
 * (dapat token + redirect_url). Webhook diverifikasi via signature_key
 * sha512(order_id + status_code + gross_amount + server_key).
 */
export const midtransProvider: PaymentProvider = {
  id: 'midtrans',

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    if (!env.MIDTRANS_SERVER_KEY) {
      throw new Error('PAYMENT_PROVIDER=midtrans tapi MIDTRANS_SERVER_KEY kosong.');
    }
    const auth = Buffer.from(`${env.MIDTRANS_SERVER_KEY}:`).toString('base64');
    const res = await fetch(`${SNAP_BASE}/snap/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        transaction_details: { order_id: params.orderId, gross_amount: params.amount },
        item_details: [
          {
            id: `jalinai-${params.tier}`,
            price: params.amount,
            quantity: 1,
            name: `Jalin.AI ${params.tier} (1 bln)`,
          },
        ],
        customer_details: { first_name: params.customerName },
        callbacks: { finish: `${env.APP_BASE_URL}/billing/finish` },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Midtrans gagal (${res.status}): ${detail.slice(0, 200)}`);
    }
    const json = (await res.json()) as { token: string; redirect_url: string };
    return {
      provider: 'midtrans',
      orderId: params.orderId,
      amount: params.amount,
      status: 'pending',
      token: json.token,
      paymentUrl: json.redirect_url,
    };
  },

  async verifyWebhook(body): Promise<WebhookResult | null> {
    if (!env.MIDTRANS_SERVER_KEY) return null;
    const orderId = String(body.order_id ?? '');
    const statusCode = String(body.status_code ?? '');
    const grossAmount = String(body.gross_amount ?? '');
    const signature = String(body.signature_key ?? '');
    if (!orderId || !signature) return null;

    const expected = createHash('sha512')
      .update(orderId + statusCode + grossAmount + env.MIDTRANS_SERVER_KEY)
      .digest('hex');
    if (expected !== signature) return null; // signature tidak cocok → tolak

    const txStatus = String(body.transaction_status ?? '');
    const fraud = String(body.fraud_status ?? 'accept');
    const paid = (txStatus === 'capture' || txStatus === 'settlement') && fraud === 'accept';
    return { orderId, paid };
  },
};
