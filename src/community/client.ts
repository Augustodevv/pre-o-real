import type { StoreId } from '../core/types';

export interface CommunityDay {
  day: string;
  price: number;
  /** Quantas instalações registraram o preço nesse dia. */
  reports: number;
}

export type SubmitResult = 'ok' | 'limite' | 'rejeitado';

export interface CommunityClient {
  submitPrice(store: StoreId, productId: string, price: number, installation: string): Promise<SubmitResult>;
  getHistory(store: StoreId, productId: string): Promise<CommunityDay[]>;
}

/**
 * Cliente mínimo da API REST do Supabase (PostgREST), sem a biblioteca supabase-js,
 * para manter a extensão leve. Só chama as duas funções públicas do banco.
 */
export function createCommunityClient(
  url: string,
  key: string,
  fetchFn: typeof fetch = (...args) => fetch(...args),
  timeoutMs = 8000,
): CommunityClient {
  async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', apikey: key };
      // Chaves antigas (JWT "anon") também precisam do cabeçalho Authorization.
      if (!key.startsWith('sb_')) headers.Authorization = `Bearer ${key}`;
      const response = await fetchFn(`${url}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
        credentials: 'omit',
      });
      if (!response.ok) throw new Error(`Histórico compartilhado respondeu ${response.status}.`);
      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    submitPrice: (store, productId, price, installation) =>
      rpc<SubmitResult>('preco_real_submit_price', {
        p_store: store,
        p_product_id: productId,
        p_price: price,
        p_installation: installation,
      }),
    async getHistory(store, productId) {
      const rows = await rpc<{ day: string; price: number | string; reports: number }[]>('preco_real_get_price_history', {
        p_store: store,
        p_product_id: productId,
      });
      return rows
        .map((r) => ({ day: String(r.day).slice(0, 10), price: Number(r.price), reports: Number(r.reports) }))
        .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.day) && r.price > 0);
    },
  };
}
