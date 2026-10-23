import { classify } from './classify';
import { dayKey } from './dates';
import { getHistory, getProduct } from './db';
import type { PriceRecord, Product } from './types';
import type { ProductView } from '../messaging';

/** Junta produto, histórico e classificação do preço atual. */
export async function buildProductView(
  key: string,
  now = Date.now(),
  /** Acrescenta dias de outras fontes (histórico compartilhado) ao histórico local. */
  enrich?: (product: Product, local: PriceRecord[]) => Promise<PriceRecord[]>,
  sharing = false,
): Promise<ProductView | null> {
  const product = await getProduct(key);
  if (!product) return null;
  const local = await getHistory(key);
  const history = enrich ? await enrich(product, local) : local;
  return makeProductView(product, history, now, sharing);
}

export function makeProductView(
  product: Product,
  history: PriceRecord[],
  now = Date.now(),
  sharing = false,
): ProductView {
  const today = dayKey(now);
  const todayRecord = history.find((r) => r.day === today);
  const verdict = classify(
    history,
    { price: product.lastPrice, listPrice: todayRecord?.listPrice ?? null },
    today,
  );
  return { product, history, verdict, communityDays: history.filter((r) => r.community).length, sharing };
}
