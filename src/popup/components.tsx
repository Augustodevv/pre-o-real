import { useState } from 'react';
import { browser } from 'wxt/browser';
import type { Classification } from '../core/classify';
import { formatPercent } from '../core/price';
import type { Product } from '../core/types';
import { LABELS } from '../ui/labels';

export function ClassificationPill({ classification }: { classification: Classification }) {
  const label = LABELS[classification];
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ color: label.color, background: label.background }}
    >
      <span aria-hidden="true">{label.emoji}</span>
      {label.text}
    </span>
  );
}

export function Variation({ product }: { product: Product }) {
  if (product.previousPrice === null || product.previousPrice === product.lastPrice) return null;
  const change = (product.lastPrice - product.previousPrice) / product.previousPrice;
  const down = change < 0;
  return (
    <span
      className={`text-xs font-semibold ${down ? 'text-emerald-700' : 'text-red-700'}`}
      title="Variação em relação ao registro anterior"
    >
      {down ? '▼' : '▲'} {formatPercent(change)}
    </span>
  );
}

export function ProductThumb({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  return product.imageUrl && !failed ? (
    <img
      src={product.imageUrl}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-14 w-14 shrink-0 rounded-lg border border-slate-100 bg-white object-contain"
    />
  ) : (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xl" aria-hidden="true">
      🛒
    </div>
  );
}

export function openTab(url: string) {
  browser.tabs.create({ url });
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-semibold text-slate-700">{title}</p>
      {children && <p className="mt-1 text-sm text-slate-500">{children}</p>}
    </div>
  );
}
