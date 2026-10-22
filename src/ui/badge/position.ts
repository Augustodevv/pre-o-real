export interface Rect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  height: number;
}

export interface Placement {
  top: number;
  left: number;
}

const GAP = 8;

/**
 * Calcula onde colocar o selo (coordenadas da página): à direita do preço; se não couber,
 * logo abaixo dele. Retorna null quando não há elemento de preço visível.
 */
export function placeBadge(
  anchor: Rect | null,
  badge: { width: number; height: number },
  viewport: { width: number; scrollX: number; scrollY: number },
): Placement | null {
  if (!anchor || anchor.height === 0) return null;
  const fitsRight = anchor.right + GAP + badge.width <= viewport.width - GAP;
  if (fitsRight) {
    return {
      top: Math.round(anchor.top + viewport.scrollY + anchor.height / 2 - badge.height / 2),
      left: Math.round(anchor.right + viewport.scrollX + GAP),
    };
  }
  return {
    top: Math.round(anchor.bottom + viewport.scrollY + GAP / 2),
    left: Math.round(Math.max(GAP, Math.min(anchor.left, viewport.width - badge.width - GAP)) + viewport.scrollX),
  };
}
