import { createAdapter } from './base';

/**
 * Mercado Livre. Formatos de URL de produto:
 * - catálogo:  www.mercadolivre.com.br/<slug>/p/MLB25263382
 * - anúncio:   produto.mercadolivre.com.br/MLB-3759516703-<slug>-_JM
 * - "up":      www.mercadolivre.com.br/<slug>/up/MLBU3955245976
 */
export function mercadoLivreProductId(url: URL): string | null {
  const path = url.pathname;
  const catalog = path.match(/\/p\/(MLB\d+)/i);
  if (catalog) return catalog[1]!.toUpperCase();
  const up = path.match(/\/up\/(MLBU\d+)/i);
  if (up) return up[1]!.toUpperCase();
  const item = path.match(/\/(MLB)-?(\d{6,})/i);
  if (item) return `MLB${item[2]}`;
  return null;
}

export const mercadoLivre = createAdapter({
  id: 'mercadolivre',
  name: 'Mercado Livre',
  hostPattern: /(^|\.)mercadolivre\.com\.br$/,
  getProductId: (url) => mercadoLivreProductId(url),
  selectors: {
    name: ['h1.ui-pdp-title'],
    price: [
      '.ui-pdp-price__second-line .andes-money-amount',
      '.ui-pdp-price__main-container .andes-money-amount:not(.andes-money-amount--previous)',
      'meta[itemprop="price"]',
    ],
    listPrice: ['.ui-pdp-price__original-value', '.ui-pdp-price .andes-money-amount--previous'],
    image: ['img.ui-pdp-gallery__figure__image', '.ui-pdp-gallery img'],
    pix: ['.ui-pdp-price__subtitles', '.ui-pdp-price'],
  },
});
