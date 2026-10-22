import { defineContentScript } from 'wxt/utils/define-content-script';
import { findAdapter } from '../adapters';
import { HOST_PERMISSIONS } from '../adapters/hosts';
import { watchProduct } from '../content/watch';
import { sendMessage, type ProductView } from '../messaging';
import { getSettings, settingsItem } from '../settings';
import { mountBadge, type BadgeHandle } from '../ui/badge/mount';

export default defineContentScript({
  matches: HOST_PERMISSIONS,
  runAt: 'document_idle',
  async main(ctx) {
    const adapter = findAdapter(new URL(location.href));
    if (!adapter) return;
    let settings = await getSettings();
    if (!settings.stores[adapter.id]) return;

    let badge: BadgeHandle | null = null;
    let lastView: ProductView | null = null;
    let stopWatching: (() => void) | null = null;

    const render = () => {
      if (!lastView || !settings.showBadge) {
        badge?.remove();
        badge = null;
        return;
      }
      badge ??= mountBadge();
      badge.update(lastView, adapter.findPriceElement(document));
    };

    const start = () => {
      stopWatching?.();
      lastView = null;
      render();
      stopWatching = watchProduct(adapter, async (snapshot) => {
        lastView = await sendMessage({ type: 'capture', snapshot });
        render();
      });
    };

    // O preço muda de lugar quando imagens carregam ou o layout se ajusta.
    let frame = 0;
    const layoutObserver = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => badge?.reposition(adapter.findPriceElement(document)));
    });
    layoutObserver.observe(document.body);

    const unwatchSettings = settingsItem.watch(async () => {
      settings = await getSettings();
      if (!settings.stores[adapter.id]) lastView = null;
      render();
    });

    start();
    // Lojas que trocam de produto sem recarregar a página.
    ctx.addEventListener(window, 'wxt:locationchange', start);
    ctx.onInvalidated(() => {
      stopWatching?.();
      layoutObserver.disconnect();
      unwatchSettings();
      badge?.remove();
    });
  },
});
