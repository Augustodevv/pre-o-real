# Backend do histórico compartilhado (Supabase)

## O que existe no banco

| Objeto | Para quê |
|---|---|
| `products` | Loja + ID do produto (sem nome, URL ou foto) |
| `price_reports` | Um preço por produto, por dia, por instalação (hash SHA-256 do ID aleatório) |
| `submit_price(loja, id, preço, instalação)` | Única forma de enviar dados |
| `get_price_history(loja, id)` | Mediana diária dos últimos 365 dias e quantas instalações registraram |

As tabelas têm RLS ligado, **sem políticas e sem GRANT**: o público não lê nem escreve
diretamente. Só as duas funções (`security definer`) são liberadas para `anon`.

### Proteção contra dados falsos
- Loja precisa ser uma das 5 suportadas; o ID do produto precisa ter de 3 a 40 letras ou números.
- O preço precisa estar entre R$ 1,00 e R$ 500.000,00.
- Um preço mais de **5× acima ou abaixo da mediana** dos últimos 60 dias (com 3 ou mais registros) é rejeitado.
- **300 envios por instalação a cada 24 h** no máximo; cada instalação conta uma vez por produto por dia.
- O histórico usa a **mediana** entre as instalações, então poucos valores falsos não mudam o resultado.

Os limites ficam na função `preco_real_limits()` da migration.

## Como subir

1. Crie um projeto no [Supabase](https://supabase.com) (a região `sa-east-1`, São Paulo, é a mais próxima).
2. Rode a migration `migrations/20261023000000_historico_compartilhado.sql` no SQL Editor,
   ou use `supabase db push` com a CLI.
3. Copie a **URL do projeto** e a **publishable key** (Settings → API) para um arquivo `.env`
   na raiz do repositório (veja `.env.example`).
4. Compile de novo: `pnpm build`. A opção aparece nas configurações da extensão.

## Testes

`tests/supabase/historico.test.ts` roda a migration num Postgres em memória (PGlite) e testa:
envio, mediana, um registro por instalação por dia, validações, rejeição de preços absurdos,
limite de envios e o bloqueio de acesso direto às tabelas.
