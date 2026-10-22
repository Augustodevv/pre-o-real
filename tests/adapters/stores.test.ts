import { describe, expect, it } from 'vitest';
import { ADAPTERS, findAdapter } from '../../src/adapters';
import { amazonProductId } from '../../src/adapters/amazon';
import { casasBahiaProductId } from '../../src/adapters/casasbahia';
import { HOST_PERMISSIONS } from '../../src/adapters/hosts';
import { kabumProductId } from '../../src/adapters/kabum';
import { magaluProductId } from '../../src/adapters/magalu';

const id = (fn: (u: URL) => string | null, href: string) => fn(new URL(href));

describe('IDs de produto', () => {
  it('Amazon (ASIN)', () => {
    expect(id(amazonProductId, 'https://www.amazon.com.br/Echo-Dot/dp/B09B8VGCR8/ref=sr_1_1')).toBe('B09B8VGCR8');
    expect(id(amazonProductId, 'https://www.amazon.com.br/dp/b09b8vgcr8?th=1')).toBe('B09B8VGCR8');
    expect(id(amazonProductId, 'https://www.amazon.com.br/gp/product/B09B8VGCR8')).toBe('B09B8VGCR8');
    expect(id(amazonProductId, 'https://www.amazon.com.br/s?k=echo')).toBeNull();
    expect(id(amazonProductId, 'https://www.amazon.com.br/dp/B09B8VGCR8X')).toBeNull();
  });

  it('Magazine Luiza', () => {
    expect(id(magaluProductId, 'https://www.magazineluiza.com.br/galaxy-a15/p/237645600/te/galx/')).toBe('237645600');
    expect(id(magaluProductId, 'https://www.magazineluiza.com.br/cafeteira/p/ec5c9j2gh4/ep/cfep/')).toBe('ec5c9j2gh4');
    expect(id(magaluProductId, 'https://www.magazineluiza.com.br/celulares/l/te/')).toBeNull();
  });

  it('KaBuM!', () => {
    expect(id(kabumProductId, 'https://www.kabum.com.br/produto/475647/placa-de-video')).toBe('475647');
    expect(id(kabumProductId, 'https://www.kabum.com.br/produto/475647')).toBe('475647');
    expect(id(kabumProductId, 'https://www.kabum.com.br/hardware/placa-de-video-vga')).toBeNull();
  });

  it('Casas Bahia', () => {
    expect(id(casasBahiaProductId, 'https://www.casasbahia.com.br/air-fryer/p/55012345')).toBe('55012345');
    expect(id(casasBahiaProductId, 'https://www.casasbahia.com.br/air-fryer/p/55012345/')).toBe('55012345');
    expect(id(casasBahiaProductId, 'https://www.casasbahia.com.br/eletroportateis/b')).toBeNull();
  });
});

describe('reconhecimento de lojas', () => {
  it.each([
    ['https://www.mercadolivre.com.br/x', 'mercadolivre'],
    ['https://www.amazon.com.br/x', 'amazon'],
    ['https://www.magazineluiza.com.br/x', 'magalu'],
    ['https://www.kabum.com.br/x', 'kabum'],
    ['https://www.casasbahia.com.br/x', 'casasbahia'],
  ])('%s → %s', (href, store) => {
    expect(findAdapter(new URL(href))?.id).toBe(store);
  });

  it('não confunde domínios parecidos', () => {
    for (const href of [
      'https://www.amazon.com/dp/B09B8VGCR8',
      'https://amazon.com.br.promo.xyz/dp/B09B8VGCR8',
      'https://kabum.com.br.falso.net/produto/1',
      'https://www.casasbahia.com.br.golpe.com/p/55012345',
    ]) {
      expect(findAdapter(new URL(href)), href).toBeNull();
    }
  });

  it('cada adaptador tem permissão de host no manifest', () => {
    expect(ADAPTERS).toHaveLength(5);
    expect(HOST_PERMISSIONS).toHaveLength(5);
  });
});
