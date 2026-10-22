import { useState } from 'react';
import { ProductsTab } from '../../popup/ProductsTab';
import { SettingsPanel } from '../../popup/SettingsPanel';
import { TrackingTab } from '../../popup/TrackingTab';
import { useProducts } from '../../popup/useProducts';

type Tab = 'produtos' | 'acompanhando' | 'configuracoes';

export default function App() {
  const [tab, setTab] = useState<Tab>('produtos');
  const { items, reload, update } = useProducts();
  const trackedCount = items?.filter((i) => i.product.tracked).length ?? 0;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'produtos', label: `Produtos${items?.length ? ` (${items.length})` : ''}` },
    { id: 'acompanhando', label: `Acompanhando${trackedCount ? ` (${trackedCount})` : ''}` },
    { id: 'configuracoes', label: 'Configurações' },
  ];

  return (
    <main className="flex h-[580px] flex-col font-sans text-slate-800">
      <header className="flex items-center gap-2 bg-emerald-600 px-4 py-3 text-white">
        <img src="/icon/32.png" alt="" className="h-6 w-6 rounded" />
        <div>
          <h1 className="text-base font-bold leading-tight">Preço Real</h1>
          <p className="text-[11px] leading-tight opacity-90">Descubra se o desconto é de verdade</p>
        </div>
      </header>
      <nav className="flex border-b border-slate-200 bg-white" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 border-b-2 px-2 py-2 text-xs font-semibold transition ${
              tab === t.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="flex-1 overflow-y-auto">
        {items === null ? null : tab === 'produtos' ? (
          <ProductsTab items={items} onUpdate={update} />
        ) : tab === 'acompanhando' ? (
          <TrackingTab items={items} onUpdate={update} onReload={reload} />
        ) : (
          <SettingsPanel inPopup onDataChanged={reload} />
        )}
      </div>
    </main>
  );
}
