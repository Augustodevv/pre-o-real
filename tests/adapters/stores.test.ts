import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

describe('preço no Pix', () => {
  const page = (body: string) =>
    new DOMParser().parseFromString(
      `<h1>Produto</h1><div id="blocoValores"><h4 class="finalPrice">R$ 1.999,00</h4>${body}</div>`,
      'text/html',
    );
  const url = new URL('https://www.kabum.com.br/produto/1/x');
  const extract = (body: string) => findAdapter(url)!.extract(page(body), url)!;

  it('não confunde a parcela com o preço no Pix', () => {
    expect(extract('<span>à vista no Pix · ou 10x de R$ 199,90 sem juros</span>').pixPrice).toBeNull();
  });

  it('lê "Pix: R$" e "R$ ... no Pix"', () => {
    expect(extract('<span>Pix: R$ 1.899,00</span>').pixPrice).toBe(1899);
    expect(extract('<span>R$ 1.899,05 no Pix</span>').pixPrice).toBe(1899.05);
  });

  it('descarta valor implausível', () => {
    expect(extract('<span>R$ 99,00 no Pix</span>').pixPrice).toBeNull();
  });
});

describe('produto indisponível', () => {
  const url = new URL('https://www.kabum.com.br/produto/1/x');
  const ld = `<script type="application/ld+json">{"@type":"Product","name":"X","offers":{"price":"100.00","availability":"InStock"}}</script>`;
  const extract = (body: string) =>
    findAdapter(url)!.extract(new DOMParser().parseFromString(`${ld}<h1>X</h1>${body}`, 'text/html'), url);

  it('ignora a página com aviso de indisponível, mesmo com JSON-LD em estoque', () => {
    expect(extract('<p class="x">Produto <br> indisponível</p>')).toBeNull();
    expect(extract('<span>Produto Esgotado</span>')).toBeNull();
  });

  it('não confunde com comentários que usam a palavra', () => {
    expect(extract('<p>Comprei quando estava indisponível em outra loja, chegou rápido.</p>')?.price).toBe(100);
  });
});

describe('âncora do selo nas páginas reais', () => {
  it.each([
    ['kabum/real-2026-10-mouse-g203', 'https://www.kabum.com.br/produto/112948/x', 'number-flow-react'],
    ['amazon/real-2026-10-echo-dot', 'https://www.amazon.com.br/dp/B09B8VGCR8', 'R$'],
    ['magalu/real-2026-10-air-fryer', 'https://www.magazineluiza.com.br/x/p/228887000/ep/efso/', '249'],
    ['casasbahia/real-2026-10-air-fryer', 'https://www.casasbahia.com.br/x/p/55032021', '269,09'],
  ])('%s', (fixture, href, contains) => {
    const html = readFileSync(join(__dirname, `../fixtures/${fixture}.html`), 'utf8');
    const anchor = findAdapter(new URL(href))!.findPriceElement(new DOMParser().parseFromString(html, 'text/html'));
    expect(anchor?.outerHTML).toContain(contains);
  });
});
