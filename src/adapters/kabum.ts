import { createAdapter } from './base';

/** KaBuM!: www.kabum.com.br/produto/<id numérico>/<slug> */
export function kabumProductId(url: URL): string | null {
  const match = url.pathname.match(/\/produto\/(\d+)(?:\/|$)/);
  return match ? match[1]! : null;
}

export const kabum = createAdapter({
  id: 'kabum',
  name: 'KaBuM!',
  hostPattern: /(^|\.)kabum\.com\.br$/,
  getProductId: (url) => kabumProductId(url),
  // Layout de 2026 (Tailwind, sem classes com nome): o preço fica num <number-flow-react>
  // e o preço "de" num span "line-through". Os seletores antigos ficam como alternativa.
  selectors: {
    name: ['h1'],
    price: ['number-flow-react', 'h4.finalPrice', '.finalPrice', 'b.regularPrice'],
    listPrice: ['span.line-through', '.oldPrice'],
    image: ['img.iiz__img', '#carouselDetails img'],
    pix: ['#blocoValores', '[class*="priceCard"]'],
    badgeAnchor: ['p:has(> number-flow-react)', 'number-flow-react', 'h4.finalPrice', '.finalPrice'],
  },
});
