# Backend do histórico compartilhado (Supabase)

## O que existe no banco

Tudo fica isolado no schema **`preco_real`**, que a API pública não expõe. Assim o banco pode
ser compartilhado com outro projeto sem tocar nas tabelas dele. No schema `public` ficam
apenas duas funções, com prefixo:

| Objeto | Para quê |
|---|---|
| `preco_real.products` | Loja + ID do produto (sem nome, URL ou foto) |
| `preco_real.price_reports` | Um preço por produto, por dia, por instalação (hash SHA-256 do ID aleatório) |
| `preco_real.limits()` | Limites anti-abuso |
| `public.preco_real_submit_price(loja, id, preço, instalação)` | Única forma de enviar dados |
| `public.preco_real_get_price_history(loja, id)` | Mediana diária dos últimos 365 dias e quantas instalações registraram |

As tabelas têm RLS ligado, **sem políticas e sem GRANT**, e os papéis `anon` e `authenticated`
não têm acesso ao schema `preco_real`: o público não lê nem escreve diretamente. Só as duas
funções (`security definer`, `search_path` vazio) são liberadas para `anon`.

### Proteção contra dados falsos
- Loja precisa ser uma das 5 suportadas; o ID do produto precisa ter de 3 a 40 letras ou números.
- O preço precisa estar entre R$ 1,00 e R$ 500.000,00.
- Um preço mais de **5× acima ou abaixo da mediana** dos últimos 60 dias (com 3 ou mais registros) é rejeitado.
- **300 envios por instalação a cada 24 h** no máximo; cada instalação conta uma vez por produto por dia.
- O histórico usa a **mediana** entre as instalações, então poucos valores falsos não mudam o resultado.

Os limites ficam na função `preco_real.limits()` da migration.

## Em produção

A migration está aplicada no projeto Supabase `pnzbougnaxgwhlzhuxus` (região `sa-east-1`, São Paulo),
compartilhado com outro projeto do autor, isolada no schema `preco_real`. A URL e a chave pública
estão em `.env.production`, então `pnpm build` já gera a extensão com o recurso ativo.

Verificações feitas no banco de produção (em transação desfeita, sem deixar dados):
envio e mediana corretos, preço absurdo rejeitado, `permission denied` ao acessar o schema como `anon`.

Avisos esperados do *Security Advisor* do Supabase:
- **RLS habilitado sem políticas**: intencional. Ninguém lê as tabelas diretamente.
- **Função `security definer` executável por `anon`**: são exatamente as duas funções da API
  pública. Elas validam todas as entradas e não expõem as tabelas.

## Como subir em outro projeto

1. Crie um projeto no [Supabase](https://supabase.com) (a região `sa-east-1`, São Paulo, é a mais próxima).
2. Rode a migration `migrations/20261023000000_historico_compartilhado.sql` no SQL Editor,
   ou use `supabase db push` com a CLI.
3. Copie a **URL do projeto** e a **publishable key** (Settings → API) para o `.env.production`
   na raiz do repositório (veja `.env.example`).
4. Compile de novo: `pnpm build`. A opção aparece nas configurações da extensão.

## Testes

`tests/supabase/historico.test.ts` roda a migration num Postgres em memória (PGlite) e testa:
envio, mediana, um registro por instalação por dia, validações, rejeição de preços absurdos,
limite de envios e o bloqueio de acesso direto às tabelas.
