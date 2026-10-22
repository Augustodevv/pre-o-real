import { defineContentScript } from 'wxt/utils/define-content-script';
import { findAdapter } from '../adapters';
import { HOST_PERMISSIONS } from '../adapters/hosts';
import { watchProduct } from '../content/watch';
import { formatBRL } from '../core/price';
import { sendMessage } from '../messaging';
import { getSettings } from '../settings';

export default defineContentScript({
  matches: HOST_PERMISSIONS,
  runAt: 'document_idle',
  async main(ctx) {
    const adapter = findAdapter(new URL(location.href));
    if (!adapter) return;
    const settings = await getSettings();
    if (!settings.stores[adapter.id]) return;

    let stop: (() => void) | null = null;
    const start = () => {
      stop?.();
      stop = watchProduct(adapter, async (snapshot) => {
        const view = await sendMessage({ type: 'capture', snapshot });
        console.info(
          `[Preço Real] ${adapter.name}: ${snapshot.name} — ${formatBRL(snapshot.price)}`,
          view?.verdict,
        );
      });
    };

    start();
    // Lojas que trocam de produto sem recarregar a página.
    ctx.addEventListener(window, 'wxt:locationchange', start);
    ctx.onInvalidated(() => stop?.());
  },
});
