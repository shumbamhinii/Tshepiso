// src/components/pricing/TenderManagementTab.tsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import Fuse from "fuse.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, Calculator, Trash2, Save, RefreshCw, X, MoreHorizontal } from "lucide-react";
import type { PricingProduct } from "@/types/pricing";
import type {
  SupplierRow, TenderItem, TenderPricingState, CatalogItem, TenderSupplierOption,
} from "@/types/pricing";

// optional: if you have shadcn dropdown installed, uncomment these 5 lines and use it below
// import {
//   DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
//   DropdownMenuItem, DropdownMenuSeparator
// } from "@/components/ui/dropdown-menu";

import SupplierManagerPanel from "./SupplierManagerPanel";
import AllCatalogsView from "./AllCatalogsView";
import {
  loadCatalogs, saveCatalogs, listTenders, saveTender as storageSaveTender,
  getTender, deleteTender as storageDeleteTender, uid as storageUid,
} from "@/lib/tender-storage";
import type { StoredCatalogs, StoredTender } from "@/lib/tender-storage";

/* ------------------------------ utils ------------------------------ */
type Props = { products: PricingProduct[]; defaultMarginPct?: number; onUseMargin?: (pct: number) => void; };
type EditableSupplierRow = SupplierRow & { __id: string };
type ViewMode = "tender" | "suppliers" | "all";

const norm = (s: any) => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
const number = (v: any, fallback = 0) => {
  const n = parseFloat(String(v).replace(/[, ]/g, "")); return Number.isFinite(n) ? n : fallback;
};
const money = (v: any, fallback = 0) => { if (v == null) return fallback; const n = String(v).replace(/[^\d.-]/g, ""); const num = parseFloat(n); return Number.isFinite(num) ? num : fallback; };
const canon = (s: any) => String(s ?? "").toLowerCase().replace(/[×x]/g, " ").replace(/[*\-_/(),.]+/g, " ").replace(/\s+/g, " ").trim();
const extractCodes = (s: string) => Array.from(s.matchAll(/\b(\d{4,})\b/g)).map(m => m[1]);
const containsAll = (h: string, n: string[]) => n.every(x => h.includes(x));

