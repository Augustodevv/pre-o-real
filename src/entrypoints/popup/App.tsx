import { useEffect, useState } from 'react';
import { STORE_NAMES } from '../../adapters';
import { listProducts } from '../../core/db';
import { formatBRL } from '../../core/price';
import type { Product } from '../../core/types';

// Versão inicial (Etapa 1): apenas lista o que foi capturado.
export default function App() {
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    listProducts().then(setProducts);
  }, []);

  return (
    <main className="font-sans text-slate-800">
      <header className="bg-emerald-600 px-4 py-3 text-white">
        <h1 className="text-lg font-bold">Preço Real</h1>
        <p className="text-xs opacity-90">Produtos vistos</p>
      </header>
      {products === null ? null : products.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-500">
          Nenhum produto ainda. Abra um produto no Mercado Livre para começar.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {products.map((p) => (
            <li key={p.key}>
              <a href={p.url} target="_blank" className="flex gap-3 px-4 py-3 hover:bg-slate-50">
                {p.imageUrl && <img src={p.imageUrl} alt="" className="h-12 w-12 rounded object-contain" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-slate-500">{STORE_NAMES[p.store]}</p>
                  <p className="text-sm font-semibold">{formatBRL(p.lastPrice)}</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
