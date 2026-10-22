import { describe, expect, it, vi } from 'vitest';
import { CHECK_INTERVAL_MS, isDue, runChecks, shouldAlert, type CheckerDeps } from '../../src/core/checker';
import type { Product, ProductSnapshot } from '../../src/core/types';

const NOW = Date.UTC(2026, 9, 22, 12);
const HOUR = 3_600_000;

function product(id: string, extra: Partial<Product> = {}): Product {
  return {
    key: `kabum:${id}`,
    store: 'kabum',
    productId: id,
    name: `Produto ${id}`,
    imageUrl: null,
    url: `https://www.kabum.com.br/produto/${id}`,
    firstSeen: 0,
    lastSeen: 0,
    lastPrice: 100,
    previousPrice: null,
    tracked: true,
    targetPrice: 80,
    lastCheckAt: null,
    lastCheckError: null,
    alertedPrice: null,
    ...extra,
  };
}

function setup(products: Product[], prices: Record<string, number | Error>) {
  const db = new Map(products.map((p) => [p.key, { ...p }]));
  const deps: CheckerDeps = {
    listProducts: async () => [...db.values()],
    fetchSnapshot: vi.fn(async (p: Product): Promise<ProductSnapshot> => {
      const price = prices[p.productId];
      if (price instanceof Error) throw price;
      return { store: p.store, productId: p.productId, name: p.name, price: price!, listPrice: null, pixPrice: null, imageUrl: null, url: p.url };
    }),
    recordSnapshot: async (s) => {
      const p = db.get(`${s.store}:${s.productId}`)!;
      p.lastPrice = s.price;
      return { ...p };
    },
    updateProduct: async (key, changes) => {
      const p = Object.assign(db.get(key)!, changes);
      return { ...p };
    },
    notify: vi.fn(async () => {}),
    isStoreEnabled: async () => true,
    now: () => NOW,
  };
  return { db, deps };
}

describe('isDue', () => {
  it('respeita o intervalo de 6 horas e só verifica acompanhados', () => {
    expect(isDue(product('1'), NOW)).toBe(true);
    expect(isDue(product('1', { lastCheckAt: NOW - 5 * HOUR }), NOW)).toBe(false);
    expect(isDue(product('1', { lastCheckAt: NOW - CHECK_INTERVAL_MS }), NOW)).toBe(true);
    expect(isDue(product('1', { tracked: false }), NOW)).toBe(false);
  });
});

describe('shouldAlert', () => {
  it('avisa ao atingir o alvo, e de novo só se cair mais', () => {
    expect(shouldAlert(product('1', { lastPrice: 80 }))).toBe(true);
    expect(shouldAlert(product('1', { lastPrice: 81 }))).toBe(false);
    expect(shouldAlert(product('1', { lastPrice: 75, alertedPrice: 75 }))).toBe(false);
    expect(shouldAlert(product('1', { lastPrice: 70, alertedPrice: 75 }))).toBe(true);
    expect(shouldAlert(product('1', { lastPrice: 10, targetPrice: null }))).toBe(false);
  });
});

describe('runChecks', () => {
  it('verifica, notifica abaixo do alvo e registra falhas sem interromper', async () => {
    const { db, deps } = setup(
      [product('1'), product('2'), product('3', { lastCheckAt: NOW - HOUR }), product('4', { tracked: false })],
      { '1': 79.9, '2': new Error('HTTP 503') },
    );
    const result = await runChecks(deps);
    expect(result).toEqual({ checked: 1, failed: 1, alerted: 1 });
    expect(deps.fetchSnapshot).toHaveBeenCalledTimes(2);
    expect(deps.notify).toHaveBeenCalledWith(expect.objectContaining({ key: 'kabum:1', lastPrice: 79.9 }));
    expect(db.get('kabum:1')).toMatchObject({ lastCheckAt: NOW, lastCheckError: null, alertedPrice: 79.9 });
    expect(db.get('kabum:2')).toMatchObject({ lastCheckAt: NOW, lastCheckError: 'HTTP 503' });

    // Rodada seguinte, logo depois: nada vence de novo antes de 6 horas.
    expect(await runChecks(deps)).toEqual({ checked: 0, failed: 0, alerted: 0 });
  });

  it('limita a quantidade por rodada e pula lojas desligadas', async () => {
    const products = Array.from({ length: 8 }, (_, i) => product(String(i)));
    const { deps } = setup(products, Object.fromEntries(products.map((p) => [p.productId, 100])));
    deps.isStoreEnabled = async () => false;
    expect((await runChecks(deps)).checked).toBe(0);
    deps.isStoreEnabled = async () => true;
    expect((await runChecks(deps)).checked).toBe(5);
  });

  it('recusa página de outro produto', async () => {
    const { db, deps } = setup([product('1')], {});
    deps.fetchSnapshot = async (p) => ({ store: 'kabum', productId: '999', name: '', price: 1, listPrice: null, pixPrice: null, imageUrl: null, url: p.url });
    expect((await runChecks(deps)).failed).toBe(1);
    expect(db.get('kabum:1')!.lastCheckError).toBe('A página verificada é de outro produto.');
  });
});