/* -------------------------- parsing helpers ------------------------ */
const parseCSVLight = async (file: File) => {
  const text = await file.text(); const lines = text.split(/\r?\n/).filter(Boolean); if (!lines.length) return [];
  const headers = lines[0].replace(/^\uFEFF/, "").split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.trim()); const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cols[i] ?? "")); return row;
  });
};
const findHeaderRowIndex = (rows: any[][], minCols = 3) => {
  const hints = ["supplier","product","description","item","price","cost","unit","uom","currency","code","sku","current","new","qty"];
  for (let i = 0; i < rows.length; i++) {
    const values = (rows[i] || []).map(norm).filter(Boolean);
    if (values.length >= minCols && values.some(v => hints.some(h => v.includes(h)))) return i;
  }
  return rows.findIndex(r => (r || []).some(Boolean));
};
const guessColIndex = (headers: string[], candidates: string[]) => {
  const idx = headers.findIndex(h => candidates.some(c => h.includes(c))); return idx === -1 ? undefined : idx;
};
const coerceMatrixToObjects = (matrix: any[][]) => {
  const cleaned = (matrix || []).map(r => (r || []).map(c => (typeof c === "string" ? c.trim() : c)));
  if (!cleaned.length) return [];
  const headerRowIdx = Math.max(0, findHeaderRowIndex(cleaned));
  const headerRow = (cleaned[headerRowIdx] || []).map(h => norm(h));
  const colSupplier = guessColIndex(headerRow, ["supplier", "vendor"]);
  const colSKU      = guessColIndex(headerRow, ["sku", "code", "product code"]);
  const colName     = guessColIndex(headerRow, ["product", "description", "item", "name"]);
  const colUnit     = guessColIndex(headerRow, ["unit", "uom"]);
  const colNew      = guessColIndex(headerRow, ["new", "new price"]);
  const colCurrent  = guessColIndex(headerRow, ["current", "current price"]);
  const colPriceGen = guessColIndex(headerRow, ["price", "cost", "amount"]);
  const colCurr     = guessColIndex(headerRow, ["currency"]);
  const dataRows = cleaned.slice(headerRowIdx + 1);
  const out: Record<string, any>[] = [];
  for (const r of dataRows) {
    const supplier = colSupplier != null ? r[colSupplier] : "";
    const sku      = colSKU      != null ? r[colSKU]      : "";
    const name     = colName     != null ? r[colName]     : "";
    const unit     = colUnit     != null ? r[colUnit]     : "";
    const priceRaw = (colNew != null ? r[colNew] : colCurrent != null ? r[colCurrent] : colPriceGen != null ? r[colPriceGen] : "");
    const currency = colCurr != null ? r[colCurr] : (String(priceRaw).includes("R") ? "ZAR" : "");
    const price = money(priceRaw, NaN);
    if ((String(name).trim() || String(sku).trim()) && Number.isFinite(price)) {
      out.push({ supplier: String(supplier||"").trim(), sku: String(sku||"").trim(), product: String(name||"").trim(), unit: String(unit||"").trim(), price, currency: currency || "ZAR" });
    }
  }
  return out;
};
const coerceTenderMatrixToObjects = (matrix: any[][]) => {
  const cleaned = (matrix || []).map(r => (r || []).map(c => (typeof c === "string" ? c.trim() : c)));
  if (!cleaned.length) return [];
  const headerRowIdx = Math.max(0, findHeaderRowIndex(cleaned));
  const headerRow = (cleaned[headerRowIdx] || []).map(h => norm(h));
  const colDesc = guessColIndex(headerRow, ["description","item","product","name"]);
  const colQty  = guessColIndex(headerRow, ["qty","quantity"]);
  const colUnit = guessColIndex(headerRow, ["unit","uom"]);
  const colLine = guessColIndex(headerRow, ["line","lineno","line no"]);
  const dataRows = cleaned.slice(headerRowIdx + 1);
  const out: Record<string, any>[] = [];
  for (let i=0;i<dataRows.length;i++){
    const r = dataRows[i]||[]; const description = (colDesc!=null? r[colDesc]:"").toString().trim(); if (!description) continue;
    const qty = number(colQty!=null? r[colQty]:0,0); const unit = (colUnit!=null? r[colUnit]:"").toString().trim(); const lineNo = colLine!=null? r[colLine]: i+1;
    out.push({ description, qty, unit, lineNo });
  }
  return out;
};
const parseFile = async (file: File) => {
  const name = file.name.toLowerCase(); const isCSV = name.endsWith(".csv"); const isXLSX = /\.(xlsx|xls)$/i.test(name);
  if (isCSV) {
    try { const mod = await import("papaparse"); const Papa: any = (mod as any).default ?? mod;
      const parsed = await new Promise<any[]>((res, rej)=>{Papa.parse(file,{header:false,skipEmptyLines:true,complete:(r:any)=>res(r.data),error:rej});});
      const matrix = parsed.map(r => (Array.isArray(r)? r : Object.values(r))); return coerceMatrixToObjects(matrix);
    } catch { const light = await parseCSVLight(file); if (light.length) return light; const rows = (await file.text()).split(/\r?\n/).map(l=>l.split(",")); return coerceMatrixToObjects(rows); }
  }
  if (isXLSX) {
    const XLSXmod = await import("xlsx"); const XLSX: any = (XLSXmod as any).default ?? XLSXmod;
    const data = await file.arrayBuffer(); const wb = XLSX.read(data,{}); const sheetName = wb.SheetNames.reduce((best:string,n:string)=>{
      const len = (XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1})).length; if (!best) return n;
      const bestLen = (XLSX.utils.sheet_to_json(wb.Sheets[best],{header:1})).length; return len>bestLen?n:best;
    },"");
    const matrix:any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName],{header:1,blankrows:false,defval:""}); return coerceMatrixToObjects(matrix);
  }
  throw new Error("Unsupported file type. Please upload CSV or XLSX/XLS.");
};
const parseTenderFile = async (file: File) => {
  const name = file.name.toLowerCase(); const isCSV = name.endsWith(".csv"); const isXLSX = /\.(xlsx|xls)$/i.test(name);
  if (isCSV) {
    try { const mod = await import("papaparse"); const Papa: any = (mod as any).default ?? mod;
      const parsed = await new Promise<any[]>((res, rej)=>{Papa.parse(file,{header:false,skipEmptyLines:true,complete:(r:any)=>res(r.data),error:rej});});
      const matrix = parsed.map(r => (Array.isArray(r)? r : Object.values(r))); return coerceTenderMatrixToObjects(matrix);
    } catch { const rows = (await file.text()).split(/\r?\n/).map(l=>l.split(",")); return coerceTenderMatrixToObjects(rows); }
  }
  const XLSXmod = await import("xlsx"); const XLSX: any = (XLSXmod as any).default ?? XLSXmod;
  const data = await file.arrayBuffer(); const wb = XLSX.read(data,{}); const sheetName = wb.SheetNames.reduce((b:string,n:string)=>{
    const len = (XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1})).length; if(!b) return n;
    const bl = (XLSX.utils.sheet_to_json(wb.Sheets[b],{header:1})).length; return len>bl?n:b;
  },"");
  const matrix:any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName],{header:1,blankrows:false,defval:""}); return coerceTenderMatrixToObjects(matrix);
};

