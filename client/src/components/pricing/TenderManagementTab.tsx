// src/components/pricing/TenderManagementTab.tsx
import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import Fuse from "fuse.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, Calculator, Trash2, Save, RefreshCw, X, MoreHorizontal } from "lucide-react";
import type { PricingProduct, TenderItem, TenderPricingState, TenderSupplierOption } from "@/types/pricing";
// Assuming you have a type for the API fetched supplier data, e.g., 'SupplierRow' from SuppliersTab.tsx
import type { SupplierRow, CatalogItem, Tender } from "@/types/pricing"; // Import Tender type from shared schema
// Removed SupplierManagerPanel and AllCatalogsView imports as they are no longer rendered here


/* ------------------------------ utils ------------------------------ */
type Props = { products: PricingProduct[]; defaultMarginPct?: number; onUseMargin?: (pct: number) => void; };
type EditableSupplierRow = SupplierRow & { __id: string }; // Keep for internal use if needed, but primarily use SupplierRow
type ViewMode = "tender" | "suppliers" | "all"; // Still define, but 'suppliers' and 'all' views will be empty in this component

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
  // Removed view state for suppliers and all products as they are no longer managed here
  const [view, setView] = useState<"tender">("tender"); // Only 'tender' view is relevant here

  const [state, setState] = useState<TenderPricingState>({
    supplierRows: [], // This will be derived from allApiSuppliers, but not explicitly used in this component's UI directly
    tenderItems: [],
    pricingMode: "margin",
    targetMarginPct: defaultMarginPct,
    targetProfitAbsolute: 0,
    catalogsBySupplier: {}, // This will be derived from allApiSuppliers, but not not explicitly used in this component's UI directly
  });

  // Global API states
  const [allApiSuppliers, setAllApiSuppliers] = useState<SupplierRow[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [supplierError, setSupplierError] = useState<string | null>(null);

  const [apiTenders, setApiTenders] = useState<Tender[]>([]);
  const [isLoadingTenders, setIsLoadingTenders] = useState(false);
  const [tenderError, setTenderError] = useState<string | null>(null);

  // tender meta
  const [tenderId, setTenderId] = useState<number | null>(null); // Changed to number for API
  const [tenderName, setTenderName] = useState<string>("");
  // const [tenders, setTenders] = useState<StoredTender[]>([]); // Replaced by apiTenders

  // local inputs
  // Removed supplierNameHint as supplier upload is removed from this tab
  // Removed supplierInputRef as supplier upload is removed from this tab
  const tenderInputRef = useRef<HTMLInputElement | null>(null);

  const productsById = useMemo(() => {
    const map = new Map<number, PricingProduct>(); products.forEach(p => map.set(Number(p.id), p)); return map;
  }, [products]);

  /* ---------- Data Fetching from API ---------- */
  const fetchAllSuppliers = useCallback(async () => {
    setIsLoadingSuppliers(true);
    setSupplierError(null);
    try {
      const response = await fetch('/api/suppliers');
      if (!response.ok) throw new Error(`Failed to fetch suppliers: ${response.statusText}`);
      const data: SupplierRow[] = await response.json();
      setAllApiSuppliers(data);
    } catch (err: any) {
      setSupplierError(err.message);
      toast({ title: "Error", description: `Failed to load suppliers: ${err.message}`, variant: "destructive" });
    } finally {
      setIsLoadingSuppliers(false);
    }
  }, [toast]);

  const fetchAllTenders = useCallback(async () => {
    setIsLoadingTenders(true);
    setTenderError(null);
    try {
      const response = await fetch('/api/tenders');
      if (!response.ok) throw new Error(`Failed to fetch tenders: ${response.statusText}`);
      const data: Tender[] = await response.json();
      setApiTenders(data);
    } catch (err: any) {
      setTenderError(err.message);
      toast({ title: "Error", description: `Failed to load tenders: ${err.message}`, variant: "destructive" });
    } finally {
      setIsLoadingTenders(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllSuppliers();
    fetchAllTenders();
  }, [fetchAllSuppliers, fetchAllTenders]);


  /* ---------- Data Transformation for UI (Memoized) ---------- */
  // Transform allApiSuppliers into catalogsBySupplier format for components that expect it
  const catalogsBySupplierMemo = useMemo(() => {
    return allApiSuppliers.reduce((acc, curr) => {
      // Ensure the id is a string for CatalogItem compatibility if needed by the receiving component, though SupplierRow has number id
      const item: CatalogItem = {
        id: String(curr.id), // Convert number to string for existing CatalogItem type
        supplierName: curr.supplierName,
        sku: curr.sku || undefined, // Convert null to undefined
        productName: curr.productName,
        unit: curr.unit || undefined, // Convert null to undefined
        price: Number(curr.price), // Ensure price is a number
        currency: curr.currency || "ZAR", // Ensure currency is passed
      };
      (acc[curr.supplierName] = acc[curr.supplierName] || []).push(item);
      return acc;
    }, {} as Record<string, CatalogItem[]>);
  }, [allApiSuppliers]);

  // Derived state for supplierRows (used in the table view) - No longer directly used in this component's UI
  const supplierRowsMemo = useMemo(() => {
    return allApiSuppliers.map(it => ({
      ...it,
      __id: String(it.id), // Add __id for keying if needed by table
      price: Number(it.price) // Ensure price is number for consistent calculations
    }));
  }, [allApiSuppliers]);

  /* ---------- search index ---------- */
  const allCatalogItems: (CatalogItem & { searchName?: string })[] = useMemo(() => {
    // Now directly use allApiSuppliers, converted to CatalogItem for fuse
    return allApiSuppliers.map(it => ({
      id: String(it.id),
      supplierName: it.supplierName,
      sku: it.sku || undefined,
      productName: it.productName,
      unit: it.unit || undefined,
      price: Number(it.price),
      currency: it.currency || "ZAR",
      searchName: canon((it.productName || "")),
    }));
  }, [allApiSuppliers]);


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
      ? fuse.search(q, { limit }).map(r => ({
          supplierName: r.item.supplierName,
          sku: r.item.sku,
          unit: r.item.unit,
          price: r.item.price,
          sourceId: r.item.id, // sourceId refers to the CatalogItem's string ID
          score: r.score ?? 1
        }))
      : [];
    const codes = extractCodes(desc);
    const codeHits: TenderSupplierOption[] = codes.length
      ? allCatalogItems.filter(ci => ci.sku && codes.some(c => ci.sku!.includes(c)))
        .map(ci => ({
          supplierName: ci.supplierName,
          sku: ci.sku,
          unit: ci.unit,
          price: ci.price,
          sourceId: ci.id,
          score: 0.01
        }))
      : [];
    const tokens = q.split(" ").filter(Boolean);
    const loose: TenderSupplierOption[] = !fuzzy.length && !codeHits.length
      ? allCatalogItems.filter(ci => containsAll(ci.searchName || canon((ci as any).productName || ""), tokens.slice(0, 3)))
        .slice(0, limit).map(ci => ({
          supplierName: ci.supplierName,
          sku: ci.sku,
          unit: ci.unit,
          price: ci.price,
          sourceId: ci.id,
          score: 0.5
        }))
      : [];
    const all = [...codeHits, ...fuzzy, ...loose].sort((a,b)=>a.price-b.price);
    const seen = new Set<string>(); return all.filter(o => (seen.has(o.sourceId) ? false : (seen.add(o.sourceId), true))).slice(0, limit);
  };

  /* ---------- uploads for Tenders ---------- */
  // Removed handleSupplierUpload as supplier management is externalized
  // Removed parsing for supplier files as supplier upload is removed from this tab

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

  /* ---------- Supplier CRUD for SupplierManagerPanel (via API) ---------- */
  // These functions are no longer needed here as supplier management is externalized
  // Kept as placeholders for reference if needed elsewhere.
  const handleSaveSupplierItem = async (item: CatalogItem) => {
    // This logic should ideally reside in the dedicated SupplierManagerPanel's context
    toast({ title: "Info", description: "Supplier item saving is handled by the Supplier Manager tab.", variant: "info" });
  };

  const handleDeleteSupplierItem = async (supplierName: string, id: string) => {
    // This logic should ideally reside in the dedicated SupplierManagerPanel's context
    toast({ title: "Info", description: "Supplier item deletion is handled by the Supplier Manager tab.", variant: "info" });
  };

  const handleRenameSupplierApi = async (oldName: string, newName: string) => {
    // This logic should ideally reside in the dedicated SupplierManagerPanel's context
    toast({ title: "Info", description: "Supplier renaming is handled by the Supplier Manager tab.", variant: "info" });
  };

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


  /* ---------- save/load tender (via API) ---------- */
  const handleSaveTender = async () => {
    const name = (tenderName || "").trim();
    if (!name) return toast({ title: "Name required", description: "Give this tender a name before saving.", variant: "destructive" });

    try {
      const itemsPayload = state.tenderItems.map(it => ({
            lineNo: it.lineNo,
            description: it.description,
            unit: it.unit,
            qty: Number(it.qty || 0), // Explicitly ensure qty is a number, with fallback
            chosenSourceId: it.chosenSourceId,
            costPerUnit: Number(it.costPerUnit || 0), // Explicitly ensure costPerUnit is a number, with fallback
            // Ensure suggestedUnitPrice and suggestedLineTotal are numbers, with fallback, if your backend schema includes them
            suggestedUnitPrice: Number((it as any).suggestedUnitPrice || 0),
            suggestedLineTotal: Number((it as any).suggestedLineTotal || 0),
        }));

      const payload: Partial<Tender> = {
        name,
        pricingMode: state.pricingMode,
        targetMarginPct: Number(state.targetMarginPct || 0), // Ensure number and handle potential NaN
        targetProfitAbsolute: Number(state.targetProfitAbsolute || 0), // Ensure number and handle potential NaN
        items: JSON.stringify(itemsPayload), // STRINGIFY THE ITEMS ARRAY
      };

      const isNewTender = tenderId === null;
      const url = isNewTender ? "/api/tenders" : `/api/tenders/${tenderId}`;
      const method = isNewTender ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to ${isNewTender ? 'create' : 'update'} tender.`);
      }

      const savedTender: Tender = await res.json();
      setTenderId(savedTender.id);
      setTenderName(savedTender.name);
      toast({ title: "Tender saved", description: `Saved as “${savedTender.name}”.` });
      await fetchAllTenders(); // Refresh the list of tenders
    } catch (e: any) {
      toast({ title: "Error", description: `Failed to save tender: ${e.message}`, variant: "destructive" });
    }
  };

  const handleLoadTender = async (id: number) => {
    try {
      const res = await fetch(`/api/tenders/${id}`);
      if (!res.ok) throw new Error(`Failed to load tender (${res.statusText})`);
      const data: Tender = await res.json();

      setTenderId(data.id);
      setTenderName(data.name || "");
      setState(s => ({
        ...s,
        // PARSE THE ITEMS STRING BACK TO AN ARRAY
        tenderItems: data.items ? (JSON.parse(data.items as string) as TenderItem[]) : [],
        pricingMode: data.pricingMode || "margin",
        targetMarginPct: Number(data.targetMarginPct || 0), // Ensure it's a number
        targetProfitAbsolute: Number(data.targetProfitAbsolute || 0), // Ensure it's a number
      }));
      toast({ title: "Tender loaded", description: `Loaded “${data.name}”.` });
    } catch (e: any) {
      toast({ title: "Error", description: `Failed to load tender: ${e.message}`, variant: "destructive" });
    }
  };

  const handleDeleteTender = async (id: number) => {
    try {
      const confirmed = window.confirm("Are you sure you want to delete this tender?"); // Use native confirm temporarily
      if (!confirmed) return;

      const res = await fetch(`/api/tenders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed to delete tender (${res.statusText})`);

      if (tenderId === id) { // If the currently active tender is deleted
        setTenderId(null);
        setTenderName("");
        setState(s => ({ ...s, tenderItems: [] }));
      }
      toast({ title: "Tender deleted", description: "Tender removed successfully." });
      await fetchAllTenders(); // Refresh the list of tenders
    } catch (e: any) {
      toast({ title: "Error", description: `Failed to delete tender: ${e.message}`, variant: "destructive" });
    }
  };

  useEffect(() => { setState(s => recalc(s)); /* eslint-disable-next-line */ }, [state.targetMarginPct, state.targetProfitAbsolute, state.pricingMode]);

  /* ============================== UI ============================== */
  return (
    <div className="p-6 space-y-5">
      {/* Header + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Tender Management</h2>
          <p className="text-sm text-muted-foreground">Upload BOQs and generate suggested pricing using your supplier data.</p>
        </div>
        {/* Removed view toggle buttons, as only 'tender' view is relevant here */}
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
              <Button variant="outline" onClick={()=>{ setTenderId(null); setTenderName(""); setState(s=>({...s, tenderItems:[]})); }}>
                <X className="w-4 h-4 mr-2" /> Clear lines
              </Button>
              <Button variant="secondary" onClick={exportCSV}><Download className="w-4 h-4 mr-2" /> Export</Button>

              <div className="flex items-end gap-2">
                <select className="border rounded px-3 py-2 bg-background" onChange={(e)=>handleLoadTender(parseInt(e.target.value))} value="">
                  <option value="">Load saved tender</option>
                  {apiTenders.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <Button variant="destructive" onClick={()=>{
                  if (tenderId) handleDeleteTender(tenderId); // Delete active tender
                  else alert("No tender loaded to delete. Load a tender first, or enter its ID manually.");
                }}>
                  Delete Current
                </Button>
                <Input
                  className="w-24 text-sm"
                  placeholder="ID to delete"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const idToDelete = parseInt((e.target as HTMLInputElement).value);
                      if (!isNaN(idToDelete)) handleDeleteTender(idToDelete);
                      (e.target as HTMLInputElement).value = ''; // Clear input
                    }
                  }}
                />
                <Button variant="outline" onClick={fetchAllTenders} title="Refresh list">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {view === "tender" && (
        <>
          {/* Removed Supplier List upload card. Supplier data is now pulled from the API managed elsewhere. */}
          {/* Only Tender BOQ upload card remains */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4"> {/* Changed to 1 column */}
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

          {/* Removed Supplier items table. Supplier management is externalized. */}
          {/* The tender lines will still use suppliers pulled from the API for matching. */}

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

      {/* Removed SupplierManagerPanel and AllCatalogsView renderings */}
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
