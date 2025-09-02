import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Upload, Search, Sparkles, Table as TableIcon, LayoutList, Pencil, Trash2, Check, X } from "lucide-react";

/* =============================== Types =============================== */
type SupplierRow = {
  id?: number;
  supplierName: string;
  productName: string;
  sku?: string | null;
  unit?: string | null;
  price: string | number; // server returns numeric/decimal; we handle both
  createdAt?: string;
};

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

const canon = (s: any) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[×x]/g, " ")
    .replace(/[*\-_/(),.:;[\]{}]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

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

/** XLS/XLSX via xlsx (robust header detect) */
async function parseXLSX(file: File): Promise<Record<string, any>[]> {
  const XLSXmod = await import("xlsx");
  const XLSX: any = (XLSXmod as any).default ?? XLSXmod;
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { cellDates: true });

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

  let headerRow = 0, bestScore = -1;
  const scanLimit = Math.min(80, aoa.length);
  for (let i = 0; i < scanLimit; i++) {
    const labels = (aoa[i] || [])
      .map((x: any) => String(x ?? "").trim())
      .filter(Boolean);
    const score = labels.filter((s) => !/^\d+(\.\d+)?$/.test(s)).length;
    if (score > bestScore) { bestScore = score; headerRow = i; }
  }

  const rawHeaders = (aoa[headerRow] || []).map((h: any) => String(h ?? "").trim());
  const headers: string[] = [];
  const seen: Record<string, number> = {};
  for (const h of rawHeaders) {
    const key = (h || "col").toLowerCase().replace(/\s+/g, " ").replace(/[^\w\s]/g, "").trim() || "col";
    const count = (seen[key] = (seen[key] || 0) + 1);
    headers.push(count === 1 ? key : `${key}_${count}`);
  }

  const body = aoa.slice(headerRow + 1).filter(r => (r || []).some(c => String(c).trim() !== ""));
  return body.map(row => {
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => (obj[h] = row[i]));
    return obj;
  });
}

