import { describe, expect, it } from 'vitest';
import { classify, computeStats } from '../../src/core/classify';
import type { PriceRecord } from '../../src/core/types';

const TODAY = '2026-10-22';

/** Cria registros a partir de [diasAtrás, preço]. */
function history(...entries: [number, number][]): PriceRecord[] {
  return entries.map(([ago, price]) => {
    const d = new Date(Date.UTC(2026, 9, 22 - ago));
    return {
      key: 'mercadolivre:MLB1',
      day: d.toISOString().slice(0, 10),
      price,
      listPrice: null,
      pixPrice: null,
      capturedAt: d.getTime(),
    };
  });
}

describe('classify', () => {
  it('sem histórico com menos de 3 dias', () => {
    const v = classify(history([1, 100], [0, 100]), { price: 100, listPrice: 150 }, TODAY);
    expect(v.classification).toBe('sem-historico');
    expect(v.reason).toContain('falta 1 dia');
  });

  it('bom preço abaixo da média', () => {
    const v = classify(history([20, 100], [10, 100], [0, 90]), { price: 90, listPrice: null }, TODAY);
    expect(v.classification).toBe('bom');
    expect(v.reason).toBe('10% abaixo da média dos últimos 30 dias.');
  });

  it('preço normal dentro da margem', () => {
    const v = classify(history([20, 100], [10, 100], [0, 103]), { price: 103, listPrice: null }, TODAY);
    expect(v.classification).toBe('normal');
  });

  it('preço alto acima da média', () => {
    const v = classify(history([20, 100], [10, 100], [0, 120]), { price: 120, listPrice: null }, TODAY);
    expect(v.classification).toBe('alto');
  });

  it('suspeito: preço "de" maior que qualquer preço registrado', () => {
    const v = classify(history([20, 100], [10, 105], [0, 95]), { price: 95, listPrice: 200 }, TODAY);
    expect(v.classification).toBe('suspeito');
    expect(v.reason).toContain('preço "de" riscado');
  });

  it('não é suspeito se o preço "de" já foi praticado', () => {
    const v = classify(history([20, 200], [10, 200], [0, 150]), { price: 150, listPrice: 200 }, TODAY);
    expect(v.classification).toBe('bom');
  });

  it('suspeito: preço subiu antes da promoção e voltou ao normal', () => {
    const v = classify(
      history([25, 100], [15, 100], [5, 130], [3, 130], [0, 99]),
      { price: 99, listPrice: 130 },
      TODAY,
    );
    expect(v.classification).toBe('suspeito');
    expect(v.reason).toBe('O preço subiu 30% nos dias anteriores à promoção.');
  });

  it('não é suspeito se a promoção ficou bem abaixo do preço anterior ao aumento', () => {
    const v = classify(
      history([25, 100], [15, 100], [5, 130], [0, 80]),
      { price: 80, listPrice: 130 },
      TODAY,
    );
    expect(v.classification).toBe('bom');
  });
});

describe('computeStats', () => {
  it('calcula mínimo, máximo, média de 30 dias (sem hoje) e data do mínimo', () => {
    const s = computeStats(history([60, 50], [20, 100], [10, 120], [0, 110]), TODAY)!;
    expect(s).toMatchObject({ days: 4, min: 50, max: 120, average30: 110 });
    expect(s.minDay).toBe('2026-08-23');
  });
});
