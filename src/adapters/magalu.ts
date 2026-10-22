import { createAdapter } from './base';

/**
 * Magazine Luiza: www.magazineluiza.com.br/<slug>/p/<id>/<categoria>/<subcategoria>/
 * O ID pode ter letras e números (ex.: 237645600, ec5c9j2gh4).
 */
export function magaluProductId(url: URL): string | null {
  const match = url.pathname.match(/\/p\/([a-z0-9]{6,})(?:\/|$)/i);
  return match ? match[1]!.toLowerCase() : null;
}

export const magalu = createAdapter({
  id: 'magalu',
  name: 'Magazine Luiza',
  hostPattern: /(^|\.)magazineluiza\.com\.br$/,
  getProductId: (url) => magaluProductId(url),
  selectors: {
    name: ['h1[data-testid="heading-product-title"]', 'h1'],
    price: ['[data-testid="price-value"]', '[data-testid="price-default"]'],
    listPrice: ['[data-testid="price-original"]'],
    image: ['img[data-testid="image-selected-thumbnail"]', '[data-testid="media-gallery-image"]'],
    pix: ['[data-testid="price-container"]', '[data-testid="mod-productprice"]'],
    badgeAnchor: ['[data-testid="price-value"]'],
  },
});