/** Fuzzy normaliser -> SupplierRow-like objects */
function coerceSupplierRows(rows: Record<string, any>[]) {
  const canonKey = (s: any) =>
    String(s ?? "")
      .toLowerCase()
      .replace(/[×x]/g, " ")
      .replace(/[*\-_/(),.:;[\]{}]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const isNonEmpty = (v: any) => v != null && String(v).trim() !== "";

  const pick = (obj: Record<string, any>, patterns: RegExp[]) => {
    const entries = Object.entries(obj);
    for (const [k, v] of entries) {
      if (!isNonEmpty(v)) continue;
      const ck = canonKey(k);
      if (patterns.some((re) => re.test(ck))) return v;
    }
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
  const priceKeys    = [/^price$/, /^new(?: price)?$/, /^current(?: price)?$/, /^cost$/, /^amount$/, /^sell(?:ing)? price$/,
                        /^list price$/, /^unit price$/, /^std(?:andard)? price$/, /^price zar$/, /^price rand$/, /^zar$/, /^rand$/];

  return rows
    .map((r) => {
      const supplierName = String(pick(r, supplierKeys) ?? "").trim();
      const sku          = String(pick(r, skuKeys) ?? "").trim();
      const productName  = String(pick(r, nameKeys) ?? "").trim();
      const unit         = String(pick(r, unitKeys) ?? "").trim();
      const priceRaw     = pick(r, priceKeys);
      const price        = money(priceRaw);
      return { supplierName, sku, productName, unit, price };
    })
    .filter((x) => (x.sku || x.productName) && Number.isFinite(x.price) && x.price! > 0);
}

/** Parse all files */
async function parseAllSupplierFiles(files: File[]) {
  const out: any[] = [];
  for (const f of files) {
    const isCSV = /\.csv$/i.test(f.name);
    const isXLS = /\.(xlsx|xls)$/i.test(f.name);
    const rows = isCSV ? await parseCSV(f) : isXLS ? await parseXLSX(f) : [];

    const fileBase = f.name.replace(/\.[^.]+$/, "").trim();

    const normalised = coerceSupplierRows(rows).map(r => ({
      ...r,
      supplierName: (r.supplierName && String(r.supplierName).trim())
        ? String(r.supplierName).trim()
        : fileBase,
    }));

    out.push(...normalised);
  }
  return out;
}

/* =============================== component =============================== */
type ViewMode = "table" | "cards";
type ImportMode = "all" | "cheapestOnly";

export default function SuppliersTab() {
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [importMode, setImportMode] = useState<ImportMode>("all");
  const [onlyCheapest, setOnlyCheapest] = useState<boolean>(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<SupplierRow>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // boot: fetch from API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/suppliers", { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`Failed to load suppliers (${res.status})`);
        const data = await res.json();
        if (!cancelled) setRows(data || []);
      } catch (err) {
        console.error("Failed to fetch suppliers:", err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // suppliers list for filter
  const supplierOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => { if (r.supplierName) set.add(r.supplierName); });
    return ["all", ...Array.from(set).sort()];
  }, [rows]);

  // numeric price + key
  const rowsNormalized = useMemo(() => {
    return rows.map(r => {
      const priceNum = typeof r.price === "number" ? r.price : money(r.price);
      const key = r.sku && String(r.sku).trim()
        ? `sku:${String(r.sku).trim()}`
        : `name:${canon(r.productName)}`;
      return { ...r, priceNum, _key: key };
    }).filter(r => Number.isFinite(r.priceNum));
  }, [rows]);

  // compute cheapest per key
  const cheapestByKey = useMemo(() => {
    const m = new Map<string, SupplierRow & { priceNum: number; _key: string }>();
    for (const r of rowsNormalized) {
      const best = m.get(r._key);
      if (!best || r.priceNum < best.priceNum) m.set(r._key, r);
    }
    return m;
  }, [rowsNormalized]);

  // filtered rows
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    let list = rowsNormalized;
    if (supplierFilter !== "all") list = list.filter(r => r.supplierName === supplierFilter);
    if (q) {
      list = list.filter(r => {
        const hay = [r.productName, r.sku, r.supplierName, r.unit].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    if (onlyCheapest) {
      list = list.filter(r => {
        const best = cheapestByKey.get(r._key);
        return best && best.id === r.id && best.supplierName === r.supplierName && best.priceNum === r.priceNum;
      });
    }
    return list;
  }, [rowsNormalized, supplierFilter, searchText, onlyCheapest, cheapestByKey]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (pageClamped - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageClamped, pageSize]);

  /* ----------------------------- Import logic ---------------------------- */
  const handleImport = async (files: FileList | null) => {
    if (!files || !files.length) return;
    try {
      const parsed = await parseAllSupplierFiles(Array.from(files));

      // Optionally collapse to cheapest before sending to server (importMode)
      let toSend = parsed as Array<{ supplierName: string; productName: string; sku?: string; unit?: string; price: number }>;
      if (importMode === "cheapestOnly") {
        const bestByKey = new Map<string, any>();
        for (const r of parsed) {
          const key = r.sku ? `sku:${r.sku}` : `name:${canon(r.productName)}`;
          const best = bestByKey.get(key);
          if (!best || r.price < best.price) bestByKey.set(key, r);
        }
        toSend = Array.from(bestByKey.values());
      }

      // Clean to match server InsertSupplier schema
      const suppliers = toSend.map(r => ({
        supplierName: String(r.supplierName || "").trim(),
        sku: r.sku ? String(r.sku).trim() : undefined,
        productName: String(r.productName || "").trim(),
        unit: r.unit ? String(r.unit).trim() : undefined,
        price: Number.isFinite(r.price) ? String(r.price) : undefined,
      })).filter(x =>
        x.productName &&
        typeof x.price === "string" &&
        x.price.trim() !== "" &&
        !Number.isNaN(Number(x.price)) &&
        Number(x.price) > 0
      );

      if (!suppliers.length) throw new Error("No valid rows to import after cleaning.");

      const res = await fetch("/api/suppliers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(suppliers),
      });

      if (!res.ok) {
        let msg = `Import failed (${res.status})`;
        try {
          const err = await res.json();
          if (err?.message) msg = err.message;
          if (Array.isArray(err?.errors) && err.errors.length) {
            msg += "\n• " + err.errors.map((i: any) => {
              const path = Array.isArray(i.path) ? `[${i.path.join(".")}] ` : "";
              return `${path}${i.message || JSON.stringify(i)}`;
            }).join("\n• ");
          }
        } catch {}
        throw new Error(msg);
      }

      const inserted = await res.json();
      // merge new rows on top
      setRows(prev => [...inserted, ...prev]);

      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e: any) {
      console.error("Import error:", e);
      alert(`Error importing supplier data:\n${e.message || e}`);
    }
  };

  /* ----------------------------- Edit/Delete ----------------------------- */
  const startEdit = (row: SupplierRow) => {
    if (!row.id) return;
    setEditingId(row.id);
    setDraft({
      supplierName: row.supplierName,
      productName: row.productName,
      sku: row.sku ?? "",
      unit: row.unit ?? "",
      price: typeof row.price === "number" ? row.price.toString() : String(row.price ?? ""),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
  };

  const saveEdit = async (id: number) => {
    try {
      setBusyId(id);
      // normalize outgoing
      const body: any = {
        supplierName: (draft.supplierName ?? "").toString().trim(),
        productName: (draft.productName ?? "").toString().trim(),
        sku: (draft.sku ?? "") || null,
        unit: (draft.unit ?? "") || null,
        price: (() => {
          const n = money(draft.price);
          if (!Number.isFinite(n) || n <= 0) throw new Error("Price must be a positive number.");
          return String(n);
        })(),
      };

      const res = await fetch(`/api/suppliers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let msg = `Failed to update (HTTP ${res.status}).`;
        try {
          const err = await res.json();
          if (err?.message) msg = err.message;
        } catch {}
        throw new Error(msg + "\nIf this endpoint doesn't exist yet, add PUT /api/suppliers/:id.");
      }

      const updated = await res.json();
      setRows(prev => prev.map(r => (r.id === id ? { ...r, ...updated } : r)));
      cancelEdit();
    } catch (e: any) {
      alert(e.message || "Update failed.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteRow = async (row: SupplierRow) => {
    if (!row.id) return;
    if (!confirm(`Delete "${row.productName}" from ${row.supplierName}?`)) return;
    try {
      setBusyId(row.id);
      const res = await fetch(`/api/suppliers/${row.id}`, { method: "DELETE", headers: { Accept: "application/json" } });
      if (!res.ok) {
        let msg = `Failed to delete (HTTP ${res.status}).`;
        try {
          const err = await res.json();
          if (err?.message) msg = err.message;
        } catch {}
        throw new Error(msg + "\nIf this endpoint doesn't exist yet, add DELETE /api/suppliers/:id.");
      }
      setRows(prev => prev.filter(r => r.id !== row.id));
      if (editingId === row.id) cancelEdit();
    } catch (e: any) {
      alert(e.message || "Delete failed.");
    } finally {
      setBusyId(null);
    }
  };

  /* --------------------------------- UI ---------------------------------- */
  return (
    <div className="slide-in">
      {/* HEADER */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Supplier Repository</h2>
            <p className="text-muted-foreground">Upload supplier lists, edit items, delete rows, and compare prices.</p>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Import mode</Label>
            <Select value={importMode} onValueChange={(v) => setImportMode(v as ImportMode)}>
              <SelectTrigger className="h-9 w-[220px]">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Keep every row</SelectItem>
                <SelectItem value="cheapestOnly">Keep only cheapest per product</SelectItem>
              </SelectContent>
            </Select>

            <label className="cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                multiple
                className="hidden"
                onChange={(e) => handleImport(e.target.files)}
              />
              <span className="inline-flex h-9 items-center px-3 border rounded-md">
                <Upload className="w-4 h-4 mr-2" />
                Import Lists
              </span>
            </label>

            <Button variant="outline" className="h-9" onClick={() => setViewMode(v => v === "table" ? "cards" : "table")}>
              {viewMode === "table" ? (<><LayoutList className="w-4 h-4 mr-2" /> Cards</>) : (<><TableIcon className="w-4 h-4 mr-2" /> Table</>)}
            </Button>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="px-6 pt-4">
        <div className="max-w-7xl mx-auto">
          <Card className="pricing-form-section">
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
              <CardDescription>Filter by supplier, search products, or show only the cheapest entries.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-12">
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

              <div className="md:col-span-4 flex items-end gap-2">
                <div className="w-full">
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
              </div>

              <div className="md:col-span-4 flex items-center justify-start md:justify-end gap-3">
                <div className="flex items-center space-x-2">
                  <Switch id="only-cheapest" checked={onlyCheapest} onCheckedChange={setOnlyCheapest} />
                  <Label htmlFor="only-cheapest" className="cursor-pointer">Show only cheapest per product</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === "table" && (
        <div className="px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-left">
                    <th className="px-3 py-2 w-[56px]">#</th>
                    <th className="px-3 py-2 min-w-[240px]">Product</th>
                    <th className="px-3 py-2 w-[160px]">Supplier</th>
                    <th className="px-3 py-2 w-[140px]">SKU</th>
                    <th className="px-3 py-2 w-[110px]">Unit</th>
                    <th className="px-3 py-2 w-[140px]">Price (R)</th>
                    <th className="px-3 py-2 w-[120px]">Cheapest</th>
                    <th className="px-3 py-2 w-[190px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r, i) => {
                    const isEditing = editingId === r.id;
                    const best = cheapestByKey.get((r as any)._key);
                    const isBest =
                      best && best.id === r.id && best.supplierName === r.supplierName && (best as any).priceNum === (r as any).priceNum;
                    return (
                      <tr key={`${r.id}-${i}`} className="border-t hover:bg-muted/40">
                        <td className="px-3 py-2">{(pageClamped - 1) * pageSize + i + 1}</td>

                        <td className="px-3 py-2">
                          {isEditing ? (
                            <Input
                              className="h-8"
                              value={draft.productName ?? ""}
                              onChange={(e) => setDraft(d => ({ ...d, productName: e.target.value }))}
                            />
                          ) : (
                            r.productName
                          )}
                        </td>

                        <td className="px-3 py-2">
                          {isEditing ? (
                            <Input
                              className="h-8"
                              value={draft.supplierName ?? ""}
                              onChange={(e) => setDraft(d => ({ ...d, supplierName: e.target.value }))}
                            />
                          ) : (
                            <span className="text-muted-foreground">{r.supplierName}</span>
                          )}
                        </td>

                        <td className="px-3 py-2">
                          {isEditing ? (
                            <Input
                              className="h-8"
                              value={draft.sku ?? ""}
                              onChange={(e) => setDraft(d => ({ ...d, sku: e.target.value }))}
                            />
                          ) : (
                            <span className="text-muted-foreground">{r.sku || ""}</span>
                          )}
                        </td>

                        <td className="px-3 py-2">
                          {isEditing ? (
                            <Input
                              className="h-8"
                              value={draft.unit ?? ""}
                              onChange={(e) => setDraft(d => ({ ...d, unit: e.target.value }))}
                            />
                          ) : (
                            <span className="text-muted-foreground">{r.unit || ""}</span>
                          )}
                        </td>

                        <td className="px-3 py-2">
                          {isEditing ? (
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                              <Input
                                className="h-8 pl-6"
                                value={draft.price ?? (typeof r.price === "number" ? r.price.toString() : String(r.price))}
                                onChange={(e) => setDraft(d => ({ ...d, price: e.target.value }))}
                              />
                            </div>
                          ) : (
                            <>R{(typeof r.price === "number" ? r.price : money(r.price)).toFixed(2)}</>
                          )}
                        </td>

                        <td className="px-3 py-2">
                          {isBest ? (
                            <Badge className="gap-1" variant="secondary">
                              <Sparkles className="w-3 h-3" /> Cheapest
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="px-3 py-2">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="h-8 px-2"
                                disabled={busyId === r.id}
                                onClick={() => saveEdit(r.id!)}
                              >
                                <Check className="w-4 h-4 mr-1" /> Save
                              </Button>
                              <Button size="sm" className="h-8 px-2" variant="outline" onClick={cancelEdit}>
                                <X className="w-4 h-4 mr-1" /> Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button size="sm" className="h-8 px-2" variant="outline" onClick={() => startEdit(r)}>
                                <Pencil className="w-4 h-4 mr-1" /> Edit
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 px-2 text-destructive"
                                variant="ghost"
                                disabled={busyId === r.id}
                                onClick={() => deleteRow(r)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                        No rows match your filters.
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

      {/* CARDS VIEW */}
      {viewMode === "cards" && (
        <div className="p-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((r, i) => {
              const best = cheapestByKey.get((r as any)._key);
              const isBest = best && best.id === r.id && best.supplierName === r.supplierName && (best as any).priceNum === (r as any).priceNum;
              const isEditing = editingId === r.id;
              return (
                <Card key={`${r.id}-${i}`} className="pricing-form-section">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {isEditing ? (
                        <Input
                          className="h-8"
                          value={draft.productName ?? r.productName}
                          onChange={(e) => setDraft(d => ({ ...d, productName: e.target.value }))}
                        />
                      ) : (
                        r.productName
                      )}
                      {isBest && (
                        <Badge className="gap-1" variant="secondary">
                          <Sparkles className="w-3 h-3" /> Cheapest
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {isEditing ? (
                        <Input
                          className="h-8"
                          value={draft.supplierName ?? r.supplierName}
                          onChange={(e) => setDraft(d => ({ ...d, supplierName: e.target.value }))}
                        />
                      ) : (
                        <>
                          {r.supplierName} • {r.sku || "no SKU"} • {r.unit || "unit"}
                        </>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-3">
                      <div>
                        <div className="font-medium mb-1">Price</div>
                        {isEditing ? (
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                            <Input
                              className="pl-6 h-8"
                              value={draft.price ?? (typeof r.price === "number" ? r.price.toString() : String(r.price))}
                              onChange={(e) => setDraft(d => ({ ...d, price: e.target.value }))}
                            />
                          </div>
                        ) : (
                          <div>R{(typeof r.price === "number" ? r.price : money(r.price)).toFixed(2)}</div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <Button size="sm" onClick={() => saveEdit(r.id!)} disabled={busyId === r.id}>
                              <Check className="w-4 h-4 mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              <X className="w-4 h-4 mr-1" /> Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                              <Pencil className="w-4 h-4 mr-1" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => deleteRow(r)}
                              disabled={busyId === r.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>

                      {r.createdAt && (
                        <div className="text-muted-foreground">
                          Imported: {new Date(r.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filtered.length === 0 && (
              <Card className="border-dashed border-2 border-muted-foreground/25 bg-muted/10">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <LayoutList className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No rows match your filters</h3>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
