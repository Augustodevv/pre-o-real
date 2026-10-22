import type { Product, ProductSnapshot, StoreId } from './types';

/** Intervalo mínimo entre verificações automáticas do mesmo produto (inclusive após falha). */
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
/** Máximo de produtos verificados por rodada, para não sobrecarregar as lojas. */
export const MAX_CHECKS_PER_RUN = 5;

export interface CheckerDeps {
  listProducts(): Promise<Product[]>;
  /** Baixa a página e extrai os dados. Lança erro se não conseguir. */
  fetchSnapshot(product: Product): Promise<ProductSnapshot>;
  recordSnapshot(snapshot: ProductSnapshot, now: number): Promise<Product>;
  updateProduct(key: string, changes: Partial<Product>): Promise<Product | undefined>;
  notify(product: Product): Promise<void>;
  isStoreEnabled(store: StoreId): Promise<boolean>;
  now(): number;
  /** Espera entre um produto e outro. */
  pause?(): Promise<void>;
}

export interface CheckResult {
  checked: number;
  failed: number;
  alerted: number;
}

export function isDue(product: Product, now: number): boolean {
  return product.tracked && (product.lastCheckAt === null || now - product.lastCheckAt >= CHECK_INTERVAL_MS);
}

/** O preço atual atingiu o alvo e ainda não avisamos por este preço (ou um menor)? */
export function shouldAlert(product: Product): boolean {
  if (!product.tracked || product.targetPrice === null) return false;
  if (product.lastPrice > product.targetPrice) return false;
  return product.alertedPrice === null || product.lastPrice < product.alertedPrice;
}

/**
 * Notifica se o preço atingiu o alvo. Quando o preço volta a subir acima do alvo,
 * limpa o registro para avisar de novo numa próxima queda.
 */
export async function maybeAlert(
  product: Product,
  deps: Pick<CheckerDeps, 'notify' | 'updateProduct'>,
): Promise<boolean> {
  if (shouldAlert(product)) {
    await deps.notify(product);
    await deps.updateProduct(product.key, { alertedPrice: product.lastPrice });
    return true;
  }
  if (product.alertedPrice !== null && product.targetPrice !== null && product.lastPrice > product.targetPrice) {
    await deps.updateProduct(product.key, { alertedPrice: null });
  }
  return false;
}

/**
 * Verifica os produtos acompanhados que estão há 6 horas ou mais sem verificação.
 * Um por vez; falhas são registradas e o produto volta à fila na próxima janela.
 */
export async function runChecks(deps: CheckerDeps): Promise<CheckResult> {
  const now = deps.now();
  const due = (await deps.listProducts())
    .filter((p) => isDue(p, now))
    .sort((a, b) => (a.lastCheckAt ?? 0) - (b.lastCheckAt ?? 0))
    .slice(0, MAX_CHECKS_PER_RUN);

  const result: CheckResult = { checked: 0, failed: 0, alerted: 0 };
  for (const [i, product] of due.entries()) {
    if (!(await deps.isStoreEnabled(product.store))) continue;
    if (i > 0) await deps.pause?.();
    try {
      const snapshot = await deps.fetchSnapshot(product);
      if (snapshot.store !== product.store || snapshot.productId !== product.productId) {
        throw new Error('A página verificada é de outro produto.');
      }
      const updated = await deps.recordSnapshot(snapshot, deps.now());
      await deps.updateProduct(product.key, { lastCheckAt: now, lastCheckError: null });
      result.checked++;
      if (await maybeAlert({ ...updated, lastCheckAt: now, lastCheckError: null }, deps)) result.alerted++;
    } catch (error) {
      result.failed++;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[Preço Real] Falha ao verificar ${product.key}: ${message}`);
      await deps.updateProduct(product.key, { lastCheckAt: now, lastCheckError: message });
    }
  }
  return result;
}