/* ============================== Component ============================== */
const TenderManagementTab: React.FC<Props> = ({ products, defaultMarginPct = 0, onUseMargin }) => {
  const { toast } = useToast();
  const [view, setView] = useState<ViewMode>("tender");

  const [state, setState] = useState<TenderPricingState>({
    supplierRows: [], tenderItems: [], pricingMode: "margin",
    targetMarginPct: defaultMarginPct, targetProfitAbsolute: 0,
    // @ts-ignore
    catalogsBySupplier: {},
  });

  // tender meta
  const [tenderId, setTenderId] = useState<string>("");
  const [tenderName, setTenderName] = useState<string>("");
  const [tenders, setTenders] = useState<StoredTender[]>([]);
  const refreshTenderList = () => setTenders(listTenders());

  // local inputs
  const [supplierNameHint, setSupplierNameHint] = useState<string>("");
  const supplierInputRef = useRef<HTMLInputElement | null>(null);
  const tenderInputRef = useRef<HTMLInputElement | null>(null);

  const productsById = useMemo(() => {
    const map = new Map<number, PricingProduct>(); products.forEach(p => map.set(Number(p.id), p)); return map;
  }, [products]);

  /* ---------- load & persist catalogs ---------- */
  useEffect(() => {
    const catalogs = loadCatalogs() || {};
    const supplierRows: EditableSupplierRow[] = Object.values(catalogs).flat().map((it: any) => ({
      __id: it.id, supplierName: it.supplierName, sku: it.sku, productName: it.productName, unit: it.unit, price: it.price, currency: it.currency,
    }));
    setState(s => ({ ...s, catalogsBySupplier: catalogs as any, supplierRows }));
    refreshTenderList();
  }, []);
  useEffect(() => { saveCatalogs((state as any).catalogsBySupplier || {}); }, [(state as any).catalogsBySupplier]);

  /* ---------- search index ---------- */
  const allCatalogItems: (CatalogItem & { searchName?: string })[] = useMemo(() => {
    const out: (CatalogItem & { searchName?: string })[] = [];
    const catalogs = (state as any).catalogsBySupplier || {};
    Object.keys(catalogs).forEach(supplier => {
      (catalogs[supplier] as (CatalogItem & { searchName?: string })[]).forEach(it =>
        out.push({ ...it, searchName: canon((it as any).productName || "") })
      );
    });
    return out;
  }, [state]);

  const fuse = useMemo(() => {
    if (!allCatalogItems.length) return null;
    return new Fuse(allCatalogItems, { threshold: 0.55, distance: 180, ignoreLocation: true, minMatchCharLength: 2,
      keys: [{ name: "searchName", weight: 0.7 } as any, { name: "sku", weight: 0.3 } as any],
    });
  }, [allCatalogItems]);

  const findOptionsFor = (desc: string, limit = 6): TenderSupplierOption[] => {
    if (!desc) return [];
    const q = canon(desc);
    const fuzzy: TenderSupplierOption[] = fuse
      ? fuse.search(q, { limit }).map(r => ({ supplierName: r.item.supplierName, sku: r.item.sku, unit: r.item.unit, price: r.item.price, sourceId: r.item.id, score: r.score ?? 1 }))
      : [];
    const codes = extractCodes(desc);
    const codeHits: TenderSupplierOption[] = codes.length
      ? allCatalogItems.filter(ci => ci.sku && codes.some(c => ci.sku!.includes(c)))
        .map(ci => ({ supplierName: ci.supplierName, sku: ci.sku, unit: ci.unit, price: ci.price, sourceId: ci.id, score: 0.01 }))
      : [];
    const tokens = q.split(" ").filter(Boolean);
    const loose: TenderSupplierOption[] = !fuzzy.length && !codeHits.length
      ? allCatalogItems.filter(ci => containsAll(ci.searchName || canon((ci as any).productName || ""), tokens.slice(0, 3)))
        .slice(0, limit).map(ci => ({ supplierName: ci.supplierName, sku: ci.sku, unit: ci.unit, price: ci.price, sourceId: ci.id, score: 0.5 }))
      : [];
    const all = [...codeHits, ...fuzzy, ...loose].sort((a,b)=> a.price - b.price);
    const seen = new Set<string>(); return all.filter(o => (seen.has(o.sourceId) ? false : (seen.add(o.sourceId), true))).slice(0, limit);
  };

  /* ---------- uploads ---------- */
  const handleSupplierUpload = async (file: File) => {
    try {
      const rows = await parseFile(file);
      const fallbackSupplier = supplierNameHint?.trim() || file.name.replace(/\.(xlsx|xls|csv)$/i, "") || "Unknown Supplier";
      const newItems: CatalogItem[] = [];
      for (const r of rows) {
        const supplierName = (r.supplier || r.Supplier || r.supplierName || r.SupplierName || fallbackSupplier).toString().trim();
        const sku = (r.sku || r.SKU || r.code || "").toString().trim();
        const productName = (r.product || r.Product || r.name || r.Name || r.description || r.Description || r.item || r.Item || "").toString().trim();
        const unit = (r.unit || r.Unit || r.uom || r.UOM || "").toString().trim();
        const price = number(r.price ?? r.Price ?? r.cost ?? r.Cost ?? r.new ?? r.New ?? r.current ?? r.Current, 0);
        const currency = (r.currency || r.Currency || (String(r.price).includes("R") ? "ZAR" : "") || "ZAR").toString().trim();
        if (!(productName || sku) || !(price > 0)) continue;
        newItems.push({ id: storageUid(), supplierName, sku, productName, unit, price, currency } as any);
      }
      const catalogs: StoredCatalogs = { ...(state as any).catalogsBySupplier };
      newItems.forEach((it:any) => { const s = it.supplierName; catalogs[s] = catalogs[s] || []; catalogs[s].push(it); });
      saveCatalogs(catalogs);
      setState(s => ({ ...s, catalogsBySupplier: catalogs as any, supplierRows: syncSupplierRowsFromCatalogs(catalogs) }));
      toast({ title: "Supplier list uploaded", description: `${newItems.length} items added.` });
    } catch (e:any) { toast({ title: "Failed to parse supplier file", description: e.message, variant: "destructive" }); }
  };

  const handleTenderUpload = async (file: File) => {
    try {
      const rows = await parseTenderFile(file);
      const normalized: TenderItem[] = rows.map((r:any, idx:number) => {
        const desc = String(r.description ?? r.Description ?? r.item ?? r.Item ?? r.product ?? r.Product ?? "").trim();
        const qty = number(r.qty ?? r.quantity ?? r.Qty ?? r.Quantity, 0);
        const unit = (r.unit || r.Unit || r.uom || r.UOM || "").toString().trim();
        const supplierOptions = findOptionsFor(desc, 6);
        const cheapest = supplierOptions.reduce<TenderSupplierOption | undefined>((best, cur) => !best || cur.price < best.price ? cur : best, undefined);
        return { lineNo: r.lineNo ?? r.Line ?? idx + 1, description: desc || `Line ${idx + 1}`, unit, qty, mappedProductId: null, supplierOptions, chosenSourceId: cheapest?.sourceId, costPerUnit: cheapest?.price ?? undefined };
      });
      setState(s => ({ ...s, tenderItems: normalized }));
      toast({ title: "Tender uploaded", description: `${normalized.length} lines loaded.` });
    } catch (e:any) { toast({ title: "Failed to parse tender file", description: e.message, variant: "destructive" }); }
  };

  const rebuildMatches = () => {
    setState(prev => {
      const next = { ...prev, tenderItems: prev.tenderItems.map(it => {
        const opts = findOptionsFor(it.description, 6);
        const cheapest = opts.reduce<TenderSupplierOption | undefined>((b,c)=>!b||c.price<b.price?c:b, undefined);
        const keep = it.chosenSourceId && opts.find(o => o.sourceId === it.chosenSourceId);
        const chosen = keep?.sourceId ?? cheapest?.sourceId;
        const chosenPrice = keep?.price ?? cheapest?.price ?? it.costPerUnit;
        return { ...it, supplierOptions: opts, chosenSourceId: chosen, costPerUnit: chosenPrice };
      }) } as TenderPricingState;
      return next;
    });
    toast({ title: "Re‑matched supplier options" });
  };

  /* ---------- pricing ---------- */
  const recalc = (draft = state): TenderPricingState => {
    const items = draft.tenderItems.map(it => {
      let cpu = number(it.costPerUnit, 0);
      if ((!cpu || cpu <= 0) && it.mappedProductId) {
        const mapped = productsById.get(Number(it.mappedProductId)); cpu = number(mapped?.costPerUnit, 0);
      }
      let unitPrice = cpu * (1 + number(draft.targetMarginPct, 0) / 100);
      if (draft.pricingMode === "targetProfit") {
        const base = draft.tenderItems.reduce((s,x)=> s + number(x.qty) * number(x.costPerUnit), 0);
        const alloc = base > 0 ? (number(draft.targetProfitAbsolute, 0) * ((number(it.qty) * cpu) / base)) : 0;
        unitPrice = cpu + (alloc / Math.max(1, number(it.qty)));
      }
      const lineTotal = unitPrice * Math.max(0, number(it.qty));
      return { ...it, costPerUnit: cpu, suggestedUnitPrice: Number(unitPrice.toFixed(2)), suggestedLineTotal: Number(lineTotal.toFixed(2)) } as any;
    });
    return { ...draft, tenderItems: items } as any;
  };

  const totals = useMemo(() => {
    const cost = state.tenderItems.reduce((s, it) => s + number(it.costPerUnit) * number(it.qty), 0);
    const price = state.tenderItems.reduce((s, it) => s + number((it as any).suggestedLineTotal), 0);
    return { cost: +cost.toFixed(2), price: +price.toFixed(2), profit: +(price - cost).toFixed(2), marginPct: +(cost>0 ? ((price-cost)/cost*100).toFixed(2) : 0) };
  }, [state.tenderItems]);

  /* ---------- helpers & CRUD ---------- */
  const syncSupplierRowsFromCatalogs = (catalogs: StoredCatalogs) =>
    Object.values(catalogs).flat().map((it: any) => ({ __id: it.id, supplierName: it.supplierName, sku: it.sku, productName: it.productName, unit: it.unit, price: it.price, currency: it.currency }));

  const deleteRow = (id: string) => {
    const catalogs: StoredCatalogs = { ...(state as any).catalogsBySupplier }; let changed = false;
    for (const s of Object.keys(catalogs)) { const before = catalogs[s].length; catalogs[s] = catalogs[s].filter(it => it.id !== id); if (catalogs[s].length !== before) changed = true; }
    if (changed) { saveCatalogs(catalogs); setState(prev => ({ ...prev, catalogsBySupplier: catalogs as any, supplierRows: syncSupplierRowsFromCatalogs(catalogs) })); }
  };
  const clearAll = () => { saveCatalogs({}); setState(s => ({ ...s, supplierRows: [], catalogsBySupplier: {} as any })); };
  const handleReprice = () => { setState(s => recalc(s)); if (state.pricingMode === "margin" && onUseMargin) onUseMargin(state.targetMarginPct); toast({ title: "Pricing updated", description: "Suggested prices refreshed." }); };

  const exportCSV = () => {
    const headers = ["Line,Description,Unit,Qty,Supplier,SKU,CostPerUnit,SuggestedUnitPrice,SuggestedLineTotal"];
    const rows = state.tenderItems.map(it => {
      const opt = it.supplierOptions?.find(o => o.sourceId === it.chosenSourceId);
      return [it.lineNo ?? "", JSON.stringify(it.description ?? "").replace(/"/g, '""'), it.unit ?? "", number(it.qty), opt?.supplierName ?? "", opt?.sku ?? "", number(it.costPerUnit), number((it as any).suggestedUnitPrice), number((it as any).suggestedLineTotal),].join(",");
    });
    const csv = [headers[0], ...rows].join("\n"); const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "tender_pricing.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const upsertItems = (supplier: string, items: CatalogItem[]) => {
    const catalogs: StoredCatalogs = { ...(state as any).catalogsBySupplier };
    catalogs[supplier] = (items || []).map((it:any) => ({ id: it.id || storageUid(), supplierName: supplier, sku: it.sku, productName: it.productName, unit: it.unit, price: Number(it.price||0), currency: it.currency || "ZAR" }));
    saveCatalogs(catalogs); setState(prev => ({ ...prev, catalogsBySupplier: catalogs as any, supplierRows: syncSupplierRowsFromCatalogs(catalogs) }));
  };
  const deleteItem = (supplier: string, id: string) => {
    const catalogs: StoredCatalogs = { ...(state as any).catalogsBySupplier }; catalogs[supplier] = (catalogs[supplier] || []).filter(it => it.id !== id);
    saveCatalogs(catalogs); setState(prev => ({ ...prev, catalogsBySupplier: catalogs as any, supplierRows: syncSupplierRowsFromCatalogs(catalogs) }));
  };
  const renameSupplier = (oldName: string, newName: string) => {
    if (oldName === newName) return;
    const catalogs: StoredCatalogs = { ...(state as any).catalogsBySupplier };
    const moved = (catalogs[oldName] || []).map(it => ({ ...it, supplierName: newName })); delete catalogs[oldName];
    catalogs[newName] = [ ...(catalogs[newName] || []), ...moved ];
    saveCatalogs(catalogs); setState(prev => ({ ...prev, catalogsBySupplier: catalogs as any, supplierRows: syncSupplierRowsFromCatalogs(catalogs) }));
  };
  const mergeUpload = async (supplier: string, file: File) => {
    const rows = await parseFile(file);
    const toAdd = rows.map((r:any)=>({ id: storageUid(), supplierName: supplier, sku: (r.sku||r.SKU||r.code||"").toString().trim(), productName: (r.product||r.Product||r.name||r.Name||r.description||r.Description||r.item||r.Item||"").toString().trim(), unit: (r.unit||r.Unit||r.uom||r.UOM||"").toString().trim(), price: Number((r.price??r.Price??r.cost??r.Cost??r.new??r.New??r.current??r.Current)||0), currency: (r.currency||r.Currency||"ZAR").toString().trim(),})).filter(x => (x.productName||x.sku) && x.price>0);
    const catalogs: StoredCatalogs = { ...(state as any).catalogsBySupplier }; catalogs[supplier] = [ ...(catalogs[supplier] || []), ...toAdd ];
    saveCatalogs(catalogs); setState(prev => ({ ...prev, catalogsBySupplier: catalogs as any, supplierRows: syncSupplierRowsFromCatalogs(catalogs) }));
  };

  /* ---------- save/load tender ---------- */
  const handleSaveTender = () => {
    const name = (tenderName || "").trim();
    if (!name) return toast({ title: "Name required", description: "Give this tender a name before saving.", variant: "destructive" });
    const now = new Date().toISOString(); const existing = tenderId ? getTender(tenderId) : undefined;
    const payload: StoredTender = {
      id: tenderId || storageUid(), name, createdAt: existing?.createdAt || now, updatedAt: now,
      pricingMode: state.pricingMode as any, targetMarginPct: Number(state.targetMarginPct || 0), targetProfitAbsolute: Number(state.targetProfitAbsolute || 0),
      items: state.tenderItems.map(it => ({ lineNo: it.lineNo as any, description: it.description, unit: it.unit, qty: Number(it.qty||0), chosenSourceId: it.chosenSourceId, costPerUnit: it.costPerUnit })),
    };
    storageSaveTender(payload); setTenderId(payload.id); refreshTenderList(); toast({ title: "Tender saved", description: `Saved as “${name}”.` });
  };
  const handleLoadTender = (id: string) => {
    const data = id ? getTender(id) : undefined;
    if (!data) return;
    setTenderId(data.id); setTenderName(data.name || "");
    setState(s => ({ ...s, tenderItems: (data.items||[]) as any, pricingMode: (data.pricingMode || "margin") as any, targetMarginPct: Number(data.targetMarginPct || 0), targetProfitAbsolute: Number(data.targetProfitAbsolute || 0) }));
    toast({ title: "Tender loaded", description: `Loaded “${data.name}”.` });
  };
  const handleDeleteTender = (id: string) => { if (!id) return; storageDeleteTender(id); if (tenderId===id){ setTenderId(""); setTenderName(""); } refreshTenderList(); toast({ title: "Tender deleted" }); };

  useEffect(() => { setState(s => recalc(s)); /* eslint-disable-next-line */ }, [state.targetMarginPct, state.targetProfitAbsolute, state.pricingMode]);

  /* ============================== UI ============================== */
  return (
    <div className="p-6 space-y-5">
      {/* Header + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Tender Management</h2>
          <p className="text-sm text-muted-foreground">Upload supplier lists & BOQs, then generate suggested pricing.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view==="tender" ? "default" : "outline"} onClick={()=>setView("tender")}>Tender</Button>
          <Button variant={view==="suppliers" ? "default" : "outline"} onClick={()=>setView("suppliers")}>Supplier Manager</Button>
          <Button variant={view==="all" ? "default" : "outline"} onClick={()=>setView("all")}>All Products</Button>
        </div>
      </div>

      {/* Compact top toolbar */}
      {view === "tender" && (
        <Card className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex-1 min-w-0">
              <Label className="mb-1 block">Tender name</Label>
              <Input placeholder="e.g. Westville tender" value={tenderName} onChange={(e)=>setTenderName(e.target.value)} />
              {tenderId && <div className="mt-1 text-xs text-muted-foreground truncate">ID: {tenderId}</div>}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSaveTender}><Save className="w-4 h-4 mr-2" /> Save</Button>
              <Button variant="outline" onClick={()=>{ setTenderId(""); setTenderName(""); setState(s=>({...s, tenderItems:[]})); }}>
                <X className="w-4 h-4 mr-2" /> Clear lines
              </Button>
              <Button variant="secondary" onClick={exportCSV}><Download className="w-4 h-4 mr-2" /> Export</Button>

              <div className="flex items-end gap-2">
                <select className="border rounded px-3 py-2 bg-background" onChange={(e)=>handleLoadTender(e.target.value)} value="">
                  <option value="">Load saved tender</option>
                  {tenders.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <Button variant="destructive" onClick={()=>{
                  const id = prompt("Delete which tender ID?");
                  if (id) handleDeleteTender(id);
                }}>
                  Delete
                </Button>
                <Button variant="outline" onClick={refreshTenderList} title="Refresh list">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {view === "tender" && (
        <>
          {/* Upload row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Supplier List</h3>
                {/* <DropdownMenu> ... more actions if needed ... </DropdownMenu> */}
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <Input ref={supplierInputRef} type="file" accept=".csv,.xlsx,.xls"
                    onChange={(e)=>{ const f=e.target.files?.[0]; if(f) handleSupplierUpload(f); if (supplierInputRef.current) supplierInputRef.current.value=""; }}
                  />
                </div>
                <Input placeholder="Supplier name (optional)" value={supplierNameHint} onChange={(e)=>setSupplierNameHint(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">
                Columns are flexible. If <code>supplier</code> is missing, I’ll use the typed name, the file name, or “Unknown Supplier”.
              </p>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Tender BOQ</h3>
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </div>
              <Input ref={tenderInputRef} type="file" accept=".csv,.xlsx,.xls"
                onChange={(e)=>{ const f=e.target.files?.[0]; if(f) handleTenderUpload(f); if (tenderInputRef.current) tenderInputRef.current.value=""; }}
              />
              <p className="text-xs text-muted-foreground">
                Expected columns: <code>description</code>, <code>qty</code>, <code>unit</code>. Optional: <code>lineNo</code>.
              </p>
            </Card>
          </div>

          {/* Pricing toolbar */}
          <Card className="p-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Mode</Label>
                <select className="border rounded px-2 py-1 bg-background" value={state.pricingMode}
                  onChange={(e)=>setState(s=>({...s, pricingMode:e.target.value as any}))}>
                  <option value="margin">By Margin %</option>
                  <option value="targetProfit">By Target Profit (ZAR)</option>
                </select>
              </div>

              {state.pricingMode === "margin" ? (
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Target %</Label>
                  <Input type="number" className="w-24" value={state.targetMarginPct}
                    onChange={(e)=>setState(s=>({...s, targetMarginPct:number(e.target.value,0)}))} />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Target Profit</Label>
                  <Input type="number" className="w-36" value={state.targetProfitAbsolute}
                    onChange={(e)=>setState(s=>({...s, targetProfitAbsolute:number(e.target.value,0)}))} />
                </div>
              )}

              <div className="ml-auto flex gap-2">
                <Button onClick={handleReprice}><Calculator className="w-4 h-4 mr-2" /> Recalculate</Button>
                <Button variant="outline" onClick={rebuildMatches}>Re‑match suppliers</Button>
                <Button variant="secondary" onClick={exportCSV} title="Export suggested pricing"><Download className="w-4 h-4" /></Button>
              </div>
            </div>
          </Card>

          {/* Supplier items */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between p-3">
              <h3 className="font-medium">Supplier Items</h3>
              <Button variant="secondary" onClick={clearAll} disabled={!state.supplierRows.length}>
                <Trash2 className="w-4 h-4 mr-1" /> Clear All
              </Button>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-xs md:text-sm">
                <thead className="sticky top-0 bg-background border-b">
                  <tr>
                    <th className="text-left p-2">Supplier</th>
                    <th className="text-left p-2">SKU</th>
                    <th className="text-left p-2">Product</th>
                    <th className="text-left p-2">Unit</th>
                    <th className="text-right p-2">Price</th>
                    <th className="text-left p-2">Currency</th>
                    <th className="text-right p-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="[&>tr:nth-child(even)]:bg-muted/30">
                  {(state.supplierRows as any[]).map((row: EditableSupplierRow) => (
                    <tr key={row.__id} className="border-b last:border-0">
                      <td className="p-2">{row.supplierName}</td>
                      <td className="p-2">{row.sku || ""}</td>
                      <td className="p-2">{row.productName}</td>
                      <td className="p-2">{row.unit || ""}</td>
                      <td className="p-2 text-right">{Number(row.price || 0).toFixed(2)}</td>
                      <td className="p-2">{row.currency || "ZAR"}</td>
                      <td className="p-2 text-right">
                        <Button variant="destructive" size="sm" onClick={() => deleteRow(row.__id)}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!state.supplierRows.length && (
                <div className="p-6 text-center text-muted-foreground">Upload a supplier file to see items here.</div>
              )}
            </div>
          </Card>

          {/* Tender lines */}
          <Card className="overflow-hidden">
            <h3 className="font-medium p-3">Tender Lines</h3>
            <div className="overflow-auto">
              <table className="min-w-full text-xs md:text-sm">
                <thead className="sticky top-0 bg-background border-b">
                  <tr>
                    <th className="text-left p-2">Line</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-left p-2">Unit</th>
                    <th className="text-right p-2">Qty</th>
                    <th className="text-left p-2">Supplier Quote</th>
                    <th className="text-left p-2">Matches</th>
                    <th className="text-right p-2">Cost / Unit</th>
                    <th className="text-right p-2">Suggested Unit</th>
                    <th className="text-right p-2">Suggested Total</th>
                  </tr>
                </thead>
                <tbody className="[&>tr:nth-child(even)]:bg-muted/30">
                  {state.tenderItems.map((it, idx) => (
                    <tr key={idx} className="border-b last:border-0 align-middle">
                      <td className="p-2">{it.lineNo ?? idx + 1}</td>
                      <td className="p-2 max-w-[420px] truncate">{it.description}</td>
                      <td className="p-2">{it.unit ?? ""}</td>
                      <td className="p-2 text-right">{it.qty}</td>
                      <td className="p-2">
                        <select className="w-full border rounded px-2 py-1 bg-background"
                          value={it.chosenSourceId ?? ""}
                          onChange={(e) => {
                            const chosenSourceId = e.target.value || undefined;
                            const opt = it.supplierOptions?.find(o => o.sourceId === chosenSourceId);
                            setState(prev => {
                              const draft = { ...prev, tenderItems: [...prev.tenderItems] } as any;
                              const row = { ...draft.tenderItems[idx] } as TenderItem;
                              row.chosenSourceId = chosenSourceId; if (opt) row.costPerUnit = opt.price;
                              draft.tenderItems[idx] = row; return recalc(draft) as any;
                            });
                          }}>
                          <option value="">— No supplier —</option>
                          {(it.supplierOptions ?? []).slice().sort((a,b)=>a.price-b.price).map(o => (
                            <option key={o.sourceId} value={o.sourceId}>
                              {o.supplierName} {o.sku ? `• ${o.sku}` : ""} • {o.unit || ""} • {o.price.toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        {it.supplierOptions?.length
                          ? `${it.supplierOptions.length} · cheapest: ${(it.supplierOptions.slice().sort((a,b)=>a.price-b.price)[0].price).toFixed(2)}`
                          : <span className="text-muted-foreground">none</span>}
                      </td>
                      <td className="p-2 text-right">
                        <Input inputMode="decimal" type="number" className="w-28 text-right"
                          value={it.costPerUnit ?? 0}
                          onChange={(e) => {
                            const cpu = number(e.target.value, 0);
                            setState(prev => {
                              const draft = { ...prev, tenderItems: [...prev.tenderItems] } as any;
                              draft.tenderItems[idx] = { ...draft.tenderItems[idx], costPerUnit: cpu }; return recalc(draft) as any;
                            });
                          }}
                        />
                      </td>
                      <td className="p-2 text-right">{((it as any).suggestedUnitPrice ?? 0).toFixed(2)}</td>
                      <td className="p-2 text-right">{((it as any).suggestedLineTotal ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!state.tenderItems.length && (
                <div className="p-6 text-center text-muted-foreground">Upload a tender BOQ to get started.</div>
              )}
            </div>
          </Card>

          {/* Totals row */}
          <Card className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Total Cost" value={`ZAR ${totals.cost.toLocaleString()}`} />
              <Stat label="Total Price" value={`ZAR ${totals.price.toLocaleString()}`} />
              <Stat label="Profit" value={`ZAR ${totals.profit.toLocaleString()}`} />
              <Stat label="Margin %" value={`${totals.marginPct}%`} />
            </div>
          </Card>
        </>
      )}

      {view === "suppliers" && (
        <SupplierManagerPanel
          catalogsBySupplier={(state as any).catalogsBySupplier || {}}
          onUpsertItems={upsertItems}
          onDeleteItem={deleteItem}
          onRenameSupplier={renameSupplier}
          onMergeUpload={mergeUpload}
        />
      )}

      {view === "all" && (
        <AllCatalogsView catalogsBySupplier={(state as any).catalogsBySupplier || {}} />
      )}
    </div>
  );
};

/* small presentational helper */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-base font-semibold mt-1">{value}</div>
    </div>
  );
}

export default TenderManagementTab;
