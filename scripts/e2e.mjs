// Teste de ponta a ponta: carrega a extensão compilada no Chromium, abre as fixtures
// como se fossem páginas reais das lojas (requisições interceptadas, sem acessar a internet)
// e confere o que foi salvo no IndexedDB.
// Uso: pnpm build && node scripts/e2e.mjs
import { chromium } from 'playwright';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Permite interceptar também as requisições feitas pelo service worker (verificação automática).
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';

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
  const page = pages.find((p) => p.spec.url.split('#')[0] === url || p.spec.expected?.url === url);
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

// Simula 4 semanas de histórico com aumento antes da "promoção" e confere o selo.
const catalog = pages.find((p) => p.file === 'catalogo-jsonld.html');
if (catalog) {
  const key = `${catalog.store}:${catalog.spec.expected.productId}`;
  await popup.evaluate((key) => new Promise((res) => {
    const req = indexedDB.open('preco-real');
    req.onsuccess = () => {
      const store = req.result.transaction('prices', 'readwrite').objectStore('prices');
      const prices = [[28, 92], [24, 89.9], [20, 91], [16, 90], [12, 89.9], [6, 129.9], [4, 134.9], [2, 139.9]];
      for (const [ago, price] of prices) {
        const d = new Date(); d.setDate(d.getDate() - ago);
        const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        store.put({ key, day, price, listPrice: null, pixPrice: null, capturedAt: d.getTime() });
      }
      store.transaction.oncomplete = res;
    };
  }), key);

  const tab = await context.newPage();
  await tab.setViewportSize({ width: 1100, height: 700 });
  await tab.goto(catalog.spec.url);
  const host = tab.locator('preco-real-selo');
  await host.waitFor({ timeout: 5000 });
  await tab.waitForTimeout(500);
  const box = await host.boundingBox();
  await tab.screenshot({ path: '.output/selo.png' });
  await tab.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await tab.waitForTimeout(500);
  await tab.screenshot({ path: '.output/painel.png' });
  console.log(`✔ selo exibido em (${Math.round(box.x)}, ${Math.round(box.y)}) e painel aberto`);
  await tab.close();
}

// Fluxo de alertas: acompanha um produto com alvo acima do preço atual, força a
// verificação automática (fetch + documento offscreen) e confere a notificação.
{
  const kabum = pages.find((p) => p.store === 'kabum' && p.spec.expected);
  if (kabum) {
    const key = `kabum:${kabum.spec.expected.productId}`;
    await popup.evaluate((key) => new Promise((res) => {
      const req = indexedDB.open('preco-real');
      req.onsuccess = () => {
        const store = req.result.transaction('products', 'readwrite').objectStore('products');
        const get = store.get(key);
        get.onsuccess = () => {
          store.put({ ...get.result, tracked: true, targetPrice: 1900, lastCheckAt: null, alertedPrice: null });
          store.transaction.oncomplete = res;
        };
      };
    }), key);
    const result = await popup.evaluate(() => chrome.runtime.sendMessage({ type: 'runChecks' }));
    const after = await popup.evaluate((key) => new Promise((res) => {
      const req = indexedDB.open('preco-real');
      req.onsuccess = () => {
        const get = req.result.transaction('products').objectStore('products').get(key);
        get.onsuccess = () => res(get.result);
      };
    }), key);
    const notifications = await worker.evaluate(() => chrome.notifications.getAll());
    const ok = result.checked === 1 && result.alerted === 1 && after.lastCheckAt && !after.lastCheckError && notifications[key];
    if (!ok) failures++;
    console.log(`${ok ? '✔' : '✘'} verificação automática e alerta: ${JSON.stringify(result)}${after.lastCheckError ? ' — ' + after.lastCheckError : ''}`);
  }
}

await popup.setViewportSize({ width: 380, height: 580 });
await popup.reload();
await popup.waitForTimeout(500);
await popup.screenshot({ path: '.output/popup.png' });
await popup.getByRole('tab', { name: /Acompanhando/ }).click();
await popup.waitForTimeout(300);
await popup.screenshot({ path: '.output/popup-acompanhando.png' });
await popup.getByRole('tab', { name: 'Configurações' }).click();
await popup.waitForTimeout(300);
await popup.screenshot({ path: '.output/popup-configuracoes.png' });

await context.close();
console.log(failures ? `\n${failures} falha(s)` : '\nTudo certo.');
process.exit(failures ? 1 : 0);
