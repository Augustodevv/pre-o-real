import type { StoreId } from '../core/types';
import { amazon } from './amazon';
import { casasBahia } from './casasbahia';
import { kabum } from './kabum';
import { magalu } from './magalu';
import { mercadoLivre } from './mercadolivre';
import type { StoreAdapter } from './types';

export const ADAPTERS: StoreAdapter[] = [mercadoLivre, amazon, magalu, kabum, casasBahia];

export const STORE_NAMES: Record<StoreId, string> = {
  mercadolivre: 'Mercado Livre',
  amazon: 'Amazon',
  magalu: 'Magazine Luiza',
  kabum: 'KaBuM!',
  casasbahia: 'Casas Bahia',
};

export function findAdapter(url: URL): StoreAdapter | null {
  return ADAPTERS.find((a) => a.matches(url)) ?? null;
}

export function getAdapter(id: StoreId): StoreAdapter | null {
  return ADAPTERS.find((a) => a.id === id) ?? null;
}

export type { StoreAdapter } from './types';
