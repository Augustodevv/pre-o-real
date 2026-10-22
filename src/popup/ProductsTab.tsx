import { useMemo, useState } from 'react';
import { STORE_NAMES } from '../adapters';
import { formatBRL } from '../core/price';
import type { Product, StoreId } from '../core/types';
import type { ProductView } from '../messaging';
import { ClassificationPill, Empty, openTab, ProductThumb, Variation } from './components';
import { normalize, timeAgo } from './format';

interface Props {
  items: ProductView[];
  onUpdate(key: string, changes: Partial<Product>): void;
}

export function ProductsTab({ items, onUpdate }: Props) {
  const [query, setQuery] = useState('');
  const [store, setStore] = useState<StoreId | 'todas'>('todas');

  const stores = useMemo(() => [...new Set(items.map((i) => i.product.store))], [items]);
  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return items.filter(
      ({ product }) =>
        (store === 'todas' || product.store === store) && (!q || normalize(product.name).includes(q)),
    );
  }, [items, query, store]);

  if (items.length === 0) {
    return (
      <Empty title="Nenhum produto ainda">
        Abra um produto no Mercado Livre, Amazon, Magalu, KaBuM! ou Casas Bahia. O histórico começa a ser
        registrado na hora.
      </Empty>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-10 flex gap-2 border-b border-slate-100 bg-white px-3 py-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar produto…"
          aria-label="Buscar produto"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <select
          value={store}
          onChange={(e) => setStore(e.target.value as StoreId | 'todas')}
          aria-label="Filtrar por loja"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
        >
          <option value="todas">Todas as lojas</option>
          {stores.map((s) => (
            <option key={s} value={s}>
              {STORE_NAMES[s]}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <Empty title="Nada encontrado" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {visible.map(({ product, verdict }) => (
            <li key={product.key} className="flex gap-3 px-3 py-3 hover:bg-slate-50">
              <button
                className="flex min-w-0 flex-1 gap-3 text-left"
                onClick={() => openTab(product.url)}
                title="Abrir na loja"
              >
                <ProductThumb product={product} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-800">{product.name}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {STORE_NAMES[product.store]} · visto {timeAgo(product.lastSeen)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-bold text-slate-900">{formatBRL(product.lastPrice)}</span>
                    <Variation product={product} />
                    <ClassificationPill classification={verdict.classification} />
                  </div>
                </div>
              </button>
              <button
                onClick={() => onUpdate(product.key, { tracked: !product.tracked })}
                className={`self-start rounded-full p-1.5 text-lg leading-none transition hover:bg-amber-50 ${
                  product.tracked ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'
                }`}
                aria-pressed={product.tracked}
                title={product.tracked ? 'Parar de acompanhar' : 'Acompanhar e definir preço-alvo'}
              >
                {product.tracked ? '★' : '☆'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
