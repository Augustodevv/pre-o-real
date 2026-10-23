import { createAdapter } from './base';

/** Casas Bahia: www.casasbahia.com.br/<slug>/p/<id numérico> */
export function casasBahiaProductId(url: URL): string | null {
  const match = url.pathname.match(/\/p\/(\d{5,})(?:\/|$)/);
  return match ? match[1]! : null;
}

export const casasBahia = createAdapter({
  id: 'casasbahia',
  name: 'Casas Bahia',
  hostPattern: /(^|\.)casasbahia\.com\.br$/,
  getProductId: (url) => casasBahiaProductId(url),
  selectors: {
    name: ['h1[data-testid="product-title"]', 'h1'],
    price: ['[data-testid="product-price-value"]', '#product-price', '.product-price-value'],
    // Em 10/2026 o preço "de" aparece como "de R$ X" em data-testid="history-price".
    listPrice: [
      '[data-testid="history-price"]',
      '[data-testid="product-original-price"]',
      '#product-original-price',
      '.product-original-price',
    ],
    image: ['[data-testid="product-image"] img', '.product-image img'],
    pix: ['[data-testid="product-price"]', '#product-price-container', '.product-price'],
    badgeAnchor: ['[data-testid="product-price-value"]', '#product-price'],
  },
});
