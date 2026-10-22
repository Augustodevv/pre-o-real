import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { recordSnapshot } from '../core/db';
import { buildProductView } from '../core/view';
import type { Message } from '../messaging';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
    handle(message)
      .then(sendResponse)
      .catch((error) => {
        console.error('[Preço Real]', error);
        sendResponse(null);
      });
    return true; // resposta assíncrona
  });
});

async function handle(message: Message) {
  switch (message.type) {
    case 'capture': {
      const product = await recordSnapshot(message.snapshot);
      return buildProductView(product.key);
    }
    case 'getProductView':
      return buildProductView(message.key);
  }
}
