import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findAdapter } from '../../src/adapters';

/**
 * Roda todos os adaptadores contra as páginas salvas em tests/fixtures/<loja>/.
 * Veja tests/fixtures/README.md para adicionar páginas novas.
 */
const root = join(__dirname, '../fixtures');
const stores = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());

for (const store of stores) {
  describe(`fixtures: ${store.name}`, () => {
    const dir = join(root, store.name);
    const pages = readdirSync(dir).filter((f) => f.endsWith('.html'));
    for (const page of pages) {
      const specPath = join(dir, page.replace(/\.html$/, '.json'));
      it(page, () => {
        expect(existsSync(specPath), `falta ${specPath}`).toBe(true);
        const spec = JSON.parse(readFileSync(specPath, 'utf8')) as {
          url: string;
          expected: Record<string, unknown> | null;
        };
        const html = readFileSync(join(dir, page), 'utf8');
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const url = new URL(spec.url);
        const adapter = findAdapter(url);
        expect(adapter?.id, 'nenhum adaptador reconhece a URL').toBe(store.name);
        const result = adapter!.extract(doc, url);
        if (spec.expected === null) {
          expect(result).toBeNull();
        } else {
          expect(result).toMatchObject(spec.expected);
        }
      });
    }
  });
}
