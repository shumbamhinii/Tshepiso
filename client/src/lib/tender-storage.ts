// src/lib/tender-storage.ts
export type StoredCatalogs = Record<string, Array<{
  id: string; supplierName: string; sku?: string; productName: string;
  unit?: string; price: number; currency?: string;
}>>;

export type StoredTenderItem = {
  lineNo: number | string; description: string; unit?: string;
  qty: number; chosenSourceId?: string; costPerUnit?: number;
};
export type StoredTender = {
  id: string; name: string;
  createdAt: string; updatedAt: string;
  pricingMode: "margin" | "targetProfit";
  targetMarginPct: number; targetProfitAbsolute: number;
  items: StoredTenderItem[];
};

const K = {
  catalogs: "tm_catalogsBySupplier_v1",
  tenders: "tm_savedTenders_v1",
};

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  try { return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
};

/* ---------------- Suppliers (catalogs) ---------------- */
export const loadCatalogs = (): StoredCatalogs =>
  safeParse(localStorage.getItem(K.catalogs), {});

export const saveCatalogs = (catalogs: StoredCatalogs) =>
  localStorage.setItem(K.catalogs, JSON.stringify(catalogs));

/* ---------------------- Tenders ----------------------- */
export const listTenders = (): StoredTender[] =>
  safeParse(localStorage.getItem(K.tenders), []);

export const saveTender = (t: StoredTender) => {
  const all = listTenders();
  const idx = all.findIndex(x => x.id === t.id);
  if (idx >= 0) all[idx] = t; else all.unshift(t);
  localStorage.setItem(K.tenders, JSON.stringify(all));
};

export const getTender = (id: string): StoredTender | undefined =>
  listTenders().find(t => t.id === id);

export const deleteTender = (id: string) => {
  const filtered = listTenders().filter(t => t.id !== id);
  localStorage.setItem(K.tenders, JSON.stringify(filtered));
};

export const uid = () => Math.random().toString(36).slice(2, 9);
