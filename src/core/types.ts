export type StoreId = 'mercadolivre' | 'amazon' | 'magalu' | 'kabum' | 'casasbahia';

/** O que um adaptador consegue ler de uma página de produto. */
export interface ProductSnapshot {
  store: StoreId;
  productId: string;
  name: string;
  /** Preço à vista atual (em reais). */
  price: number;
  /** Preço "de", normalmente riscado. */
  listPrice: number | null;
  /** Preço no Pix, quando a loja mostra um diferente. */
  pixPrice: number | null;
  imageUrl: string | null;
  /** URL canônica, sem parâmetros de rastreamento. */
  url: string;
}

/** Um registro por produto por dia. */
export interface PriceRecord {
  key: string;
  /** Data local no formato AAAA-MM-DD. */
  day: string;
  price: number;
  listPrice: number | null;
  pixPrice: number | null;
  capturedAt: number;
}

export interface Product {
  /** `${store}:${productId}` */
  key: string;
  store: StoreId;
  productId: string;
  name: string;
  imageUrl: string | null;
  url: string;
  firstSeen: number;
  lastSeen: number;
  lastPrice: number;
  /** Preço do registro anterior ao último dia, para mostrar a variação. */
  previousPrice: number | null;
  tracked: boolean;
  targetPrice: number | null;
  lastCheckAt: number | null;
  lastCheckError: string | null;
}

export function productKey(store: StoreId, productId: string): string {
  return `${store}:${productId}`;
}
