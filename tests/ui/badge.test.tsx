import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { classify } from '../../src/core/classify';
import type { PriceRecord, Product } from '../../src/core/types';
import type { ProductView } from '../../src/messaging';

// jsdom não tem canvas: substitui o Chart.js por um dublê.
vi.mock('chart.js', () => {
  class Chart {
    static register() {}
    destroy() {}
  }
  return { Chart, Filler: {}, Legend: {}, LinearScale: {}, LineController: {}, LineElement: {}, PointElement: {}, Tooltip: {} };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { mountBadge } = await import('../../src/ui/badge/mount');

const product: Product = {
  key: 'mercadolivre:MLB1',
  store: 'mercadolivre',
  productId: 'MLB1',
  name: 'Fone Bluetooth Pro 4',
  imageUrl: null,
  url: 'https://www.mercadolivre.com.br/fone/p/MLB1',
  firstSeen: 0,
  lastSeen: 0,
  lastPrice: 99,
  previousPrice: 130,
  tracked: false,
  targetPrice: null,
  lastCheckAt: null,
  lastCheckError: null,
};

const rec = (day: string, price: number, listPrice: number | null = null): PriceRecord => ({
  key: product.key,
  day,
  price,
  listPrice,
  pixPrice: null,
  capturedAt: 0,
});

function view(history: PriceRecord[]): ProductView {
  const last = history[history.length - 1]!;
  return { product, history, verdict: classify(history, last, last.day) };
}

/** Elemento hospedeiro do selo (o shadow root é fechado). */
function findHost() {
  return document.querySelector('preco-real-selo')!;
}

describe('selo', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('mostra a classificação e abre o painel com as estatísticas', async () => {
    const handle = mountBadge();
    const host = findHost();
    expect(host).toBeTruthy();

    const history = [
      rec('2026-09-27', 100),
      rec('2026-10-07', 100),
      rec('2026-10-17', 130),
      rec('2026-10-19', 130),
      rec('2026-10-22', 99, 130),
    ];
    await act(async () => handle.update(view(history), null));

    const root = (host as unknown as { __shadow?: ShadowRoot }).__shadow!;
    const badge = root.querySelector('.badge')!;
    expect(badge.textContent).toContain('Desconto suspeito');

    await act(async () => (badge as HTMLButtonElement).click());
    const panel = root.querySelector('[role="dialog"]')!;
    expect(panel.textContent).toContain('R$ 99,00');
    expect(panel.textContent).toContain('O preço subiu 30% nos dias anteriores à promoção.');
    expect(panel.textContent).toContain('Menor preço');
    expect(panel.textContent).toContain('em 22/10/2026');

    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(root.querySelector('[role="dialog"]')).toBeNull();

    handle.remove();
    expect(document.querySelector('preco-real-selo')).toBeNull();
  });

  it('sem preço na página, fica fixo no canto', async () => {
    const handle = mountBadge();
    await act(async () => handle.update(view([rec('2026-10-22', 50)]), null));
    handle.reposition(null);
    const host = document.querySelector<HTMLElement>('preco-real-selo')!;
    expect(host.style.position).toBe('fixed');
    expect(host.style.right).toBe('16px');
    handle.remove();
  });
});
