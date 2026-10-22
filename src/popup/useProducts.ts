import { useCallback, useEffect, useState } from 'react';
import { getAllHistories, listProducts, updateProduct } from '../core/db';
import type { Product } from '../core/types';
import { makeProductView } from '../core/view';
import type { ProductView } from '../messaging';

/** Produtos com histórico e classificação, lidos direto do IndexedDB da extensão. */
export function useProducts() {
  const [items, setItems] = useState<ProductView[] | null>(null);

  const reload = useCallback(async () => {
    const [products, histories] = await Promise.all([listProducts(), getAllHistories()]);
    setItems(products.map((p) => makeProductView(p, histories.get(p.key) ?? [])));
  }, []);

  useEffect(() => {
    reload();
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [reload]);

  const update = useCallback(
    async (key: string, changes: Partial<Product>) => {
      await updateProduct(key, changes);
      await reload();
    },
    [reload],
  );

  return { items, reload, update };
}
