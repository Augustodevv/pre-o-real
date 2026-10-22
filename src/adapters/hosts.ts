import type { StoreId } from '../core/types';

/** Domínios de cada loja. Usado no manifest (host_permissions) e no content script. */
export const STORE_HOSTS: Record<StoreId, string[]> = {
  mercadolivre: ['*://*.mercadolivre.com.br/*'],
  amazon: [],
  magalu: [],
  kabum: [],
  casasbahia: [],
};

export const HOST_PERMISSIONS = Object.values(STORE_HOSTS).flat();
