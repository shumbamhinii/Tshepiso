import { useMemo, useRef,useEffect, useState } from "react";
import type { PricingProduct } from "@/types/pricing";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog"; // Import DialogDescription
import {
  Package, Plus, Copy, Trash2, Upload, ChevronDown,
  LayoutList, Table as TableIcon, Pencil, X, Search
} from "lucide-react";

/* =============================== helpers =============================== */
const money = (input: any) => {
  if (input == null) return NaN;
  let s = String(input).trim();
  s = s.replace(/[^\d,.\-()]/g, "");
  const neg = /^\(.*\)$/.test(s);
  if (neg) s = s.replace(/[()]/g, "");
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  if (hasDot && hasComma) s = s.replace(/,/g, "");
  else if (!hasDot && hasComma) { s = s.replace(/\./g, ""); s = s.replace(",", "."); }
  else s = s.replace(/,/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? (neg ? -n : n) : NaN;
};
const norm = (s: any) => String(s ?? "").trim();
const canon = (s: any) =>
  String(s ?? "").toLowerCase().replace(/[×x]/g, " ").replace(/[*\-_/(),.]+/g, " ").replace(/\s+/g, " ").trim();

/** CSV (Papa if present) */
async function parseCSV(file: File): Promise<Record<string, string>[]> {
  try {
    const mod = await import("papaparse");
    const Papa: any = (mod as any).default ?? mod;
    return await new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true, skipEmptyLines: true, transformHeader: (h: string) => h.trim(),
        complete: (res: any) => resolve(res.data || []), error: reject,
      });
    });
  } catch {
    const text = await file.text();
    const [head, ...rows] = text.split(/\r?\n/).filter(Boolean);
    const headers = head.split(",").map(h => h.trim());
    return rows.map(line => {
      const cols = line.split(",").map(c => c.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => (row[h] = cols[i] ?? ""));
      return row;
    });
  }
}

/** XLS/XLSX via xlsx */
/** =================== XLS/XLSX via xlsx (robust) =================== */
async function parseXLSX(file: File): Promise<Record<string, any>[]> {
  const XLSXmod = await import("xlsx");
  const XLSX: any = (XLSXmod as any).default ?? XLSXmod;
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { cellDates: true });

  // Pick densest sheet
  const sheetName = wb.SheetNames.reduce((best: string, n: string) => {
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: "" }) as any[][];
    const dense = aoa.reduce((acc, row) => acc + row.filter(Boolean).length, 0);
    const bestDense = best
      ? (XLSX.utils.sheet_to_json(wb.Sheets[best], { header: 1, defval: "" }) as any[][])
          .reduce((acc, r) => acc + r.filter(Boolean).length, 0)
      : -1;
    return dense > bestDense ? n : best;
  }, "");

  const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "" }) as any[][];
  if (!aoa.length) return [];

  // Find best header row (scan first 80)
  let headerRow = 0, bestScore = -1;
  const scanLimit = Math.min(80, aoa.length);
  for (let i = 0; i < scanLimit; i++) {
    const labels = (aoa[i] || [])
      .map((x: any) => String(x ?? "").trim())
      .filter(Boolean);
    const score = labels.filter((s) => !/^\d+(\.\d+)?$/.test(s)).length;
    if (score > bestScore) { bestScore = score; headerRow = i; }
  }

  // Canonical headers
  const rawHeaders = (aoa[headerRow] || []).map((h: any) => String(h ?? "").trim());
  const headers: string[] = [];
  const seen: Record<string, number> = {};
  for (const h of rawHeaders) {
    const key = (h || "col").toLowerCase().replace(/\s+/g, " ").replace(/[^\w\s]/g, "").trim() || "col";
    const count = (seen[key] = (seen[key] || 0) + 1);
    headers.push(count === 1 ? key : `${key}_${count}`);
  }

  const body = aoa.slice(headerRow + 1).filter(r => (r || []).some(c => String(c).trim() !== ""));
  const out = body.map(row => {
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => (obj[h] = row[i]));
    return obj;
  });

  // Helpful debug
  if (out.length) {
    console.debug("[XLSX] detected headers:", headers);
    console.debug("[XLSX] first row sample:", out[0]);
  } else {
    console.warn("[XLSX] no body rows after header detect; headers:", headers);
  }

  return out;
}

