import { daysBetween } from './dates';
import type { PriceRecord } from './types';

export type Classification = 'bom' | 'normal' | 'alto' | 'suspeito' | 'sem-historico';

/** Limites das regras. Ajuste aqui. */
export const RULES = {
  /** Dias distintos de registro necessários para classificar. */
  minDays: 3,
  /** Janela usada para a média. */
  windowDays: 30,
  /** Margem em torno da média considerada "normal" (±5%). */
  normalBand: 0.05,
  /** O preço "de" pode ficar até 2% acima do maior registro sem ser suspeito. */
  listPriceTolerance: 0.02,
  /** Dias antes de hoje observados para detectar aumento antes da promoção. */
  preRaiseDays: 7,
  /** Aumento mínimo nesse período para ser considerado maquiagem. */
  preRaiseMin: 0.1,
  /** A "promoção" só é suspeita se não ficar mais de 5% abaixo do preço anterior ao aumento. */
  preRaiseReturnBand: 0.05,
} as const;

export interface PriceStats {
  /** Quantidade de dias com registro. */
  days: number;
  min: number;
  minDay: string;
  max: number;
  maxDay: string;
  /** Média dos últimos 30 dias, sem contar hoje. Null se não houver dias anteriores. */
  average30: number | null;
}

export interface Verdict {
  classification: Classification;
  /** Frase curta explicando o motivo, para exibir ao usuário. */
  reason: string;
  stats: PriceStats | null;
}

export function computeStats(history: PriceRecord[], today: string): PriceStats | null {
  if (history.length === 0) return null;
  let min = history[0]!;
  let max = history[0]!;
  for (const r of history) {
    if (r.price < min.price) min = r;
    if (r.price > max.price) max = r;
  }
  const window = history.filter((r) => {
    const age = daysBetween(r.day, today);
    return age > 0 && age <= RULES.windowDays;
  });
  return {
    days: history.length,
    min: min.price,
    minDay: min.day,
    max: max.price,
    maxDay: max.day,
    average30: window.length ? mean(window.map((r) => r.price)) : null,
  };
}

/**
 * Classifica o preço atual com base no histórico (que já deve incluir o registro de hoje).
 */
export function classify(
  history: PriceRecord[],
  current: { price: number; listPrice: number | null },
  today: string,
): Verdict {
  const sorted = [...history].sort((a, b) => a.day.localeCompare(b.day));
  const stats = computeStats(sorted, today);
  if (!stats || stats.days < RULES.minDays || stats.average30 === null) {
    const faltam = RULES.minDays - (stats?.days ?? 0);
    return {
      classification: 'sem-historico',
      reason:
        faltam > 0
          ? `Ainda estamos aprendendo: ${faltam === 1 ? 'falta 1 dia' : `faltam ${faltam} dias`} de registro para comparar.`
          : 'Sem registros recentes suficientes para comparar.',
      stats,
    };
  }

  const previous = sorted.filter((r) => r.day < today);
  const suspicious = detectSuspicious(previous, current, today);
  if (suspicious) return { classification: 'suspeito', reason: suspicious, stats };

  const avg = stats.average30;
  const diff = (current.price - avg) / avg;
  if (diff < -RULES.normalBand) {
    return { classification: 'bom', reason: `${pct(-diff)} abaixo da média dos últimos 30 dias.`, stats };
  }
  if (diff > RULES.normalBand) {
    return { classification: 'alto', reason: `${pct(diff)} acima da média dos últimos 30 dias.`, stats };
  }
  return { classification: 'normal', reason: 'Dentro da média dos últimos 30 dias.', stats };
}

function detectSuspicious(
  previous: PriceRecord[],
  current: { price: number; listPrice: number | null },
  today: string,
): string | null {
  if (previous.length === 0) return null;
  const onSale = current.listPrice !== null && current.listPrice > current.price;

  // 1) Preço "de" maior do que qualquer preço já visto.
  const maxEver = Math.max(...previous.map((r) => r.price));
  if (onSale && current.listPrice! > maxEver * (1 + RULES.listPriceTolerance)) {
    return 'O preço "de" riscado é maior do que qualquer preço que já registramos para este produto.';
  }

  // 2) Preço subiu nos dias anteriores e a "promoção" só o trouxe de volta.
  const recent = previous.filter((r) => daysBetween(r.day, today) <= RULES.preRaiseDays);
  const before = previous.filter((r) => daysBetween(r.day, today) > RULES.preRaiseDays);
  if (recent.length === 0 || before.length === 0) return null;
  const baseline = median(before.map((r) => r.price));
  const peak = Math.max(...recent.map((r) => r.price));
  const raised = peak >= baseline * (1 + RULES.preRaiseMin);
  const looksLikePromo = onSale || current.price < peak;
  const notReallyCheaper = current.price >= baseline * (1 - RULES.preRaiseReturnBand);
  if (raised && looksLikePromo && notReallyCheaper) {
    return `O preço subiu ${pct((peak - baseline) / baseline)} nos dias anteriores à promoção.`;
  }
  return null;
}

function mean(values: number[]): number {
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function pct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
