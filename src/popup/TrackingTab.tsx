import { useState } from 'react';
import { STORE_NAMES } from '../adapters';
import { formatBRL, parseBRL } from '../core/price';
import type { Product } from '../core/types';
import { sendMessage, type ProductView } from '../messaging';
import { Empty, openTab, ProductThumb } from './components';
import { timeAgo } from './format';

/** 1900 → "1.900,00" (sem o "R$", que fica fixo no campo). */
const formatAmount = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  items: ProductView[];
  onUpdate(key: string, changes: Partial<Product>): void;
  onReload(): void;
}

export function TrackingTab({ items, onUpdate, onReload }: Props) {
  const tracked = items.filter((i) => i.product.tracked);
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  async function checkNow() {
    setChecking(true);
    setCheckMessage(null);
    try {
      const r = await sendMessage({ type: 'runChecks' });
      setCheckMessage(
        r.checked + r.failed === 0
          ? 'Todos já foram verificados nas últimas 6 horas.'
          : `${r.checked} verificado(s)${r.failed ? `, ${r.failed} com falha` : ''}${r.alerted ? `, ${r.alerted} alerta(s)` : ''}.`,
      );
      onReload();
    } finally {
      setChecking(false);
    }
  }

  if (tracked.length === 0) {
    return (
      <Empty title="Você ainda não acompanha nenhum produto">
        Na aba Produtos, toque na ☆ de um produto para acompanhar o preço e receber um aviso quando ele cair.
      </Empty>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <span>{checkMessage ?? 'Verificamos os preços a cada 6 horas.'}</span>
        <button
          onClick={checkNow}
          disabled={checking}
          className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 hover:border-emerald-400 disabled:opacity-50"
        >
          {checking ? 'Verificando…' : 'Verificar agora'}
        </button>
      </div>
      <ul className="divide-y divide-slate-100">
        {tracked.map(({ product, verdict }) => (
          <TrackedRow key={product.key} product={product} minPrice={verdict.stats?.min ?? null} onUpdate={onUpdate} />
        ))}
      </ul>
    </div>
  );
}

function TrackedRow({
  product,
  minPrice,
  onUpdate,
}: {
  product: Product;
  minPrice: number | null;
  onUpdate(key: string, changes: Partial<Product>): void;
}) {
  const [draft, setDraft] = useState(product.targetPrice !== null ? formatAmount(product.targetPrice) : '');
  const [error, setError] = useState<string | null>(null);
  const reached = product.targetPrice !== null && product.lastPrice <= product.targetPrice;

  function saveTarget() {
    const text = draft.trim();
    if (!text) {
      setError(null);
      if (product.targetPrice !== null) onUpdate(product.key, { targetPrice: null, alertedPrice: null });
      return;
    }
    const value = parseBRL(text);
    if (value === null) {
      setError('Digite um valor como 1.299,90');
      return;
    }
    setError(null);
    setDraft(formatAmount(value));
    if (value !== product.targetPrice) onUpdate(product.key, { targetPrice: value, alertedPrice: null });
  }

  return (
    <li className="px-3 py-3">
      <div className="flex gap-3">
        <button onClick={() => openTab(product.url)} title="Abrir na loja">
          <ProductThumb product={product} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-800">{product.name}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {STORE_NAMES[product.store]} · agora {formatBRL(product.lastPrice)}
            {minPrice !== null && ` · menor ${formatBRL(minPrice)}`}
          </p>
        </div>
        <button
          onClick={() => onUpdate(product.key, { tracked: false })}
          className="self-start rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          title="Parar de acompanhar"
          aria-label="Parar de acompanhar"
        >
          ✕
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          Avisar abaixo de
          <span className="relative">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
            <input
              inputMode="decimal"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={saveTarget}
              onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
              placeholder="0,00"
              className="w-28 rounded-md border border-slate-200 py-1 pl-7 pr-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </span>
        </label>
        {reached && <span className="text-xs font-semibold text-emerald-700">🎯 Alvo atingido!</span>}
        {!reached && product.targetPrice !== null && (
          <span className="text-xs text-slate-500">
            faltam {formatBRL(product.lastPrice - product.targetPrice)}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      <p className={`mt-1.5 text-[11px] ${product.lastCheckError ? 'text-amber-700' : 'text-slate-400'}`}>
        {product.lastCheckError
          ? `Última verificação falhou (${timeAgo(product.lastCheckAt!)}): ${product.lastCheckError} Tentaremos de novo em até 6 h.`
          : product.lastCheckAt
            ? `Verificado automaticamente ${timeAgo(product.lastCheckAt)}`
            : 'Ainda não verificado automaticamente'}
      </p>
    </li>
  );
}
