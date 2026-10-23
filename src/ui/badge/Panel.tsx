import { useEffect, useRef } from 'react';
import { STORE_NAMES } from '../../adapters';
import { formatDay } from '../../core/dates';
import { formatBRL } from '../../core/price';
import type { ProductView } from '../../messaging';
import { LABELS } from '../labels';
import { PriceChart } from '../PriceChart';

interface Props {
  view: ProductView;
  onClose(): void;
}

export function Panel({ view, onClose }: Props) {
  const { product, history, verdict } = view;
  const label = LABELS[verdict.classification];
  const stats = verdict.stats;
  const today = history[history.length - 1];
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="panel" role="dialog" aria-label="Histórico de preços — Preço Real">
      <header className="panel__header">
        <span className="panel__brand">Preço Real</span>
        <button ref={closeRef} className="panel__close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
      </header>

      <div className="panel__body">
        <p className="panel__store">{STORE_NAMES[product.store]}</p>
        <h2 className="panel__title">{product.name}</h2>

        <div className="panel__price-row">
          <span className="panel__price">{formatBRL(product.lastPrice)}</span>
          {today?.listPrice && <s className="panel__list-price">{formatBRL(today.listPrice)}</s>}
        </div>
        {today?.pixPrice && <p className="panel__pix">{formatBRL(today.pixPrice)} no Pix</p>}

        <div className="verdict" style={{ color: label.color, background: label.background }}>
          <strong>
            {label.emoji} {label.text}
          </strong>
          <span>{verdict.reason}</span>
        </div>

        <PriceChart history={history} average={stats?.average30 ?? null} />
        {view.communityDays > 0 && (
          <p className="panel__note">
            ○ {view.communityDays} {view.communityDays === 1 ? 'dia veio' : 'dias vieram'} do histórico compartilhado
            (pontos vazados no gráfico).
          </p>
        )}

        {stats && (
          <dl className="stats">
            <div>
              <dt>Menor preço</dt>
              <dd>{formatBRL(stats.min)}</dd>
              <small>em {formatDay(stats.minDay)}</small>
            </div>
            <div>
              <dt>Maior preço</dt>
              <dd>{formatBRL(stats.max)}</dd>
              <small>em {formatDay(stats.maxDay)}</small>
            </div>
            <div>
              <dt>Média 30 dias</dt>
              <dd>{stats.average30 !== null ? formatBRL(stats.average30) : '—'}</dd>
            </div>
            <div>
              <dt>Dias registrados</dt>
              <dd>{stats.days}</dd>
              <small>desde {formatDay(history[0]!.day)}</small>
            </div>
          </dl>
        )}
      </div>

      <footer className="panel__footer">
        {view.sharing
          ? '🤝 Você participa do histórico compartilhado (anônimo).'
          : '🔒 Histórico salvo apenas no seu navegador.'}
      </footer>
    </div>
  );
}
