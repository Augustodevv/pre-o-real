import { storage } from 'wxt/utils/storage';

/**
 * ID aleatório desta instalação, usado só para o servidor limitar envios.
 * Não tem relação com a pessoa; o servidor guarda apenas o hash dele.
 */
const installationItem = storage.defineItem<string>('local:installationId', {
  init: () => crypto.randomUUID(),
});

export function getInstallationId(): Promise<string> {
  return installationItem.getValue();
}
