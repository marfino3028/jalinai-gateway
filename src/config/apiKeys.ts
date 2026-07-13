// Kompatibilitas: sumber kebenaran API key pindah ke store/keystore.ts (Fase 4,
// persisten + CRUD). File ini tetap ada supaya import lama (auth.ts) nggak berubah.
export { resolveApiKey } from '../store/keystore.js';
export type { ApiKeyRecord } from '../store/keystore.js';
