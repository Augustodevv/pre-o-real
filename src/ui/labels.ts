import type { Classification } from '../core/classify';

export interface LabelInfo {
  emoji: string;
  text: string;
  /** Cor principal (texto/borda). */
  color: string;
  /** Cor de fundo clara. */
  background: string;
}

export const LABELS: Record<Classification, LabelInfo> = {
  bom: { emoji: '🟢', text: 'Bom preço', color: '#15803d', background: '#dcfce7' },
  normal: { emoji: '🟡', text: 'Preço normal', color: '#a16207', background: '#fef9c3' },
  alto: { emoji: '🔴', text: 'Preço alto', color: '#b91c1c', background: '#fee2e2' },
  suspeito: { emoji: '⚠️', text: 'Desconto suspeito', color: '#c2410c', background: '#ffedd5' },
  'sem-historico': { emoji: '⚪', text: 'Sem histórico ainda', color: '#475569', background: '#f1f5f9' },
};
