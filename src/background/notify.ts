import { browser } from 'wxt/browser';
import { formatBRL } from '../core/price';
import type { Product } from '../core/types';

export async function notifyTargetReached(product: Product): Promise<void> {
  await browser.notifications.create(product.key, {
    type: 'basic',
    iconUrl: browser.runtime.getURL('/icon/128.png'),
    title: 'Preço Real: o preço baixou!',
    message: `${product.name} está por ${formatBRL(product.lastPrice)} (seu alvo: ${formatBRL(product.targetPrice!)}).`,
    contextMessage: 'Clique para abrir o produto',
    priority: 2,
  });
}
