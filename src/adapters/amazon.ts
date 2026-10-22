import { createAdapter } from './base';

/**
 * Amazon Brasil. O ID é o ASIN (10 caracteres):
 * - www.amazon.com.br/<slug>/dp/B0CX23V2ZK
 * - www.amazon.com.br/dp/B0CX23V2ZK
 * - www.amazon.com.br/gp/product/B0CX23V2ZK
 * A Amazon não publica JSON-LD de produto, então a extração usa os seletores.
 */
export function amazonProductId(url: URL): string | null {
  const match = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/i);
  return match ? match[1]!.toUpperCase() : null;
}

export const amazon = createAdapter({
  id: 'amazon',
  name: 'Amazon',
  hostPattern: /(^|\.)amazon\.com\.br$/,
  getProductId: (url) => amazonProductId(url),
  canonical: (_url, _doc, asin) => `https://www.amazon.com.br/dp/${asin}`,
  selectors: {
    name: ['#productTitle', '#title'],
    price: [
      '#corePriceDisplay_desktop_feature_div .priceToPay .a-offscreen',
      '#corePriceDisplay_desktop_feature_div .priceToPay',
      '#corePrice_feature_div .a-price .a-offscreen',
      '#corePrice_desktop .a-price .a-offscreen',
      '#apex_desktop .priceToPay .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '#price_inside_buybox',
    ],
    listPrice: [
      '#corePriceDisplay_desktop_feature_div .basisPrice .a-offscreen',
      '#corePriceDisplay_desktop_feature_div .a-price[data-a-strike="true"] .a-offscreen',
      '#corePrice_desktop .a-price[data-a-strike="true"] .a-offscreen',
      '#apex_desktop .a-price[data-a-strike="true"] .a-offscreen',
    ],
    image: ['#landingImage', '#imgBlkFront', '#main-image'],
    pix: ['#corePriceDisplay_desktop_feature_div', '#apex_desktop'],
    badgeAnchor: ['#corePriceDisplay_desktop_feature_div .priceToPay', '#corePrice_feature_div .a-price'],
  },
});
