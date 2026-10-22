import { describe, expect, it } from 'vitest';
import { placeBadge } from '../../src/ui/badge/position';

const rect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
  height,
});
const badge = { width: 140, height: 26 };

describe('placeBadge', () => {
  it('coloca à direita do preço, centralizado na vertical, somando a rolagem', () => {
    expect(placeBadge(rect(100, 200, 120, 40), badge, { width: 1280, scrollX: 0, scrollY: 500 })).toEqual({
      top: 707,
      left: 228,
    });
  });

  it('coloca abaixo quando não cabe à direita', () => {
    expect(placeBadge(rect(250, 100, 100, 40), badge, { width: 400, scrollX: 0, scrollY: 0 })).toEqual({
      top: 144,
      left: 250,
    });
  });

  it('sem preço visível retorna null (selo vai para o canto)', () => {
    expect(placeBadge(null, badge, { width: 1280, scrollX: 0, scrollY: 0 })).toBeNull();
    expect(placeBadge(rect(0, 0, 0, 0), badge, { width: 1280, scrollX: 0, scrollY: 0 })).toBeNull();
  });
});
