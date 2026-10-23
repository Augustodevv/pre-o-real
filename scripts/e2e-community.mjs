// Teste de ponta a ponta do histórico compartilhado, com o Supabase simulado.
// Compila com um Supabase de teste, confere que nada é enviado com a opção desligada e,
// com ela ligada, que só loja/ID/preço/instalação são enviados e o gráfico vem preenchido.
// Uso: pnpm e2e:community
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
import { chromium } from 'playwright';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const ext = resolve('.output/chrome-mv3');
const spec = JSON.parse(readFileSync('tests/fixtures/kabum/produto.json', 'utf8'));
const html = readFileSync('tests/fixtures/kabum/produto.html', 'utf8');
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'c-')), { channel: 'chromium', headless: true, viewport: { width: 1100, height: 700 }, args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`] });
const submits = [];
let historyCalls = 0;
await ctx.route(/^https?:\/\//, async (route) => {
  const req = route.request(); const url = req.url();
  if (url.startsWith('https://teste123.supabase.co/rest/v1/rpc/submit_price')) {
    submits.push({ body: JSON.parse(req.postData()), apikey: req.headers()['apikey'] });
    return route.fulfill({ contentType: 'application/json', body: '"ok"', headers: { 'access-control-allow-origin': '*' } });
  }
  if (url.startsWith('https://teste123.supabase.co/rest/v1/rpc/get_price_history')) {
    historyCalls++;
    const days = [];
    for (let ago = 30; ago >= 1; ago -= 3) { const d = new Date(); d.setDate(d.getDate() - ago); days.push({ day: d.toISOString().slice(0, 10), price: 2299.9, reports: 4 }); }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(days), headers: { 'access-control-allow-origin': '*' } });
  }
  if (url.split('#')[0] === spec.url.split('#')[0]) return route.fulfill({ contentType: 'text/html; charset=utf-8', body: html });
  return route.abort();
});
const w = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
// Página 1: sem participar → nada é enviado.
let tab = await ctx.newPage(); await tab.goto(spec.url); await tab.waitForTimeout(2000); await tab.close();
const offOk = submits.length === 0 && historyCalls === 0;
console.log(`${offOk ? '✔' : '✘'} opção desligada: nada enviado nem consultado`);
// Liga a opção.
await w.evaluate(async () => { const { settings } = await chrome.storage.sync.get('settings'); await chrome.storage.sync.set({ settings: { ...(settings ?? {}), showBadge: true, stores: { mercadolivre: true, amazon: true, magalu: true, kabum: true, casasbahia: true }, shareHistory: true } }); });
tab = await ctx.newPage(); await tab.goto(spec.url);
const host = tab.locator('preco-real-selo'); await host.waitFor(); await tab.waitForTimeout(1500);
const box = await host.boundingBox(); await tab.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await tab.waitForTimeout(800);
await tab.screenshot({ path: '.output/painel-comunidade.png' });
const body = submits[0]?.body ?? {};
const onOk = submits.length === 1 && historyCalls === 1 &&
  JSON.stringify(Object.keys(body).sort()) === JSON.stringify(['p_installation', 'p_price', 'p_product_id', 'p_store']) &&
  body.p_store === 'kabum' && body.p_product_id === '475647' && body.p_price === 1899.99;
console.log(`${onOk ? '✔' : '✘'} opção ligada: enviou só ${Object.keys(body).join(', ')} e consultou o histórico`);
await ctx.close();
process.exit(offOk && onOk ? 0 : 1);
