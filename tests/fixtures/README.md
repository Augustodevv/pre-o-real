# Fixtures das lojas

Cada pasta tem páginas de produto salvas (`.html`) e, ao lado, um `.json` com a URL
original e o resultado esperado. O teste `tests/adapters/fixtures.test.ts` roda todas
automaticamente. Se uma loja mudar o layout, o teste da fixture falha.

## Páginas reais (`real-*.html`)

Capturadas em 23/10/2026 e reduzidas com `scripts/limpar-fixture.mjs`, que remove scripts
(exceto JSON-LD), estilos e SVGs. O que elas revelaram e que já está tratado no código:

| Loja | Descoberta |
|---|---|
| KaBuM! | Layout novo sem classes com nome. O preço fica num `<number-flow-react>` cujo texto tem todos os dígitos da animação; o valor certo está no atributo `data`. |
| Magazine Luiza | Risca o **total no cartão** como se fosse preço "de" quando há desconto no Pix. Sem tratamento, todo produto apareceria como "desconto suspeito". |
| Magazine Luiza | Produto com "Produto indisponível" na tela continua com JSON-LD "InStock" e o último preço. |
| Casas Bahia | O preço "de" fica em `data-testid="history-price"`. |
| Amazon | Um R$ 899,00 de um quadro comparativo não pode ser lido como preço "de". |

O Mercado Livre bloqueou a captura automatizada; as fixtures dele são montadas.

## Como adicionar uma página real

1. Abra o produto no Chrome e espere o preço carregar.
2. `Ctrl+S` → "Página da Web, somente HTML".
3. Reduza: `node scripts/limpar-fixture.mjs pagina.html tests/fixtures/<loja>/<nome>.html`.
4. Crie `tests/fixtures/<loja>/<nome>.json`:

```json
{
  "url": "https://www.mercadolivre.com.br/.../p/MLB25263382",
  "expected": { "productId": "MLB25263382", "price": 89.9, "listPrice": 149.9 }
}
```

`expected` é comparado parcialmente: só os campos informados são verificados.
Use `"expected": null` para páginas que **não** são de produto.

> As fixtures marcadas com `"synthetic": true` foram montadas a partir da estrutura
> pública das páginas (JSON-LD, meta tags e classes CSS), porque o ambiente de
> desenvolvimento não conseguiu baixar as páginas reais.
