// Gera as imagens da Chrome Web Store e do README em store-assets/.
// Usa uma página de produto ILUSTRATIVA (sem marca de loja) servida no domínio de uma
// loja suportada, para a extensão ativar, e um histórico simulado.
// Uso: pnpm build && node scripts/store-assets.mjs
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
import { chromium } from 'playwright';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const OUT = resolve('store-assets');
const extensionPath = resolve('.output/chrome-mv3');
const icon = `data:image/png;base64,${readFileSync('docs/icone-512.png').toString('base64')}`;

const PHONE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><rect width="400" height="400" fill="#f1f5f9"/><rect x="120" y="40" width="160" height="320" rx="26" fill="#0f172a"/><rect x="130" y="58" width="140" height="284" rx="16" fill="url(#g)"/><circle cx="200" cy="72" r="5" fill="#0f172a"/><circle cx="200" cy="200" r="38" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="6"/></svg>`;
const HEADPHONE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#fef3c7"/><path d="M110 230v-40a90 90 0 0 1 180 0v40" fill="none" stroke="#1f2937" stroke-width="22" stroke-linecap="round"/><rect x="88" y="215" width="58" height="100" rx="24" fill="#f97316"/><rect x="254" y="215" width="58" height="100" rx="24" fill="#f97316"/></svg>`;
const svgUrl = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const DEMOS = {
  celular: {
    url: 'https://www.kabum.com.br/produto/900001/smartphone-demo-x5-256gb',
    name: 'Smartphone Demo X5 256GB, 8GB RAM, Tela 6,7" AMOLED, Câmera 108MP',
    price: 1999, list: 2499, image: svgUrl(PHONE_SVG),
    // dias atrás → preço: estável em ~R$ 1.899, sobe para R$ 2.499 na semana da "promoção"
    history: [[29, 1899], [26, 1879], [23, 1899], [20, 1919], [17, 1899], [14, 1889], [11, 1899], [6, 2499], [4, 2499], [2, 2499]],
  },
  fone: {
    url: 'https://www.kabum.com.br/produto/900002/fone-demo-sem-fio-anc',
    name: 'Fone de Ouvido Demo Sem Fio com Cancelamento de Ruído, 40h de Bateria',
    price: 379, list: 519, image: svgUrl(HEADPHONE_SVG),
    history: [[28, 499], [25, 489], [21, 519], [18, 499], [14, 509], [10, 489], [7, 499], [3, 479]],
  },
};

