const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 1234.56 → "R$ 1.234,56" */
export function formatBRL(value: number): string {
  // Intl usa espaço não separável entre "R$" e o número; trocamos por espaço comum.
  return brl.format(value).replace(/ /g, ' ');
}

/** Variação percentual formatada: -12,5% / +3% */
export function formatPercent(fraction: number): string {
  const pct = fraction * 100;
  const text = Math.abs(pct).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  if (Math.abs(pct) < 0.05) return '0%';
  return `${pct > 0 ? '+' : '−'}${text}%`;
}

/**
 * Interpreta um preço escrito no formato brasileiro ("R$ 1.234,56", "1.234", "99,9").
 * Retorna null se não houver número válido e positivo.
 */
export function parseBRL(input: string | null | undefined): number | null {
  if (!input) return null;
  const match = input.replace(/\s+/g, ' ').match(/\d[\d.\s]*(,\d{1,2})?/);
  if (!match) return null;
  let text = match[0].replace(/\s/g, '');
  if (text.includes(',')) {
    text = text.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, '');
  } else {
    text = text.replace(/\.$/, '');
  }
  return toPositive(Number(text));
}

/**
 * Interpreta um número vindo de dados estruturados (JSON-LD, meta tags), que usam
 * ponto como separador decimal ("1299.90"). Aceita também o formato brasileiro.
 */
export function parseStructuredPrice(input: unknown): number | null {
  if (typeof input === 'number') return toPositive(input);
  if (typeof input !== 'string') return null;
  const text = input.trim();
  if (/^\d+(\.\d+)?$/.test(text)) return toPositive(Number(text));
  return parseBRL(text);
}

function toPositive(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}
