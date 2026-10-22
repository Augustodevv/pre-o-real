import { afterEach, describe, expect, it } from 'vitest';
import {
  clearAll,
  exportAll,
  getHistory,
  importAll,
  listProducts,
  recordSnapshot,
  updateProduct,
} from '../../src/core/db';
import type { ProductSnapshot } from '../../src/core/types';

const snap = (price: number, extra: Partial<ProductSnapshot> = {}): ProductSnapshot => ({
  store: 'mercadolivre',
  productId: 'MLB1',
  name: 'Fone',
  price,
  listPrice: null,
  pixPrice: null,
  imageUrl: null,
  url: 'https://www.mercadolivre.com.br/fone/p/MLB1',
  ...extra,
});

const day = (d: number, hour = 12) => new Date(2026, 9, d, hour).getTime();

afterEach(() => clearAll());

describe('recordSnapshot', () => {
  it('mantém um registro por dia com o menor preço', async () => {
    await recordSnapshot(snap(100), day(20, 9));
    await recordSnapshot(snap(90, { listPrice: 150 }), day(20, 13));
    await recordSnapshot(snap(95), day(20, 18));
    const h = await getHistory('mercadolivre:MLB1');
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ day: '2026-10-20', price: 90, listPrice: 150 });
  });

  it('cria um registro novo em outro dia e guarda o preço anterior', async () => {
    await recordSnapshot(snap(100), day(20));
    const product = await recordSnapshot(snap(80), day(21));
    expect(await getHistory('mercadolivre:MLB1')).toHaveLength(2);
    expect(product).toMatchObject({ lastPrice: 80, previousPrice: 100, firstSeen: day(20) });
  });

  it('preserva "acompanhando" e preço-alvo ao registrar de novo', async () => {
    await recordSnapshot(snap(100), day(20));
    await updateProduct('mercadolivre:MLB1', { tracked: true, targetPrice: 70 });
    const product = await recordSnapshot(snap(99), day(21));
    expect(product).toMatchObject({ tracked: true, targetPrice: 70 });
  });
});

describe('exportar e importar', () => {
  it('ida e volta', async () => {
    await recordSnapshot(snap(100), day(20));
    await recordSnapshot(snap(90), day(21));
    const data = JSON.parse(JSON.stringify(await exportAll()));
    await clearAll();
    expect(await listProducts()).toHaveLength(0);
    expect(await importAll(data)).toEqual({ products: 1, prices: 2 });
    expect(await getHistory('mercadolivre:MLB1')).toHaveLength(2);
  });

  it('recusa arquivo inválido', async () => {
    await expect(importAll({ foo: 1 })).rejects.toThrow('Arquivo inválido');
  });
});
