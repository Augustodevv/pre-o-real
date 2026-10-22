import { classify } from './classify';
import { dayKey } from './dates';
import { getHistory, getProduct } from './db';
import type { ProductView } from '../messaging';

/** Junta produto, histórico e classificação do preço atual. */
export async function buildProductView(key: string, now = Date.now()): Promise<ProductView | null> {
  const product = await getProduct(key);
  if (!product) return null;
  const history = await getHistory(key);
  const today = dayKey(now);
  const todayRecord = history.find((r) => r.day === today);
  const verdict = classify(
    history,
    { price: product.lastPrice, listPrice: todayRecord?.listPrice ?? null },
    today,
  );
  return { product, history, verdict };
}
