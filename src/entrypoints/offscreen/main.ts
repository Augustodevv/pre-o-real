// Documento offscreen: o service worker não tem DOMParser, então a verificação
// automática envia o HTML baixado para cá, onde os mesmos adaptadores extraem o preço.
import { browser } from 'wxt/browser';
import { findAdapter } from '../../adapters';
import type { ParseHtmlMessage } from '../../messaging';

browser.runtime.onMessage.addListener((message: { type?: string }, _sender, sendResponse) => {
  if (message?.type !== 'parse-html') return false;
  const { html, url } = message as ParseHtmlMessage;
  try {
    const pageUrl = new URL(url);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    sendResponse(findAdapter(pageUrl)?.extract(doc, pageUrl) ?? null);
  } catch (error) {
    console.error('[Preço Real]', error);
    sendResponse(null);
  }
  return false;
});
