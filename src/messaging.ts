import { browser } from 'wxt/browser';
import type { CheckResult } from './core/checker';
import type { Verdict } from './core/classify';
import type { PriceRecord, Product, ProductSnapshot } from './core/types';

/** Mensagens tratadas pelo background. */
export type Message =
  | { type: 'capture'; snapshot: ProductSnapshot }
  | { type: 'getProductView'; key: string }
  | { type: 'runChecks' };

/** Mensagem tratada pelo documento offscreen (leitura de HTML). */
export interface ParseHtmlMessage {
  type: 'parse-html';
  html: string;
  url: string;
}

export interface ProductView {
  product: Product;
  history: PriceRecord[];
  verdict: Verdict;
  /** Dias do histórico que vieram do histórico compartilhado. */
  communityDays: number;
  /** O usuário participa do histórico compartilhado. */
  sharing: boolean;
}

export type Response<M extends Message | ParseHtmlMessage> = M extends { type: 'capture' | 'getProductView' }
  ? ProductView | null
  : M extends { type: 'runChecks' }
    ? CheckResult
    : M extends { type: 'parse-html' }
      ? ProductSnapshot | null
      : never;

export function sendMessage<M extends Message | ParseHtmlMessage>(message: M): Promise<Response<M>> {
  return browser.runtime.sendMessage(message) as Promise<Response<M>>;
}
