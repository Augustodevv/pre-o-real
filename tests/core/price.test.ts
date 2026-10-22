import { describe, expect, it } from 'vitest';
import { formatBRL, formatPercent, parseBRL, parseStructuredPrice } from '../../src/core/price';

describe('parseBRL', () => {
  it.each([
    ['R$ 1.234,56', 1234.56],
    ['R$1.234,5', 1234.5],
    ['1.299', 1299],
    ['12.345.678,90', 12345678.9],
    ['99,90', 99.9],
    ['R$ 89', 89],
    ['  por R$ 2.499,00 à vista', 2499],
    ['', null],
    ['grátis', null],
    ['R$ 0,00', null],
  ])('%s → %s', (input, expected) => {
    expect(parseBRL(input)).toBe(expected);
  });
});

describe('parseStructuredPrice', () => {
  it.each<[unknown, number | null]>([
    [1299.9, 1299.9],
    ['1299.90', 1299.9],
    ['89', 89],
    ['1.234,56', 1234.56],
    [-5, null],
    [null, null],
  ])('%s → %s', (input, expected) => {
    expect(parseStructuredPrice(input)).toBe(expected);
  });
});

describe('formatação', () => {
  it('formata em reais', () => {
    expect(formatBRL(1234.56)).toBe('R$ 1.234,56');
    expect(formatBRL(89.9)).toBe('R$ 89,90');
  });
  it('formata porcentagem', () => {
    expect(formatPercent(-0.125)).toBe('−12,5%');
    expect(formatPercent(0.03)).toBe('+3%');
    expect(formatPercent(0)).toBe('0%');
  });
});
