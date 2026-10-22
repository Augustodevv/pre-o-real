import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { HOST_PERMISSIONS } from './src/adapters/hosts';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Preço Real',
    description:
      'Histórico de preços das lojas online brasileiras. Descubra se o desconto é de verdade.',
    permissions: ['storage', 'alarms', 'notifications', 'offscreen'],
    host_permissions: HOST_PERMISSIONS,
  },
});
