import { describe, expect, it } from 'vitest';
import { findAdapter } from '../../src/adapters';
import { mercadoLivreProductId } from '../../src/adapters/mercadolivre';

describe('Mercado Livre: ID do produto', () => {
  it.each([
    ['https://www.mercadolivre.com.br/fone-pro-4/p/MLB25263382', 'MLB25263382'],
    ['https://www.mercadolivre.com.br/fone-pro-4/p/MLB25263382?pdp_filters=x', 'MLB25263382'],
    ['https://produto.mercadolivre.com.br/MLB-3759516703-fone-_JM', 'MLB3759516703'],
    ['https://www.mercadolivre.com.br/fone-inova/up/MLBU3955245976', 'MLBU3955245976'],
    ['https://lista.mercadolivre.com.br/fone-bluetooth', null],
    ['https://www.mercadolivre.com.br/', null],
  ])('%s → %s', (href, id) => {
    expect(mercadoLivreProductId(new URL(href))).toBe(id);
  });

  it('reconhece só domínios do Mercado Livre', () => {
    expect(findAdapter(new URL('https://www.mercadolivre.com.br/x/p/MLB1'))?.id).toBe('mercadolivre');
    expect(findAdapter(new URL('https://mercadolivre.com.br.golpe.com/p/MLB1'))).toBeNull();
  });
});
