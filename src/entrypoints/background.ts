import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { fetchSnapshot } from '../background/fetch-snapshot';
import { notifyTargetReached } from '../background/notify';
import { maybeAlert, runChecks, type CheckerDeps } from '../core/checker';
import { getProduct, listProducts, recordSnapshot, updateProduct } from '../core/db';
import { buildProductView } from '../core/view';
import type { Message } from '../messaging';
import { getSettings } from '../settings';

const ALARM = 'verificar-precos';

const deps: CheckerDeps = {
  listProducts,
  fetchSnapshot,
  recordSnapshot,
  updateProduct,
  notify: notifyTargetReached,
  isStoreEnabled: async (store) => (await getSettings()).stores[store],
  now: () => Date.now(),
  // Pequena pausa entre produtos para não fazer rajadas de acesso às lojas.
  pause: () => new Promise((resolve) => setTimeout(resolve, 3000 + Math.random() * 4000)),
};

let running: Promise<unknown> | null = null;
function checkNow() {
  running ??= runChecks(deps).finally(() => {
    running = null;
  });
  return running;
}

export default defineBackground(() => {
  // O alarme sobrevive ao service worker dormir; só criamos se ainda não existir.
  browser.alarms.get(ALARM).then((alarm) => {
    if (!alarm) browser.alarms.create(ALARM, { delayInMinutes: 1, periodInMinutes: 30 });
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM) checkNow().catch((e) => console.error('[Preço Real]', e));
  });

  browser.notifications.onClicked.addListener(async (key) => {
    const product = await getProduct(key);
    if (product) await browser.tabs.create({ url: product.url });
    await browser.notifications.clear(key);
  });

  browser.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
    if (!['capture', 'getProductView', 'runChecks'].includes(message?.type)) return false;
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
      // Visitar a página também conta: avisa se o preço já está no alvo.
      await maybeAlert(product, { notify: notifyTargetReached, updateProduct });
      return buildProductView(product.key);
    }
    case 'getProductView':
      return buildProductView(message.key);
    case 'runChecks':
      return checkNow();
  }
}
