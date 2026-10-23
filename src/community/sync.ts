import { storage } from 'wxt/utils/storage';
import { dayKey } from '../core/dates';
import { productKey, type ProductSnapshot } from '../core/types';
import type { CommunityClient, CommunityDay } from './client';

/** Último dia em que cada produto foi enviado, para enviar no máximo uma vez por dia. */
const sentItem = storage.defineItem<Record<string, string>>('local:communitySent', { fallback: {} });

const CACHE_MS = 60 * 60 * 1000;
const cache = new Map<string, { at: number; days: CommunityDay[] }>();

/** Envia o preço (uma vez por produto por dia). Falhas são silenciosas: é um recurso opcional. */
export async function shareSnapshot(
  client: CommunityClient,
  snapshot: ProductSnapshot,
  installation: string,
  now = Date.now(),
): Promise<void> {
  const key = productKey(snapshot.store, snapshot.productId);
  const today = dayKey(now);
  const sent = await sentItem.getValue();
  if (sent[key] === today) return;
  try {
    await client.submitPrice(snapshot.store, snapshot.productId, snapshot.price, installation);
    // Mantém só os envios de hoje, para o registro não crescer sem limite.
    const kept = Object.fromEntries(Object.entries(sent).filter(([, day]) => day === today));
    await sentItem.setValue({ ...kept, [key]: today });
    cache.delete(key);
  } catch (error) {
    console.warn('[Preço Real] Não foi possível enviar ao histórico compartilhado:', error);
  }
}

/** Busca o histórico compartilhado (com cache de 1 hora). Em caso de falha, devolve vazio. */
export async function loadCommunityHistory(
  client: CommunityClient,
  snapshot: Pick<ProductSnapshot, 'store' | 'productId'>,
  now = Date.now(),
): Promise<CommunityDay[]> {
  const key = productKey(snapshot.store, snapshot.productId);
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_MS) return hit.days;
  try {
    const days = await client.getHistory(snapshot.store, snapshot.productId);
    cache.set(key, { at: now, days });
    return days;
  } catch (error) {
    console.warn('[Preço Real] Histórico compartilhado indisponível:', error);
    return [];
  }
}

/** Só para testes. */
export function clearCommunityCache() {
  cache.clear();
}
