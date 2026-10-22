// Teste de ponta a ponta: carrega a extensão compilada no Chromium, abre as fixtures
// como se fossem páginas reais das lojas (requisições interceptadas, sem acessar a internet)
// e confere o que foi salvo no IndexedDB.
// Uso: pnpm build && node scripts/e2e.mjs
import { chromium } from 'playwright';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const extensionPath = resolve('.output/chrome-mv3');
const fixturesDir = resolve('tests/fixtures');

const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'preco-real-')), {
  channel: 'chromium', // o headless-shell não suporta extensões
  headless: true,
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
});

const pages = [];
for (const store of readdirSync(fixturesDir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  for (const file of readdirSync(join(fixturesDir, store.name)).filter((f) => f.endsWith('.html'))) {
    const spec = JSON.parse(readFileSync(join(fixturesDir, store.name, file.replace('.html', '.json')), 'utf8'));
    pages.push({ store: store.name, file, spec, html: readFileSync(join(fixturesDir, store.name, file), 'utf8') });
  }
}

await context.route(/^https?:\/\//, (route) => {
  const url = route.request().url();
  const page = pages.find((p) => p.spec.url.split('#')[0] === url);
  if (page) return route.fulfill({ contentType: 'text/html; charset=utf-8', body: page.html });
  if (route.request().resourceType() === 'document') return route.fulfill({ status: 404, body: '' });
  return route.abort();
});

let worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
const extensionId = new URL(worker.url()).host;

for (const p of pages) {
  const tab = await context.newPage();
  await tab.goto(p.spec.url);
  await tab.waitForTimeout(1500);
  await tab.close();
}

const popup = await context.newPage();
await popup.goto(`chrome-extension://${extensionId}/popup.html`);
const products = await popup.evaluate(
  () =>
    new Promise((res, rej) => {
      const req = indexedDB.open('preco-real');
      req.onerror = () => rej(req.error);
      req.onsuccess = () => {
        const all = req.result.transaction('products').objectStore('products').getAll();
        all.onsuccess = () => res(all.result);
      };
    }),
);

let failures = 0;
for (const p of pages) {
  const expected = p.spec.expected;
  const saved = products.find((x) => expected && x.productId === expected.productId);
  const ok = expected === null ? !products.some((x) => p.spec.url.includes(x.productId)) : saved?.lastPrice === expected.price;
  if (!ok) failures++;
  console.log(`${ok ? '✔' : '✘'} ${p.store}/${p.file}${saved ? ` → ${saved.name} (${saved.lastPrice})` : ''}`);
}

await popup.setViewportSize({ width: 380, height: 480 });
await popup.reload();
await popup.waitForTimeout(500);
await popup.screenshot({ path: process.env.SCREENSHOT ?? '.output/popup.png' });

await context.close();
console.log(failures ? `\n${failures} falha(s)` : '\nTudo certo.');
process.exit(failures ? 1 : 0);
