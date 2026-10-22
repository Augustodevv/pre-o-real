import type { ProductSnapshot, StoreId } from '../core/types';

/**
 * Cada loja implementa esta interface. Para adicionar uma loja nova:
 * 1. crie `src/adapters/<loja>.ts` usando `createAdapter`;
 * 2. registre em `src/adapters/index.ts` e o domínio em `hosts.ts`;
 * 3. coloque páginas salvas em `tests/fixtures/<loja>/` com o `.expected.json`.
 */
export interface StoreAdapter {
  id: StoreId;
  name: string;
  /** A URL pertence a esta loja? */
  matches(url: URL): boolean;
  /** ID do produto a partir da URL/página, ou null se não for uma página de produto. */
  getProductId(url: URL, doc: Document): string | null;
  /** Extrai os dados. Retorna null se a página ainda não tem preço (pode estar carregando). */
  extract(doc: Document, url: URL): ProductSnapshot | null;
  /** Elemento do preço na página, para posicionar o selo perto dele. */
  findPriceElement(doc: Document): Element | null;
}
