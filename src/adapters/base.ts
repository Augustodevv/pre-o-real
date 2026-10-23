import { parseBRL, parseStructuredPrice } from '../core/price';
import type { ProductSnapshot, StoreId } from '../core/types';
import type { StoreAdapter } from './types';

/** Dados de produto encontrados em JSON-LD (schema.org Product/Offer). */
export interface StructuredProduct {
  name: string | null;
  price: number | null;
  listPrice: number | null;
  image: string | null;
  sku: string | null;
  url: string | null;
}

const EMPTY: StructuredProduct = { name: null, price: null, listPrice: null, image: null, sku: null, url: null };

/** 1) JSON-LD: procura um objeto Product (inclusive dentro de @graph e listas). */
export function readJsonLd(doc: Document): StructuredProduct {
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    let data: unknown;
    try {
      data = JSON.parse(script.textContent ?? '');
    } catch {
      continue;
    }
    const product = findProduct(data);
    if (product) return fromSchemaProduct(product);
  }
  return EMPTY;
}

type Json = Record<string, unknown>;

function findProduct(node: unknown, depth = 0): Json | null {
  if (!node || typeof node !== 'object' || depth > 5) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findProduct(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const obj = node as Json;
  const type = obj['@type'];
  const types = Array.isArray(type) ? type : [type];
  if (types.some((t) => t === 'Product' || t === 'ProductGroup')) return obj;
  return findProduct(obj['@graph'], depth + 1);
}

function fromSchemaProduct(p: Json): StructuredProduct {
  const offers = asArray(p.offers).flatMap((o) => {
    const offer = o as Json;
    // AggregateOffer pode conter `offers` internas.
    return offer?.['@type'] === 'AggregateOffer' && offer.offers ? asArray(offer.offers) : [offer];
  }) as Json[];

  let price: number | null = null;
  let listPrice: number | null = null;
  for (const offer of offers) {
    if (!offer) continue;
    if (offer.availability && /OutOfStock|Discontinued/i.test(String(offer.availability))) continue;
    const value =
      parseStructuredPrice(offer.price) ??
      parseStructuredPrice(offer.lowPrice) ??
      parseStructuredPrice((offer.priceSpecification as Json | undefined)?.price);
    if (value !== null && (price === null || value < price)) price = value;
    for (const spec of asArray(offer.priceSpecification) as Json[]) {
      if (spec && /StrikethroughPrice|ListPrice/i.test(String(spec.priceType ?? ''))) {
        listPrice = parseStructuredPrice(spec.price) ?? listPrice;
      }
    }
  }

  const image = asArray(p.image)[0];
  return {
    name: typeof p.name === 'string' ? clean(p.name) : null,
    price,
    listPrice,
    image: typeof image === 'string' ? image : typeof (image as Json)?.url === 'string' ? ((image as Json).url as string) : null,
    sku: typeof p.sku === 'string' ? p.sku : typeof p.productID === 'string' ? p.productID : null,
    url: typeof p.url === 'string' ? p.url : null,
  };
}

/** 2) Meta tags: Open Graph, product:price e itemprop. */
export function readMeta(doc: Document): StructuredProduct {
  const meta = (selector: string) => doc.querySelector<HTMLMetaElement>(selector)?.content?.trim() || null;
  const priceText =
    meta('meta[property="product:price:amount"]') ??
    meta('meta[property="og:price:amount"]') ??
    meta('meta[itemprop="price"]');
  return {
    name: meta('meta[property="og:title"]'),
    price: parseStructuredPrice(priceText),
    listPrice: null,
    image: meta('meta[property="og:image"]'),
    sku: meta('meta[itemprop="sku"]') ?? meta('meta[property="product:retailer_item_id"]'),
    url: meta('meta[property="og:url"]'),
  };
}

/** Lê o primeiro preço encontrado entre os seletores. */
export function readPrice(doc: Document | Element, selectors: string[]): number | null {
  for (const selector of selectors) {
    for (const el of doc.querySelectorAll(selector)) {
      const value = readMoneyElement(el);
      if (value !== null) return value;
    }
  }
  return null;
}

/**
 * Lê um preço de um elemento. Entende o padrão "andes-money-amount" (fração + centavos
 * em elementos separados), atributos `content`/`aria-label` e texto simples.
 */
export function readMoneyElement(el: Element): number | null {
  // Componente de número animado (<number-flow-react>, usado pela KaBuM): o texto visível
  // tem todos os dígitos da animação; o valor certo fica no atributo "data".
  if (el.tagName === 'NUMBER-FLOW-REACT') {
    try {
      return parseStructuredPrice((JSON.parse(el.getAttribute('data') ?? '{}') as { value?: unknown }).value);
    } catch {
      return null;
    }
  }
  const fraction = el.querySelector('[class*="money-amount__fraction"]');
  if (fraction) {
    const cents = el.querySelector('[class*="money-amount__cents"]')?.textContent?.trim() ?? '00';
    return parseBRL(`${fraction.textContent?.trim()},${cents.padEnd(2, '0')}`);
  }
  const content = el.getAttribute('content');
  if (content) return parseStructuredPrice(content);
  return parseBRL(el.textContent);
}

export function readText(doc: Document, selectors: string[]): string | null {
  for (const selector of selectors) {
    const text = doc.querySelector(selector)?.textContent;
    if (text?.trim()) return clean(text);
  }
  return null;
}

export function readImage(doc: Document, selectors: string[]): string | null {
  for (const selector of selectors) {
    const img = doc.querySelector<HTMLImageElement>(selector);
    const src =
      img?.getAttribute('data-zoom') || img?.getAttribute('data-old-hires') || img?.getAttribute('src');
    if (src && !src.startsWith('data:')) return src;
  }
  return null;
}

export function canonicalUrl(doc: Document, url: URL): string {
  const href = doc.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href');
  try {
    const canonical = new URL(href ?? url.href, url.href);
    canonical.search = '';
    canonical.hash = '';
    return canonical.href;
  } catch {
    return `${url.origin}${url.pathname}`;
  }
}

/** Procura um preço escrito perto da palavra "Pix" (ex.: "R$ 1.099,90 no Pix"). */
export function readPixPrice(doc: Document, containerSelectors: string[]): number | null {
  for (const selector of containerSelectors) {
    for (const el of doc.querySelectorAll(selector)) {
      const text = el.textContent?.replace(/\s+/g, ' ') ?? '';
      const match =
        text.match(/R\$\s*([\d.]+,\d{2})\s*(?:à vista\s*)?(?:no|via|com)\s*(?:o\s*)?pix/i) ??
        // "Pix: R$ 99,90" — sem números no meio, para não pegar parcelas ("no Pix ou 10x de R$ 19,90").
        text.match(/pix[^R\d]{0,20}R\$\s*([\d.]+,\d{2})/i);
      if (match) return parseBRL(match[1]);
    }
  }
  return null;
}

const UNAVAILABLE = /^(?:este\s+)?produto\s+(?:est[aá]\s+)?(?:indispon[ií]vel|esgotado)\.?$/i;

/**
 * A página mostra um aviso de produto indisponível/esgotado? Algumas lojas mantêm o
 * JSON-LD "InStock" com o último preço mesmo assim (visto na Magazine Luiza em 10/2026).
 * Só conta um elemento curto cujo texto inteiro é o aviso, para não confundir com
 * comentários de clientes que usem a palavra.
 */
export function hasUnavailableNotice(doc: Document): boolean {
  for (const el of doc.querySelectorAll('p, span, h2, h3, h4, strong, b, div')) {
    const text = el.textContent;
    if (!text || text.length > 60) continue;
    if (UNAVAILABLE.test(text.replace(/\s+/g, ' ').trim())) return true;
  }
  return false;
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

const PIX_MIN_RATIO = 0.7;

export interface AdapterConfig {
  id: StoreId;
  name: string;
  hostPattern: RegExp;
  getProductId(url: URL, doc: Document): string | null;
  /** URL canônica própria da loja. Padrão: <link rel="canonical"> sem parâmetros. */
  canonical?(url: URL, doc: Document, productId: string): string;
  selectors: {
    name: string[];
    price: string[];
    listPrice: string[];
    image: string[];
    /** Onde procurar o texto "no Pix". */
    pix?: string[];
    /**
     * Total a prazo no cartão (ex.: "ou R$ 262,11 em 6x"). Algumas lojas riscam esse valor
     * como se fosse o preço "de", quando na verdade é só a diferença do desconto no Pix.
     */
    cardTotal?: string[];
    /** Onde ancorar o selo. Padrão: os seletores de preço. Prefira a linha inteira do preço. */
    badgeAnchor?: string[];
  };
}

/**
 * Cria um adaptador que segue a prioridade: JSON-LD → meta tags → seletores CSS.
 * O preço "de" e o preço no Pix normalmente só existem no HTML, então vêm dos seletores.
 */
export function createAdapter(config: AdapterConfig): StoreAdapter {
  return {
    id: config.id,
    name: config.name,
    matches: (url) => config.hostPattern.test(url.hostname),
    getProductId: config.getProductId,
    findPriceElement(doc) {
      for (const selector of [...(config.selectors.badgeAnchor ?? []), ...config.selectors.price]) {
        if (selector.startsWith('meta')) continue;
        const el = doc.querySelector(selector);
        if (el) return el;
      }
      return null;
    },
    extract(doc, url) {
      const productId = config.getProductId(url, doc);
      if (!productId) return null;
      if (hasUnavailableNotice(doc)) return null;
      const ld = readJsonLd(doc);
      const meta = readMeta(doc);
      const { selectors } = config;

      const price = ld.price ?? meta.price ?? readPrice(doc, selectors.price);
      if (price === null) return null;
      const name = ld.name ?? readText(doc, selectors.name) ?? meta.name;
      if (!name) return null;

      let listPrice = ld.listPrice ?? readPrice(doc, selectors.listPrice);
      if (listPrice !== null && listPrice <= price) listPrice = null;
      // O "de" riscado igual ao total no cartão não é preço antigo, é o preço a prazo.
      const cardTotal = selectors.cardTotal ? readPrice(doc, selectors.cardTotal) : null;
      if (listPrice !== null && cardTotal !== null && Math.abs(listPrice - cardTotal) < 0.02) listPrice = null;
      let pixPrice = selectors.pix ? readPixPrice(doc, selectors.pix) : null;
      // Desconto no Pix acima de 30% é improvável: provavelmente lemos outro valor (parcela, frete).
      if (pixPrice !== null && (pixPrice >= price || pixPrice < price * PIX_MIN_RATIO)) pixPrice = null;

      return {
        store: config.id,
        productId,
        name,
        price,
        listPrice,
        pixPrice,
        imageUrl: ld.image ?? meta.image ?? readImage(doc, selectors.image),
        url: config.canonical?.(url, doc, productId) ?? canonicalUrl(doc, url),
      };
    },
  };
}
