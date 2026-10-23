-- Preço Real — Fase 2: histórico de preços compartilhado (opcional e anônimo).
--
-- A extensão envia apenas: loja, ID do produto, preço e um ID aleatório da instalação
-- (usado só para limitar envios; guardamos o hash SHA-256 dele, nunca o valor).
-- Nenhum dado pessoal, URL ou histórico de navegação é recebido.
--
-- Acesso: as tabelas ficam fechadas (RLS sem políticas e sem GRANT). O público usa
-- apenas duas funções: submit_price (enviar) e get_price_history (consultar).

create table public.products (
  store       text not null,
  product_id  text not null,
  first_seen  timestamptz not null default now(),
  primary key (store, product_id),
  constraint products_store_valida check (store in ('mercadolivre', 'amazon', 'magalu', 'kabum', 'casasbahia')),
  constraint products_id_valido check (product_id ~ '^[A-Za-z0-9]{3,40}$')
);

create table public.price_reports (
  store         text not null,
  product_id    text not null,
  day           date not null,
  installation  text not null,  -- sha256 (hex) do ID aleatório da instalação
  price         numeric(12, 2) not null check (price > 0 and price < 1000000),
  created_at    timestamptz not null default now(),
  -- Uma instalação conta uma vez por produto por dia.
  primary key (store, product_id, day, installation),
  foreign key (store, product_id) references public.products (store, product_id) on delete cascade
);

create index price_reports_installation_idx on public.price_reports (installation, created_at);

alter table public.products enable row level security;
alter table public.price_reports enable row level security;
revoke all on public.products, public.price_reports from anon, authenticated;

-- Limites anti-abuso (ajuste aqui).
create or replace function public.preco_real_limits(out max_por_dia int, out preco_min numeric, out preco_max numeric, out fator_outlier numeric)
language sql immutable set search_path = '' as $$
  select 300, 1.00::numeric, 500000.00::numeric, 5::numeric
$$;

-- Recebe um preço. Retorna 'ok', 'limite' (instalação passou do limite diário)
-- ou 'rejeitado' (preço muito distante da mediana recente). Entradas inválidas geram erro.
create or replace function public.submit_price(p_store text, p_product_id text, p_price numeric, p_installation uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  lim record;
  v_hash text;
  v_day date := (now() at time zone 'America/Sao_Paulo')::date;
  v_count int;
  v_median numeric;
begin
  select * into lim from public.preco_real_limits();

  if p_store is null or p_store not in ('mercadolivre', 'amazon', 'magalu', 'kabum', 'casasbahia') then
    raise exception 'loja inválida' using errcode = '22023';
  end if;
  if p_product_id is null or p_product_id !~ '^[A-Za-z0-9]{3,40}$' then
    raise exception 'ID de produto inválido' using errcode = '22023';
  end if;
  if p_installation is null then
    raise exception 'instalação ausente' using errcode = '22023';
  end if;
  if p_price is null or p_price < lim.preco_min or p_price > lim.preco_max then
    raise exception 'preço fora da faixa aceita' using errcode = '22023';
  end if;

  v_hash := encode(sha256(convert_to(p_installation::text, 'UTF8')), 'hex');

  -- Limite de envios por instalação em 24 horas.
  select count(*) into v_count
  from public.price_reports
  where installation = v_hash and created_at > now() - interval '24 hours';
  if v_count >= lim.max_por_dia then
    return 'limite';
  end if;

  -- Preço absurdo em relação à mediana dos últimos 60 dias (com pelo menos 3 registros).
  select percentile_cont(0.5) within group (order by price), count(*)
  into v_median, v_count
  from public.price_reports
  where store = p_store and product_id = p_product_id and day > v_day - 60;
  if v_count >= 3 and (p_price > v_median * lim.fator_outlier or p_price < v_median / lim.fator_outlier) then
    return 'rejeitado';
  end if;

  insert into public.products (store, product_id) values (p_store, p_product_id)
  on conflict do nothing;

  insert into public.price_reports (store, product_id, day, installation, price)
  values (p_store, p_product_id, v_day, v_hash, round(p_price, 2))
  on conflict (store, product_id, day, installation)
  do update set price = least(public.price_reports.price, excluded.price);

  return 'ok';
end;
$$;

-- Histórico agregado por dia (mediana entre as instalações, o que dilui dados falsos).
create or replace function public.get_price_history(p_store text, p_product_id text)
returns table (day date, price numeric, reports int)
language sql
stable
security definer
set search_path = ''
as $$
  select r.day,
         round(percentile_cont(0.5) within group (order by r.price)::numeric, 2) as price,
         count(*)::int as reports
  from public.price_reports r
  where r.store = p_store
    and r.product_id = p_product_id
    and r.day > (now() at time zone 'America/Sao_Paulo')::date - 365
  group by r.day
  order by r.day
$$;

revoke all on function public.submit_price(text, text, numeric, uuid) from public;
revoke all on function public.get_price_history(text, text) from public;
revoke all on function public.preco_real_limits() from public;
grant execute on function public.submit_price(text, text, numeric, uuid) to anon, authenticated;
grant execute on function public.get_price_history(text, text) to anon, authenticated;
