import { afterEach, describe, expect, it, vi } from 'vitest';
import { mercadoLivre } from '../../src/adapters/mercadolivre';
import { watchProduct } from '../../src/content/watch';

const PRICE_HTML = `
  <div class="ui-pdp-price__second-line">
    <span class="andes-money-amount"><span class="andes-money-amount__fraction">PRECO</span><span class="andes-money-amount__cents">90</span></span>
  </div>`;

describe('watchProduct', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('espera o preço aparecer e avisa de novo quando ele muda', async () => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/fone/p/MLB25263382');
    // jsdom usa localhost; o adaptador só olha o caminho para achar o ID.
    document.body.innerHTML = '<h1 class="ui-pdp-title">Fone</h1><div id="preco"></div>';
    const onSnapshot = vi.fn();
    const stop = watchProduct(mercadoLivre, onSnapshot, { debounceMs: 100 });
    expect(onSnapshot).not.toHaveBeenCalled();

    document.getElementById('preco')!.innerHTML = PRICE_HTML.replace('PRECO', '199');
    await vi.advanceTimersByTimeAsync(150);
    expect(onSnapshot).toHaveBeenCalledTimes(1);
    expect(onSnapshot.mock.calls[0]![0]).toMatchObject({ productId: 'MLB25263382', price: 199.9 });

    // Mutação que não muda o preço: não avisa de novo.
    document.body.appendChild(document.createElement('div'));
    await vi.advanceTimersByTimeAsync(150);
    expect(onSnapshot).toHaveBeenCalledTimes(1);

    // Troca de variação muda o preço.
    document.getElementById('preco')!.innerHTML = PRICE_HTML.replace('PRECO', '179');
    await vi.advanceTimersByTimeAsync(150);
    expect(onSnapshot).toHaveBeenCalledTimes(2);
    expect(onSnapshot.mock.calls[1]![0].price).toBe(179.9);
    stop();
  });

  it('desiste depois do tempo limite se o preço nunca aparecer', async () => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/fone/p/MLB1234567');
    document.body.innerHTML = '<h1 class="ui-pdp-title">Fone</h1>';
    const onSnapshot = vi.fn();
    watchProduct(mercadoLivre, onSnapshot, { debounceMs: 100, timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1100);
    document.body.innerHTML += PRICE_HTML.replace('PRECO', '10');
    await vi.advanceTimersByTimeAsync(200);
    expect(onSnapshot).not.toHaveBeenCalled();
  });
});
