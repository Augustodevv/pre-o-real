// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';

/**
 * Testa a migration do Supabase num Postgres em memória (PGlite).
 * Os papéis anon/authenticated são criados aqui como no Supabase.
 */
const MIGRATION = readFileSync(
  join(__dirname, '../../supabase/migrations/20261023000000_preco_real_historico_compartilhado.sql'),
  'utf8',
);
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';
const D = '44444444-4444-4444-8444-444444444444';

let db: PGlite;

async function submit(store: string, id: string, price: number, installation: string, role = 'anon') {
  await db.exec(`set role ${role}`);
  try {
    const r = await db.query<{ preco_real_submit_price: string }>('select public.preco_real_submit_price($1, $2, $3, $4)', [
      store,
      id,
      price,
      installation,
    ]);
    return r.rows[0]!.preco_real_submit_price;
  } finally {
    await db.exec('reset role');
  }
}

async function history(store: string, id: string) {
  await db.exec('set role anon');
  try {
    const r = await db.query<{ day: Date; price: string; reports: number }>(
      'select * from public.preco_real_get_price_history($1, $2)',
      [store, id],
    );
    return r.rows.map((row) => ({ price: Number(row.price), reports: row.reports }));
  } finally {
    await db.exec('reset role');
  }
}

beforeEach(async () => {
  db = new PGlite();
  // Como no Supabase: papéis anon/authenticated e permissões automáticas no schema public.
  await db.exec(`create role anon nologin; create role authenticated nologin;
    grant usage on schema public to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on functions to anon, authenticated;`);
  await db.exec(MIGRATION);
});

describe('submit_price e get_price_history', () => {
  it('registra e devolve a mediana por dia', async () => {
    expect(await submit('kabum', '475647', 1899.99, A)).toBe('ok');
    expect(await submit('kabum', '475647', 1999.99, B)).toBe('ok');
    expect(await submit('kabum', '475647', 1949.99, C)).toBe('ok');
    expect(await history('kabum', '475647')).toEqual([{ price: 1949.99, reports: 3 }]);
  });

  it('uma instalação conta uma vez por dia, com o menor preço', async () => {
    await submit('amazon', 'B09B8VGCR8', 310, A);
    await submit('amazon', 'B09B8VGCR8', 299, A);
    await submit('amazon', 'B09B8VGCR8', 305, A);
    expect(await history('amazon', 'B09B8VGCR8')).toEqual([{ price: 299, reports: 1 }]);
  });

  it('não guarda o ID da instalação, só o hash', async () => {
    await submit('magalu', '237645600', 899, A);
    const r = await db.query<{ installation: string }>('select installation from preco_real.price_reports');
    expect(r.rows[0]!.installation).toMatch(/^[0-9a-f]{64}$/);
    expect(r.rows[0]!.installation).not.toContain('1111');
  });

  it('valida loja, ID e faixa de preço', async () => {
    await expect(submit('lojafalsa', '123', 10, A)).rejects.toThrow('loja inválida');
    await expect(submit('kabum', "1; drop table x", 10, A)).rejects.toThrow('ID de produto inválido');
    await expect(submit('kabum', '123', 0.5, A)).rejects.toThrow('preço fora da faixa');
    await expect(submit('kabum', '123', 9_999_999, A)).rejects.toThrow('preço fora da faixa');
  });

  it('rejeita preço absurdo em relação à mediana', async () => {
    for (const inst of [A, B, C]) await submit('casasbahia', '55012345', 349.9, inst);
    expect(await submit('casasbahia', '55012345', 34.99, D)).toBe('rejeitado');
    expect(await submit('casasbahia', '55012345', 3499, D)).toBe('rejeitado');
    expect(await submit('casasbahia', '55012345', 329.9, D)).toBe('ok');
  });

  it('limita envios por instalação em 24 horas', async () => {
    const hash = await db.query<{ h: string }>(`select encode(sha256(convert_to($1, 'UTF8')), 'hex') as h`, [A]);
    await db.exec(`insert into preco_real.products values ('kabum', '999', now())`);
    await db.query(
      `insert into preco_real.price_reports (store, product_id, day, installation, price)
       select 'kabum', '999', current_date - g, $1, 10 from generate_series(1, 300) g`,
      [hash.rows[0]!.h],
    );
    expect(await submit('kabum', '475647', 100, A)).toBe('limite');
    expect(await submit('kabum', '475647', 100, B)).toBe('ok');
  });
});

describe('acesso público', () => {
  it('anon não lê nem escreve nas tabelas diretamente', async () => {
    await db.exec('set role anon');
    await expect(db.query('select * from preco_real.price_reports')).rejects.toThrow(/permission denied/);
    await expect(
      db.query(`insert into preco_real.products (store, product_id) values ('kabum', '1')`),
    ).rejects.toThrow(/permission denied/);
    await db.exec('reset role');
  });

  it('anon não executa funções internas', async () => {
    await db.exec('set role anon');
    await expect(db.query('select * from preco_real.limits()')).rejects.toThrow(/permission denied/);
    await db.exec('reset role');
  });

  it('anon não acessa o schema preco_real', async () => {
    await db.exec('set role anon');
    await expect(db.query('select * from preco_real.products')).rejects.toThrow(/permission denied/);
    await db.exec('reset role');
  });
});
