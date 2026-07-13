import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '../config/env.js';
import type { Tier } from '../config/tiers.js';

export interface Order {
  orderId: string;
  apiKey: string;
  tier: Tier; // tier yang dituju setelah bayar
  amount: number; // Rupiah
  status: 'pending' | 'paid' | 'failed';
  createdAt: string;
}

const orders = new Map<string, Order>();
const file = join(env.DATA_DIR, 'orders.json');

export async function initOrders(): Promise<void> {
  await mkdir(env.DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(file, 'utf8');
    for (const o of JSON.parse(raw) as Order[]) orders.set(o.orderId, o);
  } catch {
    /* run pertama */
  }
}

async function persist(): Promise<void> {
  await writeFile(file, JSON.stringify([...orders.values()], null, 2));
}

export async function createOrder(o: Order): Promise<Order> {
  orders.set(o.orderId, o);
  await persist();
  return o;
}

export function getOrder(orderId: string): Order | undefined {
  return orders.get(orderId);
}

export function listOrders(): Order[] {
  return [...orders.values()];
}

export async function setOrderStatus(orderId: string, status: Order['status']): Promise<Order | undefined> {
  const o = orders.get(orderId);
  if (!o) return undefined;
  o.status = status;
  await persist();
  return o;
}
