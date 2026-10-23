import { storage } from 'wxt/utils/storage';
import type { StoreId } from './core/types';

export interface Settings {
  /** Mostrar o selo nas páginas de produto. */
  showBadge: boolean;
  /** Lojas ativas. */
  stores: Record<StoreId, boolean>;
  /** Participar do histórico compartilhado (opcional, desligado por padrão). */
  shareHistory: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  showBadge: true,
  stores: { mercadolivre: true, amazon: true, magalu: true, kabum: true, casasbahia: true },
  shareHistory: false,
};

export const settingsItem = storage.defineItem<Settings>('sync:settings', {
  fallback: DEFAULT_SETTINGS,
});

export async function getSettings(): Promise<Settings> {
  const saved = await settingsItem.getValue();
  return { ...DEFAULT_SETTINGS, ...saved, stores: { ...DEFAULT_SETTINGS.stores, ...saved.stores } };
}
