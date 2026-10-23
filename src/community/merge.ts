import type { PriceRecord } from '../core/types';
import type { CommunityDay } from './client';

/**
 * Junta o histórico local com o compartilhado. Nos dias em que há registro local,
 * vale o local (é o preço que o próprio usuário viu); os demais dias vêm da comunidade.
 */
export function mergeHistories(key: string, local: PriceRecord[], community: CommunityDay[]): PriceRecord[] {
  const byDay = new Map<string, PriceRecord>();
  for (const c of community) {
    byDay.set(c.day, {
      key,
      day: c.day,
      price: c.price,
      listPrice: null,
      pixPrice: null,
      capturedAt: 0,
      community: true,
    });
  }
  for (const r of local) byDay.set(r.day, r);
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}
