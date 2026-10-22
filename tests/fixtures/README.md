# Fixtures das lojas

Cada pasta tem páginas de produto salvas (`.html`) e, ao lado, um `.json` com a URL
original e o resultado esperado. O teste `tests/adapters/fixtures.test.ts` roda todas
automaticamente. Se uma loja mudar o layout, o teste da fixture falha.

## Como adicionar uma página real

1. Abra o produto no Chrome e espere o preço carregar.
2. `Ctrl+S` → "Página da Web, somente HTML" → salve como `tests/fixtures/<loja>/<nome>.html`.
3. Crie `tests/fixtures/<loja>/<nome>.json`:

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