const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function productPage(d, id) {
  const ld = { '@context': 'https://schema.org', '@type': 'Product', name: d.name, image: d.image, sku: id,
    offers: { '@type': 'Offer', priceCurrency: 'BRL', price: d.price, availability: 'https://schema.org/InStock' } };
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${d.name}</title>
<link rel="canonical" href="${d.url}"><script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#f8fafc;color:#0f172a}
.top{background:#1e293b;color:#fff;padding:14px 40px;display:flex;align-items:center;gap:24px}
.logo{font-weight:800;font-size:20px;letter-spacing:.5px}.busca{flex:1;max-width:520px;background:#fff;border-radius:8px;height:36px}
.demo{background:#fde68a;color:#78350f;font-size:12px;padding:4px 10px;border-radius:999px}
main{max-width:1180px;margin:28px auto;display:grid;grid-template-columns:460px 1fr;gap:40px;padding:0 40px}
.foto{background:#fff;border-radius:14px;padding:20px;box-shadow:0 1px 3px #0001}.foto img{width:100%;border-radius:10px}
h1{font-size:24px;line-height:1.3;margin:0 0 6px}.vend{color:#64748b;font-size:14px;margin-bottom:22px}
#blocoValores{background:#fff;border-radius:14px;padding:22px;box-shadow:0 1px 3px #0001;display:grid;gap:6px;max-width:520px}
.oldPrice{color:#94a3b8;text-decoration:line-through;font-size:15px}
.linha{display:flex;align-items:center;gap:12px}
h4.finalPrice{margin:0;font-size:34px;color:#ea580c}.off{background:#16a34a;color:#fff;border-radius:6px;padding:2px 8px;font-weight:700;font-size:14px}
.det{color:#475569;font-size:14px}.btn{margin-top:14px;background:#ea580c;color:#fff;border:0;border-radius:10px;padding:14px;font-size:16px;font-weight:700}
</style></head><body>
<div class="top"><span class="logo">LOJA EXEMPLO</span><span class="busca"></span><span class="demo">Página ilustrativa</span></div>
<main><div class="foto"><img src="${d.image}" alt=""></div><div>
<h1>${d.name}</h1><div class="vend">Vendido e entregue por Loja Exemplo · ★ 4,8 (1.204 avaliações)</div>
<div id="blocoValores"><span class="oldPrice">${brl(d.list)}</span>
<div class="linha"><h4 class="finalPrice">${brl(d.price)}</h4><span class="off">-${Math.round((1 - d.price / d.list) * 100)}%</span></div>
<span class="det">à vista no Pix · ou 10x de ${brl(d.price / 10)} sem juros</span>
<button class="btn">Comprar</button></div></div></main></body></html>`;
}

const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'preco-real-')), {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1100, height: 700 },
  deviceScaleFactor: 2, // prints nítidos; a composição final é reduzida para o tamanho da loja
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
});
await context.route(/^https?:\/\//, (route) => {
  const url = route.request().url();
  const entry = Object.entries(DEMOS).find(([, d]) => d.url === url);
  if (entry) return route.fulfill({ contentType: 'text/html; charset=utf-8', body: productPage(entry[1], entry[0]) });
  return route.abort();
});
const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
const extensionId = new URL(worker.url()).host;
const popup = await context.newPage();

// 1) Primeira visita registra hoje; 2) injeta o histórico; 3) marca o fone como acompanhado.
for (const d of Object.values(DEMOS)) {
  const tab = await context.newPage();
  await tab.goto(d.url);
  await tab.waitForTimeout(1500);
  await tab.close();
}
await popup.goto(`chrome-extension://${extensionId}/popup.html`);
await popup.evaluate((demos) => new Promise((res) => {
  const req = indexedDB.open('preco-real');
  req.onsuccess = () => {
    const tx = req.result.transaction(['prices', 'products'], 'readwrite');
    for (const [id, d] of Object.entries(demos)) {
      const key = `kabum:${id === 'celular' ? '900001' : '900002'}`;
      for (const [ago, price] of d.history) {
        const dt = new Date(); dt.setDate(dt.getDate() - ago);
        const day = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        tx.objectStore('prices').put({ key, day, price, listPrice: null, pixPrice: null, capturedAt: dt.getTime() });
      }
      const g = tx.objectStore('products').get(key);
      g.onsuccess = () => {
        const prev = d.history[d.history.length - 1][1];
        const extra = id === 'fone' ? { tracked: true, targetPrice: 399, lastCheckAt: Date.now() - 2 * 3600e3 } : {};
        tx.objectStore('products').put({ ...g.result, previousPrice: prev, ...extra });
      };
    }
    tx.oncomplete = res;
  };
}), DEMOS);

const shots = {};
for (const [id, d] of Object.entries(DEMOS)) {
  const tab = await context.newPage();
  await tab.goto(d.url);
  const host = tab.locator('preco-real-selo');
  await host.waitFor();
  await tab.waitForTimeout(600);
  shots[`${id}-selo`] = await tab.screenshot();
  const box = await host.boundingBox();
  await tab.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await tab.waitForTimeout(800);
  shots[`${id}-painel`] = await tab.screenshot();
  await tab.close();
}

await popup.setViewportSize({ width: 380, height: 580 });
await popup.reload();
await popup.waitForTimeout(600);
shots.popup = await popup.screenshot();
await popup.getByRole('tab', { name: /Acompanhando/ }).click();
await popup.waitForTimeout(300);
shots.acompanhando = await popup.screenshot();
await popup.getByRole('tab', { name: 'Configurações' }).click();
await popup.waitForTimeout(300);
shots.configuracoes = await popup.screenshot();

// Composições no tamanho da Chrome Web Store.
const b64 = (buf) => `data:image/png;base64,${buf.toString('base64')}`;
// Janela separada a 1x para as imagens saírem exatamente no tamanho exigido pela Chrome Web Store.
const composer = await chromium.launch({ channel: 'chromium', headless: true });
const canvas = await composer.newPage({ deviceScaleFactor: 1 });
const BASE_CSS = `*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.bg{position:absolute;inset:0;background:linear-gradient(135deg,#064e3b,#059669 60%,#34d399)}
.t{color:#fff}.t h2{margin:0;font-size:44px;line-height:1.15;font-weight:800}.t p{margin:14px 0 0;font-size:21px;opacity:.92;line-height:1.45}
.logo{display:flex;align-items:center;gap:12px;color:#fff;font-weight:800;font-size:24px}.logo img{width:48px;height:48px}
.shot{border-radius:14px;box-shadow:0 30px 60px -20px #0008;display:block}
.nota{position:absolute;bottom:14px;right:20px;color:#fff;opacity:.6;font-size:12px}`;

async function render(name, width, height, body) {
  await canvas.setViewportSize({ width, height });
  await canvas.setContent(`<style>${BASE_CSS}</style><div style="position:relative;width:${width}px;height:${height}px;overflow:hidden">${body}</div>`);
  await canvas.waitForTimeout(150);
  await canvas.screenshot({ path: join(OUT, name) });
  console.log(`✔ ${name}`);
}

const slide = (title, text, img, imgWidth) => `<div class="bg"></div>
<div style="position:absolute;left:64px;top:56px" class="logo"><img src="${icon}">Preço Real</div>
<div class="t" style="position:absolute;left:64px;top:190px;width:360px"><h2>${title}</h2><p>${text}</p></div>
<img class="shot" src="${img}" style="position:absolute;right:56px;top:50%;transform:translateY(-50%);width:${imgWidth}px">
<span class="nota">Página de loja ilustrativa</span>`;

await render('1-desconto-suspeito.png', 1280, 800, slide('Desconto de verdade ou maquiagem?', 'O selo avisa quando o preço subiu antes da “promoção” ou quando o preço “de” nunca existiu.', b64(shots['celular-painel']), 760));
await render('2-historico.png', 1280, 800, slide('Histórico completo do preço', 'Gráfico, menor e maior preço, média de 30 dias e a data do menor preço — direto na página do produto.', b64(shots['fone-painel']), 760));
await render('3-produtos.png', 1280, 800, `<div class="bg"></div>
<div style="position:absolute;left:64px;top:56px" class="logo"><img src="${icon}">Preço Real</div>
<div class="t" style="position:absolute;left:64px;top:190px;width:440px"><h2>Tudo o que você viu, em um lugar</h2><p>Busque, filtre por loja e veja a variação e a classificação de cada produto.</p></div>
<img class="shot" src="${b64(shots.popup)}" style="position:absolute;right:420px;top:110px;width:330px">
<img class="shot" src="${b64(shots.configuracoes)}" style="position:absolute;right:60px;top:110px;width:330px">`);
await render('4-alertas.png', 1280, 800, `<div class="bg"></div>
<div style="position:absolute;left:64px;top:56px" class="logo"><img src="${icon}">Preço Real</div>
<div class="t" style="position:absolute;left:64px;top:190px;width:460px"><h2>Defina um preço-alvo e relaxe</h2><p>A extensão confere o preço a cada 6 horas e avisa quando ele cair abaixo do seu alvo.</p></div>
<img class="shot" src="${b64(shots.acompanhando)}" style="position:absolute;right:300px;top:110px;width:330px">
<div style="position:absolute;right:48px;top:470px;width:360px;background:#fff;border-radius:12px;padding:14px 16px;box-shadow:0 30px 60px -20px #0008;display:flex;gap:12px">
<img src="${icon}" style="width:44px;height:44px"><div style="font-size:14px;color:#0f172a"><b>Preço Real: o preço baixou!</b><br>Fone de Ouvido Demo Sem Fio está por R$ 379,00 (seu alvo: R$ 399,00).<div style="color:#64748b;font-size:12px;margin-top:4px">Clique para abrir o produto</div></div></div>`);
await render('5-privacidade.png', 1280, 800, `<div class="bg"></div>
<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center" class="t">
<img src="${icon}" style="width:140px;height:140px;margin-bottom:28px"><h2 style="font-size:52px">100% no seu navegador</h2>
<p style="max-width:760px">Sem cadastro, sem servidor, sem rastreamento. Exporte ou apague seus dados quando quiser.</p>
<p style="margin-top:36px;font-size:19px;opacity:.85">Mercado Livre · Amazon · Magazine Luiza · KaBuM! · Casas Bahia</p></div>`);
await render('promo-pequeno-440x280.png', 440, 280, `<div class="bg"></div>
<div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 32px" class="t">
<div class="logo" style="font-size:30px"><img src="${icon}" style="width:64px;height:64px">Preço Real</div>
<p style="font-size:19px;margin-top:16px">Descubra se o desconto é de verdade.</p></div>`);
await render('promo-marquee-1400x560.png', 1400, 560, `<div class="bg"></div>
<div style="position:absolute;left:80px;top:0;bottom:0;width:520px;display:flex;flex-direction:column;justify-content:center" class="t">
<div class="logo" style="font-size:34px"><img src="${icon}" style="width:72px;height:72px">Preço Real</div>
<h2 style="margin-top:26px">Histórico de preços das lojas brasileiras</h2><p>E um alerta quando a “promoção” é maquiagem.</p></div>
<img class="shot" src="${b64(shots['celular-painel'])}" style="position:absolute;right:60px;top:60px;width:700px">`);

// Prints sem moldura para o README.
writeFileSync(join(OUT, 'readme-painel.png'), shots['celular-painel']);
writeFileSync(join(OUT, 'readme-selo.png'), shots['celular-selo']);
writeFileSync(join(OUT, 'readme-popup.png'), shots.popup);
writeFileSync(join(OUT, 'readme-acompanhando.png'), shots.acompanhando);
writeFileSync(join(OUT, 'readme-configuracoes.png'), shots.configuracoes);

await composer.close();
await context.close();
