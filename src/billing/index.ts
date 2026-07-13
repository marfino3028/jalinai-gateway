import { env } from '../config/env.js';
import { manualProvider } from './manual.js';
import { midtransProvider } from './midtrans.js';
import type { PaymentProvider } from './types.js';

export function getPaymentProvider(): PaymentProvider {
  return env.PAYMENT_PROVIDER === 'midtrans' ? midtransProvider : manualProvider;
}
