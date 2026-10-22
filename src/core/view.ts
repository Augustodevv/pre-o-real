import { classify } from './classify';
import { dayKey } from './dates';
import { getHistory, getProduct } from './db';
import type { PriceRecord, Product } from './types';
import type { ProductView } from '../messaging';

/** Junta produto, histórico e classificação do preço atual. */
export async function buildProductView(key: string, now = Date.now()): Promise<ProductView | null> {
  const product = await getProduct(key);
  if (!product) return null;
  return makeProductView(product, await getHistory(key), now);
}

export function makeProductView(product: Product, history: PriceRecord[], now = Date.now()): ProductView {
  const today = dayKey(now);
  const todayRecord = history.find((r) => r.day === today);
  const verdict = classify(
    history,
    { price: product.lastPrice, listPrice: todayRecord?.listPrice ?? null },
    today,
  );
  return { product, history, verdict };
}