/** =================== Smarter normaliser (fuzzy) =================== */
function coerceSupplierRows(rows: Record<string, any>[]) {
  const canonKey = (s: any) =>
    String(s ?? "")
      .toLowerCase()
      .replace(/[×x]/g, " ")
      .replace(/[*\-_/(),.:;[\]{}]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const isNonEmpty = (v: any) => v != null && String(v).trim() !== "";

  const pickByPatterns = (obj: Record<string, any>, patterns: RegExp[]) => {
    const entries = Object.entries(obj);
    // strict
    for (const [k, v] of entries) {
      if (!isNonEmpty(v)) continue;
      const ck = canonKey(k);
      if (patterns.some((re) => re.test(ck))) return v;
    }
    // loose contains
    for (const [k, v] of entries) {
      if (!isNonEmpty(v)) continue;
      const ck = canonKey(k);
      if (patterns.some((re) => ck.includes(re.source.replace(/^\^|\$$/g, "")))) return v;
    }
    return undefined;
  };

  const supplierKeys = [/^supplier$/, /^supplier name$/, /^vendor$/, /^vendor name$/, /^brand$/, /^manufacturer$/];
  const skuKeys      = [/^sku$/, /^code$/, /^item code$/, /^product code$/, /^part number$/, /^model$/, /^item$/, /^stock code$/];
  const nameKeys     = [/^product$/, /^product name$/, /^description$/, /^item description$/, /^name$/, /^title$/, /^item name$/];
  const unitKeys     = [/^unit$/, /^uom$/, /^unit of measure$/, /^measure$/, /^pack(?: size)?$/, /^size$/];
  const priceKeys    = [
    /^price$/, /^new(?: price)?$/, /^current(?: price)?$/, /^cost$/, /^amount$/, /^sell(?:ing)? price$/,
    /^list price$/, /^unit price$/, /^std(?:andard)? price$/, /^price zar$/, /^price rand$/, /^zar$/, /^rand$/
  ];

  return rows
    .map((r) => {
      const supplierName = String(pickByPatterns(r, supplierKeys) ?? "").trim();
      const sku          = String(pickByPatterns(r, skuKeys) ?? "").trim();
      const productName  = String(pickByPatterns(r, nameKeys) ?? "").trim();
      const unit         = String(pickByPatterns(r, unitKeys) ?? "").trim();
      const priceRaw     = pickByPatterns(r, priceKeys);

      const price = money(priceRaw); // handles "R 1,234.56", "(12.50)", etc.

      return { supplierName, sku, productName, unit, price };
    })
    // valid row: name or SKU + positive price
    .filter((x) => (x.sku || x.productName) && Number.isFinite(x.price) && x.price! > 0);
}

/** =================== Parse all files =================== */
/** Parse ALL files and return every normalized row (no collapsing) */
async function parseAllSupplierFiles(files: File[]) {
  const out: any[] = [];
  for (const f of files) {
    const isCSV = /\.csv$/i.test(f.name);
    const isXLS = /\.(xlsx|xls)$/i.test(f.name);
    const rows = isCSV ? await parseCSV(f) : isXLS ? await parseXLSX(f) : [];

    // Fallback supplier name = file base name (e.g., "2025 Standard Pricing")
    const fileBase = f.name.replace(/\.[^.]+$/, "").trim();

    const normalised = coerceSupplierRows(rows).map(r => ({
      ...r,
      supplierName: (r.supplierName && String(r.supplierName).trim())
        ? String(r.supplierName).trim()
        : fileBase, // <— fill missing supplier from file name
    }));

    out.push(...normalised);
  }
  return out;
}

// Map DB suppliers -> UI PricingProduct
function mapSuppliersToPricingProducts(
  inRows: any[],
  globalMode: "cost-plus" | "percentage",
  globalRevenuePct: number
): PricingProduct[] {
  return (inRows || []).map((s: any) => ({
    id: s.id,                                  // from DB
    name: s.productName ?? "",                 // alias in your GET route
    costPerUnit: Number(s.price) || 0,         // store as number in UI
    expectedUnits: 0,
    calculationMethod: globalMode,
    revenuePercentage: globalMode === "percentage" ? globalRevenuePct : 0,
    category: "",
    minQuantity: 0,
    maxQuantity: undefined,
    notes: "",
    directCosts: [],
    sku: s.sku ?? undefined,
    unit: s.unit ?? undefined,
    bestSupplier: s.supplierName ?? undefined, // alias in your GET route
  }));
}


/* ============================== component =============================== */
interface ProductsTabProps {
  products: PricingProduct[];
  onProductsChange: (products: PricingProduct[]) => void;
}
type GlobalMode = "cost-plus" | "percentage";
type ImportMode = "all" | "cheapest";
type ViewMode = "table" | "cards";

export default function ProductsTab({ products, onProductsChange }: ProductsTabProps) {
  const [globalMode, setGlobalMode] = useState<GlobalMode>("cost-plus");
  const [globalMarginPct, setGlobalMarginPct] = useState<number>(20);
  const [globalRevenuePct, setGlobalRevenuePct] = useState<number>(0);
  const [importMode, setImportMode] = useState<ImportMode>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const [expandedAdvanced, setExpandedAdvanced] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<PricingProduct | null>(null);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false); // New state for add product modal

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fileInputRef = useRef<HTMLInputElement | null>(null);


  /* ----------------------------- CRUD helpers ---------------------------- */
  // The addProduct function will now be handled by the modal
  const removeProduct = (id: string) => onProductsChange(products.filter(p => String(p.id) !== String(id)));

  const updateProduct = (id: string, field: keyof PricingProduct, value: any) =>
    onProductsChange(products.map(p => (String(p.id) === String(id) ? { ...p, [field]: value } : p)));

  const duplicateProduct = (id: string) => {
    const productToDuplicate = products.find(p => String(p.id) === String(id));
    if (!productToDuplicate) return;
    const clone = { ...productToDuplicate, id: Date.now().toString(), name: `${productToDuplicate.name} (Copy)` };
    onProductsChange([clone, ...products]);
  };

  const toggleAdvanced = (id: string) =>
    setExpandedAdvanced(prev => (prev.includes(String(id)) ? prev.filter(x => x !== String(id)) : [...prev, String(id)]));

  const applyGlobalPricing = () => {
    onProductsChange(
      products.map(p => ({
        ...p,
        calculationMethod: globalMode,
        revenuePercentage: globalMode === "percentage" ? globalRevenuePct : (p.revenuePercentage || 0),
      }))
    );
  };

  /* ----------------------------- Import logic ---------------------------- */
  const handleImportSupplierLists = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const rows = await parseAllSupplierFiles(Array.from(files));
    let rowsToUse = rows;

    if (importMode === "cheapest") {
      const bestByKey = new Map<string, any>();
      for (const r of rows) {
        const key = r.sku ? `sku:${r.sku}` : `name:${canon(r.productName)}`;
        const best = bestByKey.get(key);
        if (!best || r.price < best.price) bestByKey.set(key, r);
      }
      rowsToUse = Array.from(bestByKey.values());
    }

    // FIX: Send rowsToUse directly as it matches the InsertSupplier schema
try {
  // Clean + normalise before sending (price as STRING to satisfy server schema)
 const suppliers = rowsToUse.map((r) => ({
  supplierName: String(r.supplierName || "").trim(), // now always present (file name fallback)
  sku: r.sku ? String(r.sku).trim() : undefined,
  productName: String(r.productName || "").trim(),
  unit: r.unit ? String(r.unit).trim() : undefined,
  // server schema expects string price; convert safely
  price: Number.isFinite(r.price) ? String(r.price) : undefined,
})).filter(x =>
  // NO LONGER requiring supplierName here
  x.productName &&
  typeof x.price === 'string' &&
  x.price.trim() !== '' &&
  !Number.isNaN(Number(x.price)) &&
  Number(x.price) > 0
);

if (!suppliers.length) {
  if (rowsToUse?.length) {
    console.warn("No valid rows. First parsed row keys:", Object.keys(rowsToUse[0]));
    console.warn("First parsed row sample:", rowsToUse[0]);
  }
  throw new Error('No valid rows to import after cleaning.');
}


  const response = await fetch('/api/suppliers/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(suppliers), // bare array
  });

  if (!response.ok) {
    let msg = `Failed (${response.status})`;
    try {
      const err = await response.json();
      if (err?.message) msg = err.message;
      if (Array.isArray(err?.errors) && err.errors.length) {
        msg += `\n• ` + err.errors.map((i: any) => {
          const path = Array.isArray(i.path) ? `[${i.path.join('.')}] ` : '';
          return `${path}${i.message || JSON.stringify(i)}`;
        }).join('\n• ');
      }
    } catch {}
    throw new Error(msg);
  }

  const newSuppliers = await response.json();

  // map back to your local PricingProduct shape
  const newPricingProducts: PricingProduct[] = newSuppliers.map((s: any) => ({
    id: s.id,
    name: s.productName,
    costPerUnit: Number(s.price) || 0,
    expectedUnits: 0,
    calculationMethod: globalMode,
    revenuePercentage: globalMode === "percentage" ? globalRevenuePct : 0,
    category: "",
    minQuantity: 0,
    maxQuantity: undefined,
    notes: "",
    directCosts: [],
    sku: s.sku,
    unit: s.unit,
    bestSupplier: s.supplierName,
  }));

  onProductsChange([...newPricingProducts, ...products]);
  console.log("Supplier data imported successfully!", newSuppliers);
} catch (error: any) {
  console.error("Error importing data:", error);
  alert(`Error importing supplier data:\n${error.message}`);
}



    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* -------------------------- Manual Add Product --------------------------- */
  const handleAddNewProduct = async (newProductData: Omit<PricingProduct, 'id' | 'directCosts'>) => {
    try {
      // Assuming you will create a new API endpoint for adding individual products
      // This endpoint might also return the full PricingProduct object from the database
      const response = await fetch('/api/master-products', { // Corrected endpoint for master products
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newProductData.name,
          defaultCost: newProductData.costPerUnit, // Map to defaultCost for master_products
          defaultExpectedUnits: newProductData.expectedUnits, // Map to defaultExpectedUnits
          defaultRevenuePercentage: newProductData.revenuePercentage, // Map to defaultRevenuePercentage
          // master_products table doesn't have sku, unit, bestSupplier directly in its schema
          // If you need to store these for master products, you'd extend the schema or add a related table
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add new product.');
      }

      // Instead of parsing `addedProduct` as PricingProduct,
      // we now expect `masterProduct` from the backend via `insertMasterProductSchema`
      const addedMasterProduct = await response.json(); // This will be `MasterProduct` type

      // Convert MasterProduct to PricingProduct format for local state
      const newPricingProduct: PricingProduct = {
        id: addedMasterProduct.id, // Use the ID returned from the database
        name: addedMasterProduct.name,
        costPerUnit: parseFloat(addedMasterProduct.defaultCost || 0), // Use defaultCost from MasterProduct
        expectedUnits: parseInt(addedMasterProduct.defaultExpectedUnits || 0), // Use defaultExpectedUnits
        calculationMethod: newProductData.calculationMethod, // Keep original method from modal
        revenuePercentage: parseFloat(addedMasterProduct.defaultRevenuePercentage || 0), // Use defaultRevenuePercentage
        category: newProductData.category, // Keep original category
        minQuantity: newProductData.minQuantity,
        maxQuantity: newProductData.maxQuantity,
        notes: newProductData.notes,
        directCosts: [], // Always empty for newly added master products
        sku: newProductData.sku, // Pass through SKU if provided
        unit: newProductData.unit, // Pass through unit if provided
        bestSupplier: newProductData.bestSupplier, // Pass through supplier if provided
      };


      onProductsChange([newPricingProduct, ...products]);
      setIsAddProductModalOpen(false); // Close modal on success
      alert("Product added successfully!");

    } catch (error: any) {
      console.error("Error adding product:", error.message);
      alert(`Error adding product: ${error.message}`);
    }
  };

useEffect(() => {
  let cancelled = false;

  async function loadPersisted() {
    try {
      const res = await fetch('/api/suppliers', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Failed to load suppliers (${res.status})`);
      const rows = await res.json();
      if (cancelled) return;

      // Replace current in‑memory list with what’s in the DB
      const mapped = mapSuppliersToPricingProducts(rows, globalMode, globalRevenuePct);
      onProductsChange(mapped);

      // If you prefer to merge (avoid dupes by id), use this instead:
      // const existingById = new Set(products.map(p => String(p.id)));
      // const merged = [...products, ...mapped.filter(p => !existingById.has(String(p.id)))];
      // onProductsChange(merged);
    } catch (err) {
      console.error('Failed to fetch saved suppliers:', err);
    }
  }

  loadPersisted();
  return () => { cancelled = true; };
  // run once on first mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  /* ----------------------------- Derived lists --------------------------- */
  const supplierOptions = useMemo(() => {
    const set = new Set<string>();
    (products as any[]).forEach(p => {
      if (p.bestSupplier && String(p.bestSupplier).trim()) set.add(String(p.bestSupplier));
      if (!p.bestSupplier && p.name?.includes(" — ")) {
        const maybe = p.name.split(" — ").slice(-1)[0]?.trim();
        if (maybe) set.add(maybe);
      }
    });
    return ["all", ...Array.from(set).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return products.filter((p: any) => {
      if (onlyInStock && (Number(p.expectedUnits) || 0) <= 0) return false;
      if (supplierFilter !== "all") {
        const meta = String(p.bestSupplier || "");
        const fromName = p.name && p.name.includes(" — ") ? p.name.split(" — ").slice(-1)[0]?.trim() : "";
        if (!(meta === supplierFilter || fromName === supplierFilter)) return false;
      }
      if (!q) return true;
      const hay = [
        p.name,
        p.sku,
        p.bestSupplier,
        p.category,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [products, supplierFilter, onlyInStock, searchText]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const tableRows = useMemo(() => {
    const start = (pageClamped - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageClamped, pageSize]);

  /* --------------------------------- UI ---------------------------------- */
  return (
    <div className="slide-in">
      {/* HEADER BAR */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-7 flex flex-col justify-center">
              <h2 className="text-2xl font-bold">Product Configuration</h2>
              <p className="text-muted-foreground">
                Import lists, filter fast, edit inline, and open full editor when needed.
              </p>
            </div>

            <div className="col-span-12 md:col-span-5 flex flex-wrap items-center justify-start md:justify-end gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <Label className="text-sm">Import</Label>
                <Select value={importMode} onValueChange={(v) => setImportMode(v as ImportMode)}>
                  <SelectTrigger className="w-[220px] h-9">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Keep all variants (per supplier)</SelectItem>
                    <SelectItem value="cheapest">Keep only cheapest per product</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <label className="cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  multiple
                  className="hidden"
                  onChange={(e) => handleImportSupplierLists(e.target.files)}
                />
                <span className="inline-flex h-9 items-center px-3 border rounded-md">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Supplier Lists
                </span>
              </label>

              <Button variant="outline" className="h-9" onClick={() => setViewMode(v => (v === "table" ? "cards" : "table"))}>
                {viewMode === "table" ? (<><LayoutList className="w-4 h-4 mr-2" /> Cards</>) : (<><TableIcon className="w-4 h-4 mr-2" /> Table</>)}
              </Button>

              <Button className="h-9" onClick={() => setIsAddProductModalOpen(true)}> {/* Open modal on click */}
                <Plus className="w-4 h-4 mr-2" /> Add Product
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="px-6 pt-4">
        <div className="max-w-7xl mx-auto">
          <Card className="pricing-form-section">
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
              <CardDescription>Supplier, in‑stock, and search.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-12">
              {/* Supplier */}
              <div className="md:col-span-4">
                <Label>Supplier</Label>
                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue placeholder="All suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplierOptions.map(s => (
                      <SelectItem key={s} value={s}>{s === "all" ? "All suppliers" : s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* In stock */}
              <div className="md:col-span-3 flex items-center mt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                  />
                  <span>Show only in-stock</span>
                </label>
              </div>


              {/* Search */}
              <div className="md:col-span-5">
                <Label>Search</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchText}
                    onChange={e => { setPage(1); setSearchText(e.target.value); }}
                    placeholder="Search name / SKU / supplier"
                    className="pl-8 h-9"
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Showing {filtered.length ? ((pageClamped - 1) * pageSize + 1) : 0}–{Math.min(pageClamped * pageSize, filtered.length)} of {filtered.length}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* GLOBAL PRICING */}
      <div className="px-6 pt-6">
        <div className="max-w-7xl mx-auto">
          <Card className="pricing-form-section">
            <CardHeader>
              <CardTitle className="text-lg">Global Pricing</CardTitle>
              <CardDescription>How should prices be calculated by default?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={globalMode}
                onValueChange={(v) => setGlobalMode(v as GlobalMode)}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className="flex items-start space-x-3 p-3 border rounded-lg min-h-[84px]">
                  <RadioGroupItem value="cost-plus" id="global-cost-plus" />
                  <Label htmlFor="global-cost-plus" className="cursor-pointer">
                    <div className="font-medium">Cost‑Plus Pricing</div>
                    <div className="text-sm text-muted-foreground">We’ll derive selling price from cost with your logic.</div>
                  </Label>
                </div>
                <div className="flex items-start space-x-3 p-3 border rounded-lg min-h-[84px]">
                  <RadioGroupItem value="percentage" id="global-percentage" />
                  <Label htmlFor="global-percentage" className="cursor-pointer">
                    <div className="font-medium">Revenue Percentage</div>
                    <div className="text-sm text-muted-foreground">Allocate a % of total revenue to each product.</div>
                  </Label>
                </div>
              </RadioGroup>

              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                {globalMode === "percentage" ? (
                  <div className="max-w-sm">
                    <Label>Revenue Percentage (default per product)</Label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        value={globalRevenuePct}
                        onChange={(e) => setGlobalRevenuePct(parseFloat(e.target.value) || 0)}
                        className="pr-8 h-9"
                        step="0.1"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-sm">
                    <Label>Reference Margin % (optional)</Label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        value={globalMarginPct}
                        onChange={(e) => setGlobalMarginPct(parseFloat(e.target.value) || 0)}
                        className="pr-8 h-9"
                        step="0.1"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                  </div>
                )}

                <Button variant="outline" className="h-9 sm:mb-[2px]" onClick={applyGlobalPricing}>
                  Apply to all products
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ============================ TABLE VIEW ============================ */}
      {viewMode === "table" && (
        <div className="px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-left">
                    <th className="px-3 py-2 w-[48px]">#</th>
                    <th className="px-3 py-2 min-w-[260px]">Product</th>
                    <th className="px-3 py-2 w-[160px]">Supplier</th>
                    <th className="px-3 py-2 w-[120px]">SKU</th>
                    <th className="px-3 py-2 w-[130px]">Cost (R)</th>
                    <th className="px-3 py-2 w-[110px]">On‑hand</th>
                    <th className="px-3 py-2 w-[150px]">Method</th>
                    <th className="px-3 py-2 w-[110px]">Rev %</th>
                    <th className="px-3 py-2 w-[140px]">Category</th>
                    <th className="px-3 py-2 w-[168px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((p: any, i) => (
                    <tr key={String(p.id)} className="border-t hover:bg-muted/40">
                      <td className="px-3 py-2">{(pageClamped - 1) * pageSize + i + 1}</td>
                      <td className="px-3 py-2">
                        <Input
                          className="h-9"
                          value={p.name || ""}
                          onChange={(e) => updateProduct(String(p.id), "name", e.target.value)}
                          placeholder="Name"
                        />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[160px]">
                        {p.bestSupplier || (p.name?.includes(" — ") ? p.name.split(" — ").slice(-1)[0] : "")}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
                        {p.sku || ""}
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                          <Input
                            className="pl-6 h-9"
                            type="number"
                            value={p.costPerUnit}
                            onChange={(e) => updateProduct(String(p.id), "costPerUnit", parseFloat(e.target.value) || 0)}
                            step="0.01"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="h-9"
                          type="number"
                          value={p.expectedUnits}
                          onChange={(e) => updateProduct(String(p.id), "expectedUnits", parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={p.calculationMethod || "cost-plus"}
                          onValueChange={(v) => updateProduct(String(p.id), "calculationMethod", v)}
                        >
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cost-plus">Cost‑Plus</SelectItem>
                            <SelectItem value="percentage">Revenue %</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="h-9"
                          type="number"
                          value={p.revenuePercentage || 0}
                          onChange={(e) => updateProduct(String(p.id), "revenuePercentage", parseFloat(e.target.value) || 0)}
                          step="0.1"
                          disabled={(p.calculationMethod || "cost-plus") !== "percentage"}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={p.category || ""}
                          onValueChange={(v) => updateProduct(String(p.id), "category", v)}
                        >
                          <SelectTrigger className="h-9"><SelectValue placeholder="-" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="packaging">Packaging</SelectItem>
                            <SelectItem value="stationery">Stationery</SelectItem>
                            <SelectItem value="services">Services</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditingProduct(p)}>
                            <Pencil className="w-4 h-4 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => duplicateProduct(String(p.id))}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeProduct(String(p.id))}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tableRows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">
                        No products match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <Label>Rows</Label>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(parseInt(v)); setPage(1); }}>
                  <SelectTrigger className="w-[90px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button className="h-9" variant="outline" disabled={pageClamped <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
                <div className="text-sm">Page {pageClamped} / {totalPages}</div>
                <Button className="h-9" variant="outline" disabled={pageClamped >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================ CARDS VIEW ============================ */}
      {viewMode === "cards" && (
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {filtered.map((product: any, index) => (
              <Card key={String(product.id)} className="pricing-form-section">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Product #{index + 1}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingProduct(product)}><Pencil className="w-4 h-4 mr-1" /> Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => duplicateProduct(String(product.id))}><Copy className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeProduct(String(product.id))}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <Label>Name</Label>
                      <Input value={product.name} onChange={(e) => updateProduct(String(product.id), "name", e.target.value)} />
                    </div>
                    <div>
                      <Label>Cost</Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                        <Input className="pl-6" type="number" value={product.costPerUnit} onChange={(e) => updateProduct(String(product.id), "costPerUnit", parseFloat(e.target.value) || 0)} step="0.01" />
                      </div>
                    </div>
                    <div>
                      <Label>On‑hand</Label>
                      <Input type="number" value={product.expectedUnits} onChange={(e) => updateProduct(String(product.id), "expectedUnits", parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filtered.length === 0 && (
              <Card className="border-dashed border-2 border-muted-foreground/25 bg-muted/10">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No products match your filters</h3>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ============================ EDIT DIALOG (Existing) =========================== */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-3xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="font-semibold">Edit Product</div>
              <Button variant="ghost" onClick={() => setEditingProduct(null)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-5">
              {/* Full editor (card-style) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic */}
                <div className="space-y-4">
                  <div>
                    <Label>Product Name</Label>
                    <Input value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Cost Per Unit</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                      <Input
                        className="pl-8"
                        type="number"
                        value={editingProduct.costPerUnit}
                        onChange={(e) => setEditingProduct({ ...editingProduct, costPerUnit: parseFloat(e.target.value) || 0 })}
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>On‑hand Qty</Label>
                    <Input
                      type="number"
                      value={editingProduct.expectedUnits}
                      onChange={(e) => setEditingProduct({ ...editingProduct, expectedUnits: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* Method */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Calculation Method</Label>
                    <RadioGroup
                      value={editingProduct.calculationMethod as "cost-plus" | "percentage"}
                      onValueChange={(v) => setEditingProduct({ ...editingProduct, calculationMethod: v as any })}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3 p-3 border rounded-lg">
                          <RadioGroupItem value="cost-plus" id="dlg-cost-plus" />
                          <Label htmlFor="dlg-cost-plus" className="cursor-pointer">
                            <div className="font-medium">Cost‑Plus Pricing</div>
                            <div className="text-sm text-muted-foreground">Price based on cost plus your logic/margins</div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 border rounded-lg">
                          <RadioGroupItem value="percentage" id="dlg-percentage" />
                          <Label htmlFor="dlg-percentage" className="cursor-pointer">
                            <div className="font-medium">Revenue Percentage</div>
                            <div className="text-sm text-muted-foreground">Price based on % of total revenue</div>
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  {editingProduct.calculationMethod === "percentage" && (
                    <div>
                      <Label>Revenue Percentage</Label>
                      <Input
                        type="number"
                        value={editingProduct.revenuePercentage || 0}
                        onChange={(e) => setEditingProduct({ ...editingProduct, revenuePercentage: parseFloat(e.target.value) || 0 })}
                        step="0.1"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={editingProduct.category || ""}
                        onValueChange={(v) => setEditingProduct({ ...editingProduct, category: v })}
                      >
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="packaging">Packaging</SelectItem>
                          <SelectItem value="stationery">Stationery</SelectItem>
                          <SelectItem value="services">Services</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Min Qty</Label>
                      <Input
                        type="number"
                        value={editingProduct.minQuantity || 0}
                        onChange={(e) => setEditingProduct({ ...editingProduct, minQuantity: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label>Max Qty</Label>
                      <Input
                        type="number"
                        value={editingProduct.maxQuantity ?? ""}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            maxQuantity: e.target.value === "" ? undefined : (parseInt(e.target.value) || 0),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced collapsible */}
              <div className="mt-6 pt-4 border-t">
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <ChevronDown className="w-4 h-4 mr-2" /> Advanced Options
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 text-sm text-muted-foreground">
                    If you store supplier metadata (SKU, unit, etc.) during import, it will travel with the item.
                  </CollapsibleContent>
                </Collapsible>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancel</Button>
                <Button
                  onClick={() => {
                    if (editingProduct) {
                      onProductsChange(products.map(p => (String(p.id) === String(editingProduct.id) ? editingProduct : p)));
                    }
                    setEditingProduct(null);
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================ ADD PRODUCT MODAL (New) =========================== */}
      <AddProductModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onAddProduct={handleAddNewProduct}
        globalMode={globalMode}
        globalRevenuePct={globalRevenuePct}
      />
    </div>
  );
}

// ============================ AddProductModal Component ============================
interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Omit<PricingProduct, 'id' | 'directCosts'>) => void;
  globalMode: GlobalMode;
  globalRevenuePct: number;
}

function AddProductModal({ isOpen, onClose, onAddProduct, globalMode, globalRevenuePct }: AddProductModalProps) {
  const [name, setName] = useState("");
  const [costPerUnit, setCostPerUnit] = useState(0);
  const [expectedUnits, setExpectedUnits] = useState(0);
  const [category, setCategory] = useState("");
  const [minQuantity, setMinQuantity] = useState(0);
  const [maxQuantity, setMaxQuantity] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [calculationMethod, setCalculationMethod] = useState<GlobalMode>(globalMode);
  const [revenuePercentage, setRevenuePercentage] = useState(globalRevenuePct);
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("");
  const [bestSupplier, setBestSupplier] = useState("");


  // Reset form when modal opens/closes
// Reset form when modal opens/closes
useEffect(() => {
  if (isOpen) {
    setName("");
    setCostPerUnit(0);
    setExpectedUnits(0);
    setCategory("");
    setMinQuantity(0);
    setMaxQuantity(undefined);
    setNotes("");
    setCalculationMethod(globalMode);
    setRevenuePercentage(globalRevenuePct);
    setSku("");
    setUnit("");
    setBestSupplier("");
  }
}, [isOpen, globalMode, globalRevenuePct]);


  const handleSubmit = () => {
    onAddProduct({
      name,
      costPerUnit,
      expectedUnits,
      calculationMethod,
      revenuePercentage: calculationMethod === "percentage" ? revenuePercentage : 0,
      category,
      minQuantity,
      maxQuantity,
      notes,
      sku: sku || undefined,
      unit: unit || undefined,
      bestSupplier: bestSupplier || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>Enter the details for your new product.</DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="product-name">Product Name</Label>
              <Input id="product-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cost-per-unit">Cost Per Unit</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                <Input id="cost-per-unit" type="number" value={costPerUnit} onChange={(e) => setCostPerUnit(parseFloat(e.target.value) || 0)} step="0.01" className="pl-8" />
              </div>
            </div>
            <div>
              <Label htmlFor="expected-units">On‑hand Qty</Label>
              <Input id="expected-units" type="number" value={expectedUnits} onChange={(e) => setExpectedUnits(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label htmlFor="sku">SKU (Optional)</Label>
              <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="unit">Unit (e.g., kg, pcs) (Optional)</Label>
              <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="best-supplier">Best Supplier (Optional)</Label>
              <Input id="best-supplier" value={bestSupplier} onChange={(e) => setBestSupplier(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="packaging">Packaging</SelectItem>
                  <SelectItem value="stationery">Stationery</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium block">Calculation Method</Label>
            <RadioGroup
              value={calculationMethod}
              onValueChange={(v) => setCalculationMethod(v as GlobalMode)}
            >
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <RadioGroupItem value="cost-plus" id="add-cost-plus" />
                <Label htmlFor="add-cost-plus" className="cursor-pointer">
                  <div className="font-medium">Cost‑Plus Pricing</div>
                  <div className="text-sm text-muted-foreground">Price based on cost plus your logic/margins</div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <RadioGroupItem value="percentage" id="add-percentage" />
                <Label htmlFor="add-percentage" className="cursor-pointer">
                  <div className="font-medium">Revenue Percentage</div>
                  <div className="text-sm text-muted-foreground">Price based on % of total revenue</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {calculationMethod === "percentage" && (
            <div>
              <Label htmlFor="revenue-percentage">Revenue Percentage</Label>
              <Input id="revenue-percentage" type="number" value={revenuePercentage} onChange={(e) => setRevenuePercentage(parseFloat(e.target.value) || 0)} step="0.1" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="min-quantity">Min Qty</Label>
              <Input id="min-quantity" type="number" value={minQuantity} onChange={(e) => setMinQuantity(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label htmlFor="max-quantity">Max Qty</Label>
              <Input
                id="max-quantity"
                type="number"
                value={maxQuantity ?? ""}
                onChange={(e) => setMaxQuantity(e.target.value === "" ? undefined : (parseInt(e.target.value) || 0))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="px-6 pb-6 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit}>Add Product</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
