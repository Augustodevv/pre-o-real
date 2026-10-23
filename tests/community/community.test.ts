import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createCommunityClient, type CommunityClient } from '../../src/community/client';
import { mergeHistories } from '../../src/community/merge';
import { clearCommunityCache, loadCommunityHistory, shareSnapshot } from '../../src/community/sync';
import type { PriceRecord, ProductSnapshot } from '../../src/core/types';
import { makeProductView } from '../../src/core/view';

const URL_ = 'https://abc.supabase.co';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('cliente do histórico compartilhado', () => {
  it('chama submit_price só com loja, ID, preço e instalação', async () => {
    const fetchFn = vi.fn(async () => jsonResponse('ok'));
    const client = createCommunityClient(URL_, 'sb_publishable_123456789012345678901', fetchFn);
    expect(await client.submitPrice('kabum', '475647', 1899.99, 'inst-1')).toBe('ok');
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${URL_}/rest/v1/rpc/submit_price`);
    expect(JSON.parse(String(init.body))).toEqual({
      p_store: 'kabum',
      p_product_id: '475647',
      p_price: 1899.99,
      p_installation: 'inst-1',
    });
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', apikey: 'sb_publishable_123456789012345678901' });
    expect(init.credentials).toBe('omit');
  });

  it('usa Authorization com chaves anon (JWT)', async () => {
    const fetchFn = vi.fn(async () => jsonResponse([]));
    await createCommunityClient(URL_, 'eyJhbGciOiJIUzI1NiJ9.x.y', fetchFn).getHistory('amazon', 'B09B8VGCR8');
    const init = (fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer eyJhbGciOiJIUzI1NiJ9.x.y');
  });

  it('converte o histórico e descarta linhas inválidas', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse([
        { day: '2026-10-01', price: '299.90', reports: 3 },
        { day: 'lixo', price: 1, reports: 1 },
        { day: '2026-10-02', price: 0, reports: 1 },
      ]),
    );
    const days = await createCommunityClient(URL_, 'k'.repeat(30), fetchFn).getHistory('amazon', 'X');
    expect(days).toEqual([{ day: '2026-10-01', price: 299.9, reports: 3 }]);
  });

  it('erro HTTP vira exceção', async () => {
    const client = createCommunityClient(URL_, 'k'.repeat(30), async () => jsonResponse({}, 500));
    await expect(client.getHistory('kabum', '1')).rejects.toThrow('500');
  });
});

describe('mergeHistories', () => {
  const local = (day: string, price: number): PriceRecord => ({
    key: 'kabum:1', day, price, listPrice: null, pixPrice: null, capturedAt: 1,
  });

  it('preenche dias sem registro local e mantém o local quando há os dois', () => {
    const merged = mergeHistories('kabum:1', [local('2026-10-20', 100)], [
      { day: '2026-10-01', price: 120, reports: 4 },
      { day: '2026-10-20', price: 90, reports: 2 },
    ]);
    expect(merged.map((r) => [r.day, r.price, !!r.community])).toEqual([
      ['2026-10-01', 120, true],
      ['2026-10-20', 100, false],
    ]);
  });

  it('com o histórico compartilhado, a classificação sai na primeira visita', () => {
    const history = mergeHistories('kabum:1', [local('2026-10-22', 80)], [
      { day: '2026-10-01', price: 100, reports: 5 },
      { day: '2026-10-10', price: 100, reports: 5 },
    ]);
    const product = {
      key: 'kabum:1', store: 'kabum' as const, productId: '1', name: 'X', imageUrl: null, url: '',
      firstSeen: 0, lastSeen: 0, lastPrice: 80, previousPrice: null, tracked: false, targetPrice: null,
      lastCheckAt: null, lastCheckError: null, alertedPrice: null,
    };
    const view = makeProductView(product, history, new Date(2026, 9, 22, 12).getTime(), true);
    expect(view.verdict.classification).toBe('bom');
    expect(view.communityDays).toBe(2);
  });
});

describe('envio e cache', () => {
  const snapshot: ProductSnapshot = {
    store: 'kabum', productId: '475647', name: 'Placa', price: 1899.99, listPrice: 2399.99,
    pixPrice: null, imageUrl: null, url: 'https://www.kabum.com.br/produto/475647',
  };

  let client: CommunityClient;
  beforeEach(() => {
    fakeBrowser.reset();
    clearCommunityCache();
    client = { submitPrice: vi.fn(async () => 'ok' as const), getHistory: vi.fn(async () => []) };
  });

  it('envia no máximo uma vez por produto por dia', async () => {
    const day1 = new Date(2026, 9, 22, 9).getTime();
    await shareSnapshot(client, snapshot, 'inst', day1);
    await shareSnapshot(client, { ...snapshot, price: 1799 }, 'inst', day1 + 3_600_000);
    expect(client.submitPrice).toHaveBeenCalledTimes(1);
    await shareSnapshot(client, snapshot, 'inst', day1 + 86_400_000);
    expect(client.submitPrice).toHaveBeenCalledTimes(2);
  });

  it('não envia dados além de loja, ID, preço e instalação', async () => {
    await shareSnapshot(client, snapshot, 'inst');
    expect(client.submitPrice).toHaveBeenCalledWith('kabum', '475647', 1899.99, 'inst');
  });

  it('falha no envio não quebra nada e tenta de novo depois', async () => {
    client.submitPrice = vi.fn(async () => {
      throw new Error('offline');
    });
    await expect(shareSnapshot(client, snapshot, 'inst')).resolves.toBeUndefined();
    await shareSnapshot(client, snapshot, 'inst');
    expect(client.submitPrice).toHaveBeenCalledTimes(2);
  });

  it('guarda o histórico em cache por 1 hora e devolve vazio se falhar', async () => {
    const now = Date.now();
    await loadCommunityHistory(client, snapshot, now);
    await loadCommunityHistory(client, snapshot, now + 10 * 60_000);
    expect(client.getHistory).toHaveBeenCalledTimes(1);
    await loadCommunityHistory(client, snapshot, now + 61 * 60_000);
    expect(client.getHistory).toHaveBeenCalledTimes(2);

    clearCommunityCache();
    client.getHistory = vi.fn(async () => {
      throw new Error('fora do ar');
    });
    expect(await loadCommunityHistory(client, snapshot)).toEqual([]);
  });
});
