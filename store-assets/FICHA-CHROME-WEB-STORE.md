# Ficha da Chrome Web Store — Preço Real

Textos e imagens prontos para preencher o painel de desenvolvedor
(https://chrome.google.com/webstore/devconsole).

## Pacote
- Gere com `pnpm zip` → `.output/preco-real-<versão>-chrome.zip`.

## Informações do produto

**Nome:** Preço Real

**Resumo (até 132 caracteres):**
> Histórico de preços do Mercado Livre, Amazon, Magalu, KaBuM! e Casas Bahia. Descubra se o desconto é de verdade.

**Categoria:** Compras · **Idioma:** Português (Brasil)

**Descrição:**

```
Aquele "de R$ 2.499 por R$ 1.999" é desconto mesmo? Ou o preço subiu na semana passada só para "cair" na promoção?

O Preço Real registra o preço dos produtos que você visita e mostra, direto na página da loja, se vale a pena comprar agora.

★ SELO NA PÁGINA DO PRODUTO
Ao lado do preço aparece uma classificação:
🟢 Bom preço — abaixo da média dos últimos 30 dias
🟡 Preço normal — dentro da média
🔴 Preço alto — acima da média
⚠️ Desconto suspeito — o preço "de" nunca foi praticado, ou o preço subiu nos dias anteriores à promoção
⚪ Sem histórico ainda — precisamos de alguns dias de registros

★ HISTÓRICO COMPLETO
Clique no selo para ver o gráfico do preço, o menor e o maior preço (com as datas), a média de 30 dias e o preço no Pix.

★ ALERTAS DE PREÇO
Marque produtos para acompanhar, defina um preço-alvo e receba uma notificação quando o preço cair. A verificação é feita no máximo a cada 6 horas por produto, sem sobrecarregar as lojas.

★ LOJAS SUPORTADAS
Mercado Livre, Amazon Brasil, Magazine Luiza, KaBuM! e Casas Bahia.

★ HISTÓRICO COMPARTILHADO (OPCIONAL)
Se quiser, ligue o histórico compartilhado: o gráfico já aparece preenchido com os preços vistos por outros usuários. São enviados apenas loja, ID do produto e preço, de forma anônima. A opção vem desligada.

★ PRIVACIDADE EM PRIMEIRO LUGAR
• Sem cadastro: por padrão, todo o histórico fica salvo só no seu navegador.
• A extensão acessa apenas os sites das 5 lojas suportadas.
• Exporte seus dados em JSON ou apague tudo com um clique.

Código aberto: https://github.com/Augustodevv/pre-o-real
```

## Imagens (nesta pasta)
| Campo | Arquivo | Tamanho |
|---|---|---|
| Ícone | `public/icon/128.png` | 128×128 |
| Capturas de tela | `1-desconto-suspeito.png`, `2-historico.png`, `3-produtos.png`, `4-alertas.png`, `5-privacidade.png` | 1280×800 |
| Bloco promocional pequeno | `promo-pequeno-440x280.png` | 440×280 |
| Bloco promocional marquee | `promo-marquee-1400x560.png` | 1400×560 |

As capturas usam uma página de loja **ilustrativa** (sem marca de nenhuma loja real).
Para gerar de novo: `pnpm assets`.

## Privacidade (aba "Práticas de privacidade")

**Finalidade única:**
> Mostrar o histórico de preços de produtos em lojas online brasileiras e indicar se um desconto é verdadeiro.

**Justificativa das permissões:**
| Permissão | Justificativa |
|---|---|
| Hosts das 5 lojas | Ler nome e preço nas páginas de produto que o usuário abre e, para produtos que ele marcou como "Acompanhando", consultar o preço atual na página pública do produto. |
| `storage` | Salvar as configurações do usuário (selo e lojas ativas). |
| `alarms` | Agendar a verificação periódica (no máximo a cada 6 h por produto) dos produtos acompanhados. |
| `notifications` | Avisar o usuário quando o preço de um produto acompanhado cair abaixo do preço-alvo definido por ele. |
| `offscreen` | Ler o HTML da página de produto baixada na verificação automática (o service worker não tem DOMParser). |

**Código remoto:** Não, todo o código está no pacote.

**Uso de dados:** marque que a extensão **não coleta** nenhuma das categorias de dados do usuário.
Os dados de produtos ficam no armazenamento local do navegador. O histórico compartilhado (opcional,
desligado por padrão) envia apenas loja, ID do produto e preço, sem nenhum dado pessoal e sem histórico
de navegação. Descreva isso no campo de justificativa, se o formulário pedir.

**URL da política de privacidade:**
`https://augustodevv.github.io/pre-o-real/privacidade.html` (no ar; publicada pela branch
`gh-pages` via `.github/workflows/pages.yml`).

**Site do projeto:** `https://augustodevv.github.io/pre-o-real/`
