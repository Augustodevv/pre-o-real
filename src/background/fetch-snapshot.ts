import { browser } from 'wxt/browser';
import { sendMessage } from '../messaging';
import type { Product, ProductSnapshot } from '../core/types';

const OFFSCREEN_URL = 'offscreen.html';
let creating: Promise<void> | null = null;

async function ensureOffscreen(): Promise<void> {
  const contexts = await browser.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT' as Browser.runtime.ContextType],
    documentUrls: [browser.runtime.getURL(`/${OFFSCREEN_URL}`)],
  });
  if (contexts.length > 0) return;
  creating ??= browser.offscreen
    .createDocument({
      url: OFFSCREEN_URL,
      reasons: ['DOM_PARSER' as Browser.offscreen.Reason],
      justification: 'Ler o preço de páginas de produto baixadas na verificação automática.',
    })
    .finally(() => {
      creating = null;
    });
  await creating;
}

/** Baixa a página do produto e extrai o preço com o adaptador da loja. */
export async function fetchSnapshot(product: Product): Promise<ProductSnapshot> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  let html: string;
  try {
    const response = await fetch(product.url, {
      signal: controller.signal,
      headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' },
    });
    if (!response.ok) throw new Error(`A loja respondeu com erro ${response.status}.`);
    html = await response.text();
  } catch (error) {
    if (controller.signal.aborted) throw new Error('A loja demorou demais para responder.');
    throw error instanceof Error && error.message.startsWith('A loja') ? error : new Error('Sem conexão com a loja.');
  } finally {
    clearTimeout(timeout);
  }

  await ensureOffscreen();
  const snapshot = await sendMessage({ type: 'parse-html', html, url: product.url });
  if (!snapshot) {
    throw new Error('Não foi possível ler o preço (a loja pode ter mudado a página ou bloqueado a verificação).');
  }
  return snapshot;
}
