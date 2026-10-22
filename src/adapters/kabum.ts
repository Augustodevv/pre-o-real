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
  selectors: {
    name: ['h1'],
    price: ['h4.finalPrice', '.finalPrice', 'b.regularPrice'],
    listPrice: ['.oldPrice'],
    image: ['img.iiz__img', '#carouselDetails img'],
    pix: ['#blocoValores', '[class*="priceCard"]'],
    badgeAnchor: ['h4.finalPrice', '.finalPrice'],
  },
});
