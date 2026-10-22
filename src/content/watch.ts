import type { StoreAdapter } from '../adapters';
import type { ProductSnapshot } from '../core/types';

export interface WatchOptions {
  /** Espera entre mutações antes de tentar extrair de novo. */
  debounceMs?: number;
  /** Tempo máximo esperando o preço aparecer na primeira vez. */
  timeoutMs?: number;
}

/**
 * Observa a página e chama `onSnapshot` quando os dados do produto aparecem ou mudam
 * (preço carregado depois, troca de variação, navegação sem recarregar).
 * Retorna uma função para parar.
 */
export function watchProduct(
  adapter: StoreAdapter,
  onSnapshot: (snapshot: ProductSnapshot) => void,
  { debounceMs = 600, timeoutMs = 15_000 }: WatchOptions = {},
): () => void {
  let lastSignature = '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let found = false;

  const check = () => {
    const url = new URL(location.href);
    if (!adapter.getProductId(url, document)) return;
    const snapshot = adapter.extract(document, url);
    if (!snapshot) return;
    found = true;
    const signature = [snapshot.productId, snapshot.price, snapshot.listPrice, snapshot.pixPrice].join('|');
    if (signature === lastSignature) return;
    lastSignature = signature;
    onSnapshot(snapshot);
  };

  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(check, debounceMs);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  const giveUp = setTimeout(() => {
    if (!found) stop();
  }, timeoutMs);

  check();

  function stop() {
    observer.disconnect();
    clearTimeout(timer);
    clearTimeout(giveUp);
  }
  return stop;
}
