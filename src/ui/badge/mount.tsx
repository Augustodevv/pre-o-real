import { createRoot, type Root } from 'react-dom/client';
import type { ProductView } from '../../messaging';
import { Badge } from './Badge';
import css from './badge.css?inline';
import { placeBadge } from './position';

const TAG = 'preco-real-selo';

export interface BadgeHandle {
  update(view: ProductView, anchor: Element | null): void;
  /** Reposiciona perto do preço (layout da página mudou). */
  reposition(anchor: Element | null): void;
  remove(): void;
}

/**
 * Caixa ocupada pelo conteúdo do elemento (e não pela largura toda de um bloco),
 * para o selo ficar logo depois do texto do preço.
 */
function contentRect(el: Element): DOMRect {
  const range = document.createRange();
  range.selectNodeContents(el);
  const rect = typeof range.getBoundingClientRect === 'function' ? range.getBoundingClientRect() : null;
  return rect && rect.height > 0 ? rect : el.getBoundingClientRect();
}

/**
 * Cria o selo dentro de um Shadow DOM fechado, anexado ao <body>. Ele fica posicionado
 * em absoluto ao lado do preço, sem entrar no fluxo da página, então não quebra o layout.
 * Se não houver preço visível, fica fixo no canto inferior direito.
 */
export function mountBadge(): BadgeHandle {
  const host = document.createElement(TAG);
  host.style.cssText = 'position:absolute;top:0;left:0;z-index:2147483646;display:block;';
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = css;
  const container = document.createElement('div');
  shadow.append(style, container);
  document.body.appendChild(host);
  const root: Root = createRoot(container);

  const reposition = (anchor: Element | null) => {
    const badge = shadow.querySelector('.badge')?.getBoundingClientRect();
    const place = placeBadge(
      anchor ? contentRect(anchor) : null,
      { width: badge?.width ?? 150, height: badge?.height ?? 26 },
      { width: document.documentElement.clientWidth, scrollX: window.scrollX, scrollY: window.scrollY },
    );
    if (place) {
      host.style.position = 'absolute';
      host.style.top = `${place.top}px`;
      host.style.left = `${place.left}px`;
      host.style.right = host.style.bottom = '';
    } else {
      host.style.position = 'fixed';
      host.style.top = host.style.left = '';
      host.style.right = '16px';
      host.style.bottom = '16px';
    }
  };

  let currentAnchor: Element | null = null;
  const onResize = () => reposition(currentAnchor);
  window.addEventListener('resize', onResize);

  return {
    update(view, anchor) {
      currentAnchor = anchor;
      root.render(<Badge view={view} />);
      // Espera o React pintar para medir o tamanho real do selo.
      requestAnimationFrame(() => reposition(anchor));
    },
    reposition(anchor) {
      currentAnchor = anchor;
      reposition(anchor);
    },
    remove() {
      window.removeEventListener('resize', onResize);
      root.unmount();
      host.remove();
    },
  };
}
