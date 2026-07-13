import { PRICE_IDR } from '../config/quota.js';
import type { CheckoutParams, CheckoutResult, PaymentProvider } from './types.js';

/**
 * Provider manual (default): tampilkan instruksi transfer, order dibuat 'pending'.
 * Super admin meng-approve lewat POST /admin/orders/:id/approve → tier di-upgrade.
 * Cocok buat awal (belum punya akun payment gateway).
 */
export const manualProvider: PaymentProvider = {
  id: 'manual',

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    return {
      provider: 'manual',
      orderId: params.orderId,
      amount: params.amount,
      status: 'pending',
      instructions:
        `Transfer Rp${PRICE_IDR[params.tier].toLocaleString('id-ID')} ke rekening admin, ` +
        `sertakan kode order "${params.orderId}" di berita transfer. ` +
        `Tier aktif otomatis setelah admin konfirmasi.`,
    };
  },

  async verifyWebhook() {
    return null; // tidak ada webhook untuk mode manual
  },
};
