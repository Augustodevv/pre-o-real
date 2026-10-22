import { browser } from 'wxt/browser';
import type { Verdict } from './core/classify';
import type { PriceRecord, Product, ProductSnapshot } from './core/types';

export type Message =
  | { type: 'capture'; snapshot: ProductSnapshot }
  | { type: 'getProductView'; key: string };

export interface ProductView {
  product: Product;
  history: PriceRecord[];
  verdict: Verdict;
}

export type Response<M extends Message> = M extends { type: 'capture' | 'getProductView' }
  ? ProductView | null
  : never;

export function sendMessage<M extends Message>(message: M): Promise<Response<M>> {
  return browser.runtime.sendMessage(message) as Promise<Response<M>>;
}
