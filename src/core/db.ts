import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { dayKey } from './dates';
import { productKey, type PriceRecord, type Product, type ProductSnapshot } from './types';

interface PrecoRealDB extends DBSchema {
  products: {
    key: string;
    value: Product;
    indexes: { 'by-store': string; 'by-lastSeen': number };
  };
  prices: {
    key: [string, string];
    value: PriceRecord;
    indexes: { 'by-key': string };
  };
}

const DB_NAME = 'preco-real';
let dbPromise: Promise<IDBPDatabase<PrecoRealDB>> | null = null;

function db() {
  dbPromise ??= openDB<PrecoRealDB>(DB_NAME, 1, {
    upgrade(database) {
      const products = database.createObjectStore('products', { keyPath: 'key' });
      products.createIndex('by-store', 'store');
      products.createIndex('by-lastSeen', 'lastSeen');
      const prices = database.createObjectStore('prices', { keyPath: ['key', 'day'] });
      prices.createIndex('by-key', 'key');
    },
  });
  return dbPromise;
}

/** Fecha a conexão (usado em testes). */
export async function closeDb() {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}

/**
 * Salva o preço capturado. Mantém um registro por produto por dia, com o menor preço do dia.
 */
export async function recordSnapshot(snapshot: ProductSnapshot, now = Date.now()): Promise<Product> {
  const database = await db();
  const tx = database.transaction(['products', 'prices'], 'readwrite');
  const key = productKey(snapshot.store, snapshot.productId);
  const day = dayKey(now);

  const existingRecord = await tx.objectStore('prices').get([key, day]);
  const record: PriceRecord = {
    key,
    day,
    price: snapshot.price,
    listPrice: snapshot.listPrice,
    pixPrice: snapshot.pixPrice,
    capturedAt: now,
  };
  if (existingRecord && existingRecord.price <= snapshot.price) {
    record.price = existingRecord.price;
    record.listPrice = existingRecord.listPrice ?? snapshot.listPrice;
    record.capturedAt = existingRecord.capturedAt;
  }
  record.pixPrice = minOrNull(existingRecord?.pixPrice ?? null, snapshot.pixPrice);
  await tx.objectStore('prices').put(record);

  const previousDay = await lastRecordBefore(tx.objectStore('prices').index('by-key'), key, day);
  const existing = await tx.objectStore('products').get(key);
  const product: Product = {
    key,
    store: snapshot.store,
    productId: snapshot.productId,
    name: snapshot.name || existing?.name || '',
    imageUrl: snapshot.imageUrl ?? existing?.imageUrl ?? null,
    url: snapshot.url,
    firstSeen: existing?.firstSeen ?? now,
    lastSeen: now,
    lastPrice: record.price,
    previousPrice: previousDay?.price ?? null,
    tracked: existing?.tracked ?? false,
    targetPrice: existing?.targetPrice ?? null,
    lastCheckAt: existing?.lastCheckAt ?? null,
    lastCheckError: existing?.lastCheckError ?? null,
  };
  await tx.objectStore('products').put(product);
  await tx.done;
  return product;
}

async function lastRecordBefore(
  index: { getAll(query: string): Promise<PriceRecord[]> },
  key: string,
  day: string,
): Promise<PriceRecord | undefined> {
  const all = await index.getAll(key);
  return all.filter((r) => r.day < day).sort((a, b) => b.day.localeCompare(a.day))[0];
}

function minOrNull(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

/** Histórico do produto em ordem cronológica. */
export async function getHistory(key: string): Promise<PriceRecord[]> {
  const records = await (await db()).getAllFromIndex('prices', 'by-key', key);
  return records.sort((a, b) => a.day.localeCompare(b.day));
}

export async function getProduct(key: string): Promise<Product | undefined> {
  return (await db()).get('products', key);
}

/** Produtos vistos, do mais recente para o mais antigo. */
export async function listProducts(): Promise<Product[]> {
  const all = await (await db()).getAll('products');
  return all.sort((a, b) => b.lastSeen - a.lastSeen);
}

export async function updateProduct(key: string, changes: Partial<Product>): Promise<Product | undefined> {
  const database = await db();
  const existing = await database.get('products', key);
  if (!existing) return undefined;
  const updated = { ...existing, ...changes, key };
  await database.put('products', updated);
  return updated;
}

export async function deleteProduct(key: string): Promise<void> {
  const database = await db();
  const tx = database.transaction(['products', 'prices'], 'readwrite');
  await tx.objectStore('products').delete(key);
  const keys = await tx.objectStore('prices').index('by-key').getAllKeys(key);
  await Promise.all(keys.map((k) => tx.objectStore('prices').delete(k)));
  await tx.done;
}

export async function clearAll(): Promise<void> {
  const database = await db();
  const tx = database.transaction(['products', 'prices'], 'readwrite');
  await Promise.all([tx.objectStore('products').clear(), tx.objectStore('prices').clear()]);
  await tx.done;
}

export interface ExportData {
  app: 'preco-real';
  version: 1;
  exportedAt: string;
  products: Product[];
  prices: PriceRecord[];
}

export async function exportAll(): Promise<ExportData> {
  const database = await db();
  return {
    app: 'preco-real',
    version: 1,
    exportedAt: new Date().toISOString(),
    products: await database.getAll('products'),
    prices: await database.getAll('prices'),
  };
}

/**
 * Importa dados exportados, mesclando com os existentes. Em conflito no mesmo dia,
 * mantém o menor preço. Retorna quantos produtos e registros foram importados.
 */
export async function importAll(data: unknown): Promise<{ products: number; prices: number }> {
  if (!isExportData(data)) throw new Error('Arquivo inválido: não é um backup do Preço Real.');
  const database = await db();
  const tx = database.transaction(['products', 'prices'], 'readwrite');
  for (const p of data.products) {
    const existing = await tx.objectStore('products').get(p.key);
    const merged = existing
      ? {
          ...p,
          firstSeen: Math.min(existing.firstSeen, p.firstSeen),
          ...(existing.lastSeen > p.lastSeen ? existing : {}),
          tracked: existing.tracked || p.tracked,
          targetPrice: existing.targetPrice ?? p.targetPrice,
        }
      : p;
    await tx.objectStore('products').put(merged);
  }
  for (const r of data.prices) {
    const existing = await tx.objectStore('prices').get([r.key, r.day]);
    if (!existing || r.price < existing.price) await tx.objectStore('prices').put(r);
  }
  await tx.done;
  return { products: data.products.length, prices: data.prices.length };
}

function isExportData(data: unknown): data is ExportData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<ExportData>;
  return (
    d.app === 'preco-real' &&
    Array.isArray(d.products) &&
    Array.isArray(d.prices) &&
    d.products.every((p) => typeof p?.key === 'string' && typeof p?.lastPrice === 'number') &&
    d.prices.every(
      (r) => typeof r?.key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r?.day) && typeof r?.price === 'number',
    )
  );
}
