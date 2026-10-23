# Post para o LinkedIn

**Imagem sugerida:** `store-assets/promo-marquee-1400x560.png` (ou `1-desconto-suspeito.png`).
**Dica:** coloque o link do GitHub no primeiro comentário. Posts com link externo no texto costumam ter menos alcance.

---

"De R$ 2.499 por R$ 1.999." Mas e se uma semana antes o produto custava R$ 1.899?

Esse "desconto" que é só maquiagem foi o que me motivou a criar o **Preço Real**, uma extensão para Chrome que guarda o histórico de preços nas lojas online brasileiras e diz, na própria página do produto, se vale a pena comprar agora.

🟢 Bom preço · 🟡 Normal · 🔴 Alto · ⚠️ Desconto suspeito

O que ela faz:
✅ Funciona no Mercado Livre, Amazon, Magalu, KaBuM! e Casas Bahia
✅ Avisa quando o preço "de" nunca foi praticado ou quando o preço subiu antes da promoção
✅ Mostra o gráfico do histórico, o menor preço e a média de 30 dias
✅ Manda uma notificação quando o produto cai abaixo do preço que você definiu
✅ Funciona 100% no navegador: sem cadastro, sem servidor e sem rastreamento

Algumas decisões técnicas que gostei de resolver:
🔹 Um "adaptador" por loja, com a mesma interface: os dados vêm primeiro do JSON-LD (schema.org), depois das meta tags e, por último, dos seletores CSS
🔹 Um MutationObserver para lojas que carregam o preço depois ou trocam de produto sem recarregar a página
🔹 O selo fica num Shadow DOM, então não quebra o layout das lojas
🔹 Verificação automática em segundo plano com chrome.alarms e um documento offscreen, que reaproveita os mesmos adaptadores (o service worker do Manifest V3 não tem DOMParser)
🔹 77 testes unitários, fixtures de páginas para saber quando uma loja muda o layout e testes de ponta a ponta com Playwright carregando a extensão de verdade

Stack: TypeScript, React, WXT (Manifest V3), Tailwind, Chart.js, IndexedDB, Vitest e Playwright.

O próximo passo é um histórico compartilhado opcional e anônimo, para o gráfico já aparecer preenchido desde a primeira visita.

Dá para instalar de graça agora mesmo, e o código é aberto. Os links estão nos comentários 👇

#desenvolvimentoweb #typescript #react #extensaochrome #opensource #javascript #programacao

---

**Primeiro comentário:**
🔗 Baixar e instalar: https://augustodevv.github.io/pre-o-real/
💻 Código no GitHub: https://github.com/Augustodevv/pre-o-real
