// components/pricing/setup-tab.tsx
import React, { useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

import {
  Coins,
  Target,
  Plus,
  Trash2,
  HelpCircle,
  Calculator,
  Search,
  LayoutList,
  Table as TableIcon,
  Pencil,
  Copy,
  ChevronsUpDown,
  Check,
  Users,
  Zap,
  Leaf,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import type { PricingSetup, PricingExpense, PricingProduct } from "@/types/pricing";

/* ===========================================================
   Small utils
   =========================================================== */
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
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

/* ===========================================================
   Tshepiso Branding Solutions – Pricing Framework Constants
   =========================================================== */
const TSHEPISO_OVERHEADS = [
  { label: "Accounting Fees",       amount: 2300 },
  { label: "Bank Fees",             amount: 1000 },
  { label: "Bursaries",             amount: 6620 },
  { label: "Computer Expenses",     amount: 4000 },
  { label: "Donations",             amount: 250 },
  { label: "Electricity & Water",   amount: 1400 },
  { label: "Director Salary",       amount: 15000 },
  { label: "Staff Salary 1",        amount: 4500 },
  { label: "Staff Salary 2",        amount: 6500 },
  { label: "PAYE",                  amount: 4000 },
  { label: "UIF",                   amount: 300 },
  { label: "Insurance",             amount: 5522.80 },
  { label: "Interest Expense",      amount: 2000 },
  { label: "Meals & Entertainment", amount: 1000 },
  { label: "Tracker",               amount: 300 },
  { label: "Fuel & Vehicle Expenses", amount: 10000 },
  { label: "Office Expenses",       amount: 2000 },
  { label: "Printing & Stationery", amount: 1000 },
  { label: "Rent",                  amount: 10500 },
  { label: "Stipends",              amount: 1000 },
  { label: "Subscriptions",         amount: 1060 },
  { label: "Telephone & Internet",  amount: 2472.94 },
  { label: "Rental Debt/Interest",  amount: 9000 },
  { label: "Xero",                  amount: 984.75 },
  { label: "Domains",               amount: 3000 },
];

const CLIENT_TYPE_CONFIG = {
  corporate:  { label: "Corporate",      minGP: 35, maxGP: 50, deposit: "Negotiable",  minGPLabel: "35%" },
  government: { label: "Government/SOE", minGP: 25, maxGP: 40, deposit: "PO Required", minGPLabel: "25%" },
  retail:     { label: "Retail",         minGP: 30, maxGP: 45, deposit: "50% upfront",  minGPLabel: "30%" },
  smme:       { label: "SMME",           minGP: 45, maxGP: 65, deposit: "70% upfront",  minGPLabel: "45%" },
  reseller:   { label: "Reseller",       minGP: 15, maxGP: 30, deposit: "70% upfront",  minGPLabel: "15%" },
} as const;

const JOB_SIZE_CONFIG = {
  small:  { label: "Small Job",           pmMin: 5,  pmMax: 8  },
  medium: { label: "Medium Job",          pmMin: 8,  pmMax: 12 },
  large:  { label: "Large Complex Job",   pmMin: 12, pmMax: 18 },
  events: { label: "Events/Activations",  pmMin: 15, pmMax: 20 },
} as const;

const URGENCY_CONFIG = {
  standard:    { label: "Standard (3–5 days)",  surcharge: 0  },
  "48h":       { label: "48 Hours (+15%)",       surcharge: 15 },
  "24h":       { label: "24 Hours (+25%)",       surcharge: 25 },
  "same-day":  { label: "Same Day (+40%)",       surcharge: 40 },
} as const;

const PRODUCT_CATEGORIES = [
  { value: "corporate-clothing",      label: "Corporate Clothing",               minGP: 35, maxGP: 50,  moq: "10 units or R1,000" },
  { value: "promotional-gifts",       label: "Promotional Gifts",                minGP: 40, maxGP: 60,  moq: "R1,500 minimum" },
  { value: "large-format-inhouse",    label: "Large Format Printing (In-House)", minGP: 45, maxGP: 65,  moq: "Min print value" },
  { value: "large-format-outsourced", label: "Large Format Printing (Outsourced)", minGP: 40, maxGP: 55, moq: "Min print value" },
  { value: "signage",                 label: "Signage",                          minGP: 40, maxGP: 55,  moq: "" },
  { value: "eco-products",            label: "Eco Products",                     minGP: 50, maxGP: 80,  moq: "" },
  { value: "paper-bags",              label: "Paper Bags",                       minGP: 45, maxGP: 70,  moq: "500 units" },
  { value: "felt-bags",               label: "Felt Bags",                        minGP: 55, maxGP: 85,  moq: "20 units" },
  { value: "branding-design",         label: "Branding & Design Services",       minGP: 60, maxGP: 80,  moq: "" },
  { value: "event-branding",          label: "Event Branding",                   minGP: 45, maxGP: 65,  moq: "Min project fee" },
  { value: "laser-engraving",         label: "Laser Engraving",                  minGP: 55, maxGP: 75,  moq: "Min order value" },
  { value: "paper-printing",          label: "Paper Printing (Outsourced)",      minGP: 35, maxGP: 50,  moq: "250 units" },
  { value: "expo-stands",             label: "Expo Stands",                      minGP: 35, maxGP: 50,  moq: "Min project fee" },
  { value: "government-tender",       label: "Government Tender",                minGP: 25, maxGP: 40,  moq: "" },
  { value: "other",                   label: "Other",                            minGP: 35, maxGP: 50,  moq: "" },
];

type ClientTypeKey = keyof typeof CLIENT_TYPE_CONFIG;
type JobSizeKey    = keyof typeof JOB_SIZE_CONFIG;
type UrgencyKey    = keyof typeof URGENCY_CONFIG;

/* ===========================================================
   Supplier types (for picker)
   =========================================================== */
type SupplierRow = {
  id: number;
  supplierName: string;
  productName: string;
  sku?: string | null;
  unit?: string | null;
  price: string | number;
  createdAt?: string;
};

/* ===========================================================
   Hook: supplier names (for comboboxes)
   =========================================================== */
function useSupplierNames() {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/suppliers", { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as SupplierRow[];
        if (cancelled) return;
        const set = new Set<string>();
        (data || []).forEach((r) => { if (r?.supplierName) set.add(String(r.supplierName).trim()); });
        setNames(Array.from(set).sort());
      } catch {
        setNames([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return names;
}

/* ===========================================================
   Reusable searchable Supplier combobox
   =========================================================== */
function SupplierCombobox({
  value,
  onChange,
  options,
  placeholder = "All suppliers",
  allowAll = true,
  className,
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  allowAll?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const list = useMemo(() => (allowAll ? ["all", ...options] : options), [options, allowAll]);
  const current = value ?? (allowAll ? "all" : "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={cn("justify-between w-full h-9", className)}>
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {current === "all" ? "All suppliers" : current || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Search supplier…" />
          <CommandEmpty>No supplier found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {list.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={(v) => { onChange(v); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", current === opt ? "opacity-100" : "opacity-0")} />
                  {opt === "all" ? "All suppliers" : opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ===========================================================
   Supplier Picker Dialog (search API-backed)
   =========================================================== */
function SupplierPickerDialog({
  open,
  onOpenChange,
  onPick,
  supplierNames,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (rows: SupplierRow[]) => void;
  supplierNames: string[];
}) {
  const [q, setQ] = useState("");
  const [supplier, setSupplier] = useState<string>("all");
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 25;

  const search = async (reset = false) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (supplier !== "all") params.set("supplier", supplier);
      params.set("limit", String(limit));
      params.set("offset", String((reset ? 0 : page) * limit));
      const res = await fetch(`/api/suppliers/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRows(reset ? data : [...rows, ...data]);
        if (reset) setPage(0);
      } else {
        // fallback to /api/suppliers and filter client-side
        const all = await fetch(`/api/suppliers`).then((r) => r.json());
        const ql = q.trim().toLowerCase();
        const filtered = (all || []).filter((r: SupplierRow) => {
          if (supplier !== "all" && r.supplierName !== supplier) return false;
          if (!ql) return true;
          const hay = [r.productName, r.sku, r.supplierName, r.unit].filter(Boolean).join(" ").toLowerCase();
          return hay.includes(ql);
        });
        setRows(filtered.slice(0, limit));
        if (reset) setPage(0);
      }
    } catch (e) {
      console.error("supplier search failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) search(true); /* eslint-disable-next-line */ }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) { setQ(""); setSupplier("all"); setRows([]); setPage(0); }
      }}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Find products in supplier repository</DialogTitle>
          <DialogDescription>Search by name/SKU or filter by supplier, then add items to your list.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6">
            <Label>Search</Label>
            <div className="relative mt-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-8 h-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. bubble wrap, A4 paper, SKU123…" />
            </div>
          </div>
          <div className="md:col-span-4">
            <Label>Supplier</Label>
            <SupplierCombobox
              value={supplier}
              onChange={setSupplier}
              options={supplierNames}
              placeholder="Select supplier"
              allowAll
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <Button className="w-full h-9" onClick={() => search(true)} disabled={loading}>
              Search
            </Button>
          </div>
        </div>

        <div className="border rounded-md max-h-[50vh] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="text-left">
                <th className="px-3 py-2 w-[52px]">#</th>
                <th className="px-3 py-2 min-w-[260px]">Product</th>
                <th className="px-3 py-2 w-[160px]">Supplier</th>
                <th className="px-3 py-2 w-[140px]">SKU</th>
                <th className="px-3 py-2 w-[110px]">Unit</th>
                <th className="px-3 py-2 w-[130px]">Price (R)</th>
                <th className="px-3 py-2 w-[120px]"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.id}-${i}`} className="border-t">
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2">{r.productName}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.supplierName}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.sku || ""}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.unit || ""}</td>
                  <td className="px-3 py-2">R{(typeof r.price === "number" ? r.price : money(r.price)).toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <Button size="sm" onClick={() => { onPick([r]); onOpenChange(false); }}>
                      Add
                    </Button>
                  </td>
                </tr>
              ))}
              {!rows.length && !loading && (
                <tr><td className="px-3 py-10 text-center text-muted-foreground" colSpan={7}>No matches. Try a different search.</td></tr>
              )}
              {loading && (
                <tr><td className="px-3 py-10 text-center text-muted-foreground" colSpan={7}>Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Page {page + 1}</div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                if (page <= 0) return;
                const newPage = page - 1;
                const params = new URLSearchParams();
                if (q.trim()) params.set("q", q.trim());
                if (supplier !== "all") params.set("supplier", supplier);
                params.set("limit", String(limit));
                params.set("offset", String(newPage * limit));
                const res = await fetch(`/api/suppliers/search?${params.toString()}`);
                if (res.ok) { setRows(await res.json()); setPage(newPage); }
              }}
              disabled={page <= 0 || loading}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const newPage = page + 1;
                const params = new URLSearchParams();
                if (q.trim()) params.set("q", q.trim());
                if (supplier !== "all") params.set("supplier", supplier);
                params.set("limit", String(limit));
                params.set("offset", String(newPage * limit));
                const res = await fetch(`/api/suppliers/search?${params.toString()}`);
                if (res.ok) {
                  const data = await res.json();
                  if (Array.isArray(data) && data.length) { setRows(data); setPage(newPage); }
                }
              }}
              disabled={loading}
            >
              Next
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ===========================================================
   Custom Item Dialog
   =========================================================== */
function CustomItemDialog({
  open,
  onOpenChange,
  onCreate,
  supplierNames,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (item: {
    name: string;
    costPerUnit: number;
    expectedUnits?: number;
    sku?: string;
    unit?: string;
    bestSupplier?: string;
    category?: string;
    notes?: string;
  }) => void;
  supplierNames: string[];
}) {
  const [name, setName] = useState("");
  const [cost, setCost] = useState<number>(0);
  const [qty, setQty] = useState<number>(0);
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("");
  const [supplier, setSupplier] = useState<string>("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setName(""); setCost(0); setQty(0);
      setSku(""); setUnit(""); setSupplier("");
      setCategory(""); setNotes("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Custom Item</DialogTitle>
          <DialogDescription>Create an ad‑hoc product that isn’t in your supplier repository.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Product Name</Label>
            <Input className="h-9 mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <Label>Cost Per Unit (R)</Label>
            <div className="relative mt-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
              <Input className="pl-6 h-9" type="number" step="0.01" value={cost} onChange={(e) => setCost(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div>
            <Label>On‑hand Qty</Label>
            <Input className="h-9 mt-1" type="number" value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 0)} />
          </div>

          <div>
            <Label>SKU (optional)</Label>
            <Input className="h-9 mt-1" value={sku} onChange={(e) => setSku(e.target.value)} />
          </div>

          <div>
            <Label>Unit (optional)</Label>
            <Input className="h-9 mt-1" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <Label>Supplier (optional)</Label>
            <SupplierCombobox
              value={supplier || ""}
              onChange={(v) => setSupplier(v === "all" ? "" : v)}
              options={supplierNames}
              placeholder="Pick a supplier"
              allowAll
            />
          </div>

          <div>
            <Label>Category (optional)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="-" /></SelectTrigger>
              <SelectContent>
                {PRODUCT_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {category && (() => {
              const cat = PRODUCT_CATEGORIES.find(c => c.value === category);
              return cat ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  Target GP: {cat.minGP}%–{cat.maxGP}%{cat.moq ? ` · MOQ: ${cat.moq}` : ""}
                </div>
              ) : null;
            })()}
          </div>

          <div className="md:col-span-2">
            <Label>Notes (optional)</Label>
            <Input className="h-9 mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!name.trim()) return;
              onCreate({
                name: name.trim(),
                costPerUnit: cost,
                expectedUnits: qty,
                sku: sku || undefined,
                unit: unit || undefined,
                bestSupplier: supplier || undefined,
                category: category || undefined,
                notes: notes || undefined,
              });
              onOpenChange(false);
            }}
          >
            Add Item
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ===========================================================
   Main SetupTab (now also manages products)
   =========================================================== */
interface SetupTabProps {
  setup: PricingSetup;
  onSetupChange: (setup: PricingSetup) => void;
  onCalculate?: () => void;
  isCalculating?: boolean;

  // NEW
  products: PricingProduct[];
  onProductsChange: (rows: PricingProduct[]) => void;
}

export default function SetupTab({
  setup,
  onSetupChange,
  onCalculate,
  isCalculating,
  products,
  onProductsChange,
}: SetupTabProps) {
  // ---- existing setup state ----
  const [costMethod, setCostMethod] = useState<"simple" | "breakdown">(setup.useBreakdown ? "breakdown" : "simple");
  const [profitMethod, setProfitMethod] = useState<"fixed" | "margin">(setup.useMargin ? "margin" : "fixed");

  useEffect(() => {
    setCostMethod(setup.useBreakdown ? "breakdown" : "simple");
    setProfitMethod(setup.useMargin ? "margin" : "fixed");
  }, [setup.useBreakdown, setup.useMargin]);

  const addExpense = () => {
    const newExpense: PricingExpense = { id: Date.now().toString(), label: "", amount: 0 };
    onSetupChange({ ...setup, expenses: [...setup.expenses, newExpense] });
  };
  const removeExpense = (id: string | number) =>
    onSetupChange({ ...setup, expenses: setup.expenses.filter((x) => x.id !== id) });
  const updateExpense = (id: string | number, field: keyof PricingExpense, value: string | number) =>
    onSetupChange({
      ...setup,
      expenses: setup.expenses.map((e) =>
        e.id === id ? { ...e, [field]: field === "amount" ? (parseFloat(value as string) || 0) : value } : e
      ),
    });

  const totalCalculatedCost = setup.expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount as any) || 0), 0);

  // ---- Tshepiso framework derived values ----
  const clientType = setup.clientType as ClientTypeKey | undefined;
  const jobSize    = setup.jobSize    as JobSizeKey    | undefined;
  const urgency    = (setup.urgency || "standard") as UrgencyKey;
  const sustainabilityPremium    = setup.sustainabilityPremium    ?? false;
  const sustainabilityPremiumPct = setup.sustainabilityPremiumPct ?? 15;
  const pmFeePercent             = setup.pmFeePercent;

  const loadOverheadDefaults = () => {
    const defaultExpenses: PricingExpense[] = TSHEPISO_OVERHEADS.map((o, i) => ({
      id: `default-${i}-${Date.now()}` as any,
      label: o.label,
      amount: o.amount,
    }));
    onSetupChange({ ...setup, useBreakdown: true, expenses: defaultExpenses });
    setCostMethod("breakdown");
  };

  // ---- products state (moved from ProductsTab) ----
  const supplierNames = useSupplierNames();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [editing, setEditing] = useState<PricingProduct | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [searchText, setSearchText] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return (products || []).filter((p: any) => {
      if (supplierFilter !== "all") {
        const meta = String(p.bestSupplier || "");
        const fallback = p.name && p.name.includes(" — ") ? p.name.split(" — ").slice(-1)[0]?.trim() : "";
        if (!(meta === supplierFilter || fallback === supplierFilter)) return false;
      }
      if (!q) return true;
      const hay = [p.name, p.sku, p.bestSupplier, p.category].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [products, supplierFilter, searchText]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (pageClamped - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageClamped, pageSize]);

  const updateProduct = (id: string | number, patch: Partial<PricingProduct>) =>
    onProductsChange(products.map((p) => (String(p.id) === String(id) ? { ...p, ...patch } : p)));
  const removeProduct = (id: string | number) =>
    onProductsChange(products.filter((p) => String(p.id) !== String(id)));
  const duplicateProduct = (id: string | number) => {
    const src = products.find((p) => String(p.id) === String(id));
    if (!src) return;
    const clone: PricingProduct = { ...src, id: `dup-${Date.now()}`, name: `${src.name} (Copy)` };
    onProductsChange([clone, ...products]);
  };

  const handleAddFromSupplier = (rows: SupplierRow[]) => {
    const mapped: PricingProduct[] = rows.map((s) => ({
      id: s.id,
      name: s.productName,
      costPerUnit: typeof s.price === "number" ? s.price : money(s.price),
      expectedUnits: 0,
      calculationMethod: "cost-plus",
      revenuePercentage: 0,
      category: "",
      minQuantity: 0,
      maxQuantity: undefined,
      notes: "",
      directCosts: [],
      sku: s.sku || undefined,
      unit: s.unit || undefined,
      bestSupplier: s.supplierName || undefined,
    }));
    onProductsChange([...mapped, ...products]);
  };

  const handleCreateCustom = (item: {
    name: string;
    costPerUnit: number;
    expectedUnits?: number;
    sku?: string;
    unit?: string;
    bestSupplier?: string;
    category?: string;
    notes?: string;
  }) => {
    const row: PricingProduct = {
      id: `custom-${Date.now()}`,
      name: item.name.trim(),
      costPerUnit: Number(item.costPerUnit) || 0,
      expectedUnits: Number(item.expectedUnits || 0),
      calculationMethod: "cost-plus",
      revenuePercentage: 0,
      category: item.category || "",
      minQuantity: 0,
      maxQuantity: undefined,
      notes: item.notes || "",
      directCosts: [],
      sku: item.sku || undefined,
      unit: item.unit || undefined,
      bestSupplier: item.bestSupplier || undefined,
    };
    onProductsChange([row, ...products]);
  };

  /* ============================== RENDER ============================== */
  return (
    <div className="slide-in">
      {/* Header */}
      <div className="bg-card border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-card-foreground">My Business Costs</h2>
            <p className="text-muted-foreground mt-1">Enter your monthly expenses and profit goal. You only need to set this up once.</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm">
              <HelpCircle className="w-4 h-4 mr-2" />
              Help
            </Button>
            <Button onClick={onCalculate} disabled={isCalculating}>
              {isCalculating ? (
                <>
                  <div className="loading-spinner w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculate
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Business Targets KPI Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "What your business costs each month", value: `R ${(setup.useBreakdown ? totalCalculatedCost : setup.totalCost || 0).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`, sub: "monthly overheads" },
              { label: "Profit you want to make", value: setup.useMargin ? `${setup.targetMargin || 0}%` : `R ${(setup.targetProfit || 0).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`, sub: setup.useMargin ? "of every rand earned" : "per month" },
              { label: "Total you need to earn", value: `R ${Math.round((setup.useBreakdown ? totalCalculatedCost : setup.totalCost || 0) + (setup.useMargin ? 0 : setup.targetProfit || 0)).toLocaleString("en-ZA")}`, sub: "per month (min)" },
              { label: "Per job goal", value: `R ${Math.round(((setup.useBreakdown ? totalCalculatedCost : setup.totalCost || 0) + (setup.useMargin ? 0 : setup.targetProfit || 0)) / 10).toLocaleString("en-ZA")}`, sub: "if you do 10 jobs/month" },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-primary">{value}</div>
                <div className="text-xs font-medium text-foreground/70 mt-0.5">{label}</div>
                <div className="text-[10px] text-muted-foreground">{sub}</div>
              </div>
            ))}
          </div>

          {/* Cost Configuration */}
          <Card className="pricing-form-section">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Coins className="w-5 h-5 mr-3 text-primary" />
                Step 1 — What does your business cost to run each month?
              </CardTitle>
              <CardDescription>
                These are costs you pay every month whether you have clients or not — rent, salaries, insurance, etc.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={costMethod}
                onValueChange={(m) => {
                  setCostMethod(m as any);
                  onSetupChange({ ...setup, useBreakdown: m === "breakdown" });
                }}
              >
                <div className="space-y-6">
                  {/* Simple total cost */}
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="simple" id="simple" />
                      <Label htmlFor="simple" className="font-medium">I know the total — just let me enter one number</Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 ml-6">
                      Quick option if you already know your total monthly costs
                    </p>

                    {costMethod === "simple" && (
                      <div className="mt-4 ml-6">
                        <Label htmlFor="totalCost" className="text-sm font-medium">Total monthly business costs (R)</Label>
                        <div className="relative mt-2">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                          <Input
                            id="totalCost"
                            type="number"
                            value={setup.totalCost ?? ""}
                            onChange={(e) => onSetupChange({ ...setup, totalCost: parseFloat(e.target.value) || 0 })}
                            className="pl-8"
                            placeholder="0.00"
                            step="0.01"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Breakdown */}
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="breakdown" id="breakdown" />
                      <Label htmlFor="breakdown" className="font-medium">I want to list every expense separately</Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 ml-6">
                      Recommended — shows you exactly where your money goes
                    </p>

                    {costMethod === "breakdown" && (
                      <div className="mt-4 ml-6">
                        <div className="space-y-3">
                          {setup.expenses.map((expense) => (
                            <div key={expense.id} className="flex items-center space-x-3">
                              <Input
                                value={expense.label}
                                onChange={(e) => updateExpense(expense.id, "label", e.target.value)}
                                placeholder="Expense category (e.g., Rent, Utilities)"
                                className="flex-1"
                              />
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                                <Input
                                  type="number"
                                  value={expense.amount ?? ""}
                                  onChange={(e) => updateExpense(expense.id, "amount", e.target.value)}
                                  className="w-32 pl-8"
                                  placeholder="0.00"
                                  step="0.01"
                                />
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => removeExpense(expense.id)} className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                          <Button variant="ghost" size="sm" onClick={addExpense} className="text-primary hover:text-primary">
                            <Plus className="w-4 h-4 mr-2" /> Add another expense
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={loadOverheadDefaults}
                            className="border-primary/50 text-primary hover:bg-primary/10"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Load our standard expenses (pre-filled)
                          </Button>
                        </div>

                        <div className="mt-4 p-3 bg-accent/10 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Your total monthly business costs:</span>
                            <Badge variant="secondary" className="text-lg font-bold">R{(totalCalculatedCost ?? 0).toFixed(2)}</Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Profit Target */}
          <Card className="pricing-form-section">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Target className="w-5 h-5 mr-3 text-primary" />
                Step 2 — How much profit do you want to make?
              </CardTitle>
              <CardDescription>
                This is money left over after paying all your bills. It's what grows your business.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={profitMethod}
                onValueChange={(m) => {
                  setProfitMethod(m as any);
                  onSetupChange({ ...setup, useMargin: m === "margin" });
                }}
              >
                <div className="space-y-6">
                  {/* Fixed Profit */}
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="fixed" id="fixed" />
                      <Label htmlFor="fixed" className="font-medium">A specific rand amount per month</Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 ml-6">e.g. I want to make R60,000 profit each month</p>

                    {profitMethod === "fixed" && (
                      <div className="mt-4 ml-6">
                        <Label htmlFor="targetProfit" className="text-sm font-medium">Monthly profit goal (R)</Label>
                        <div className="relative mt-2">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                          <Input
                            id="targetProfit"
                            type="number"
                            value={setup.targetProfit ?? ""}
                            onChange={(e) => onSetupChange({ ...setup, targetProfit: parseFloat(e.target.value) || 0 })}
                            className="pl-8"
                            placeholder="0.00"
                            step="0.01"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Margin */}
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="margin" id="margin" />
                      <Label htmlFor="margin" className="font-medium">A percentage of everything I earn</Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 ml-6">e.g. keep 30% of every rand I invoice as profit</p>

                    {profitMethod === "margin" && (
                      <div className="mt-4 ml-6">
                        <Label htmlFor="targetMargin" className="text-sm font-medium">What % of sales should be profit?</Label>
                        <div className="relative mt-2">
                          <Input
                            id="targetMargin"
                            type="number"
                            value={setup.targetMargin ?? ""}
                            onChange={(e) => onSetupChange({ ...setup, targetMargin: parseFloat(e.target.value) || 0 })}
                            className="pr-8"
                            placeholder="0"
                            step="0.1"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">If you charge R100, and want 30% margin, R30 is your profit.</p>
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Products (integrated) */}
          <Card className="pricing-form-section">
            <CardHeader>
              <CardTitle className="text-lg">Products in Loaded Snapshot</CardTitle>
              <CardDescription>
                Add from supplier repository or create custom items; edit quantities and pricing inputs here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Button className="h-9" onClick={() => setPickerOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add from Supplier List
                  </Button>
                  <Button variant="outline" className="h-9" onClick={() => setCustomOpen(true)}>
                    + Add Custom Item
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={() => setViewMode((v) => (v === "table" ? "cards" : "table"))}
                >
                  {viewMode === "table" ? (<><LayoutList className="w-4 h-4 mr-2" /> Cards</>) : (<><TableIcon className="w-4 h-4 mr-2" /> Table</>)}
                </Button>
              </div>

              {/* Filters */}
              <div className="grid gap-4 md:grid-cols-12">
                <div className="md:col-span-4">
                  <Label>Supplier</Label>
                  <SupplierCombobox
                    value={supplierFilter}
                    onChange={setSupplierFilter}
                    options={supplierNames}
                    placeholder="Select supplier"
                    allowAll
                  />
                </div>
                <div className="md:col-span-8">
                  <Label>Search</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={searchText}
                      onChange={(e) => { setPage(1); setSearchText(e.target.value); }}
                      placeholder="Search name / SKU / supplier"
                      className="pl-8 h-9"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Showing {filtered.length ? (pageClamped - 1) * pageSize + 1 : 0}–{Math.min(pageClamped * pageSize, filtered.length)} of {filtered.length}
                  </div>
                </div>
              </div>

              {/* Table / Cards */}
              {viewMode === "table" ? (
                <div className="overflow-x-auto rounded-md border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr className="text-left">
                        <th className="px-3 py-2 w-[56px]">#</th>
                        <th className="px-3 py-2 min-w-[260px]">Product</th>
                        <th className="px-3 py-2 w-[150px]">Supplier</th>
                        <th className="px-3 py-2 w-[180px]">Cost (R)</th>
                        <th className="px-3 py-2 w-[120px]">On‑hand</th>
                        <th className="px-3 py-2 w-[150px]">Method</th>
                        <th className="px-3 py-2 w-[120px]">Rev %</th>
                        <th className="px-3 py-2 w-[168px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((p: any, i) => (
                        <tr key={String(p.id)} className="border-t hover:bg-muted/40">
                          <td className="px-3 py-2">{(pageClamped - 1) * pageSize + i + 1}</td>

                          <td className="px-3 py-2">
                            <Input className="h-9" value={p.name || ""} onChange={(e) => updateProduct(p.id, { name: e.target.value })} placeholder="Name" />
                            {(() => {
                              const cat = PRODUCT_CATEGORIES.find(c => c.value === p.category);
                              const moqWarning = cat?.moq && parseInt(p.expectedUnits as any) > 0 && parseInt(p.expectedUnits as any) < 10;
                              return cat ? (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-xs text-muted-foreground">{cat.label}</span>
                                  <span className="text-xs text-blue-600 dark:text-blue-400">· GP {cat.minGP}–{cat.maxGP}%</span>
                                  {moqWarning && (
                                    <span className="flex items-center gap-0.5 text-xs text-amber-600">
                                      <AlertTriangle className="w-3 h-3" /> MOQ: {cat.moq}
                                    </span>
                                  )}
                                </div>
                              ) : null;
                            })()}
                          </td>

                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                            <SupplierCombobox
                              value={p.bestSupplier || ""}
                              onChange={(v) => updateProduct(p.id, { bestSupplier: v === "all" ? "" : v })}
                              options={supplierNames}
                              placeholder="Supplier"
                              allowAll={false}
                            />
                          </td>

                          {/* Removed SKU and Unit columns */}

                          <td className="px-3 py-2">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                              <Input
                                className="pl-6 h-9"
                                type="number"
                                step="0.01"
                                value={parseFloat(p.costPerUnit as any) || 0}
                                onChange={(e) => updateProduct(p.id, { costPerUnit: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                          </td>

                          <td className="px-3 py-2">
                            <Input
                              className="h-9"
                              type="number"
                              value={parseInt(p.expectedUnits as any) || 0}
                              onChange={(e) => updateProduct(p.id, { expectedUnits: parseInt(e.target.value) || 0 })}
                            />
                          </td>

                          <td className="px-3 py-2">
                            <Select value={p.calculationMethod || "cost-plus"} onValueChange={(v) => updateProduct(p.id, { calculationMethod: v as any })}>
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
                              step="0.1"
                              disabled={(p.calculationMethod || "cost-plus") !== "percentage"}
                              value={parseFloat(p.revenuePercentage as any) || 0}
                              onChange={(e) => updateProduct(p.id, { revenuePercentage: parseFloat(e.target.value) || 0 })}
                            />
                          </td>

                          <td className="px-3 py-2">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => setEditing(p)}><Pencil className="w-4 h-4 mr-1" /> Edit</Button>
                              <Button size="sm" variant="outline" onClick={() => duplicateProduct(p.id)}><Copy className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeProduct(p.id)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {pageRows.length === 0 && (
                        <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">No products match your filters.</td></tr> 
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.map((p: any) => (
                    <Card key={String(p.id)} className="pricing-form-section">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {p.name}
                          {String(p.id).startsWith("custom-") && <Badge variant="secondary">Custom</Badge>}
                        </CardTitle>
                        {/* Removed SKU and Unit from CardDescription */}
                        <CardDescription>{p.bestSupplier || "—"}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><div className="text-muted-foreground">Cost</div><div>R{(parseFloat(p.costPerUnit as any) || 0).toFixed(2)}</div></div>
                          <div><div className="text-muted-foreground">On‑hand</div><div>{parseInt(p.expectedUnits as any) || 0}</div></div>
                          <div><div className="text-muted-foreground">Method</div><div>{p.calculationMethod || "cost-plus"}</div></div>
                          <div><div className="text-muted-foreground">Rev %</div><div>{parseFloat(p.revenuePercentage as any) || 0}</div></div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" onClick={() => setEditing(p)}><Pencil className="w-4 h-4 mr-1" /> Edit</Button>
                          <Button size="sm" variant="outline" onClick={() => duplicateProduct(p.id)}><Copy className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeProduct(p.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Rows</Label>
                  <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(parseInt(v)); setPage(1); }}>
                    <SelectTrigger className="w-[90px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button className="h-9" variant="outline" disabled={pageClamped <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                  <div className="text-sm">Page {pageClamped} / {totalPages}</div>
                  <Button className="h-9" variant="outline" disabled={pageClamped >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals for adding */}
      <SupplierPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onPick={handleAddFromSupplier} supplierNames={supplierNames} />
      <CustomItemDialog open={customOpen} onOpenChange={setCustomOpen} onCreate={handleCreateCustom} supplierNames={supplierNames} />

      {/* Edit dialog */}
      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>Adjust fields and save.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Name</Label>
                <Input className="h-9 mt-1" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label>Supplier</Label>
                <SupplierCombobox
                  value={editing.bestSupplier || ""}
                  onChange={(v) => setEditing({ ...editing, bestSupplier: v })}
                  options={supplierNames}
                  placeholder="Supplier"
                  allowAll={false}
                />
              </div>
              <div>
                <Label>Cost (R)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                  <Input
                    className="pl-6 h-9"
                    type="number"
                    step="0.01"
                    value={editing.costPerUnit ?? 0}
                    onChange={(e) => setEditing({ ...editing, costPerUnit: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label>On‑hand</Label>
                <Input
                  className="h-9 mt-1"
                  type="number"
                  value={editing.expectedUnits}
                  onChange={(e) => setEditing({ ...editing, expectedUnits: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Method</Label>
                <Select value={editing.calculationMethod || "cost-plus"} onValueChange={(v) => setEditing({ ...editing, calculationMethod: v as any })}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cost-plus">Cost‑Plus</SelectItem>
                    <SelectItem value="percentage">Revenue %</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Revenue %</Label>
                <Input
                  className="h-9 mt-1"
                  type="number"
                  step="0.1"
                  disabled={(editing.calculationMethod || "cost-plus") !== "percentage"}
                  value={editing.revenuePercentage || 0}
                  onChange={(e) => setEditing({ ...editing, revenuePercentage: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>SKU</Label>
                <Input className="h-9 mt-1" value={editing.sku || ""} onChange={(e) => setEditing({ ...editing, sku: e.target.value || undefined })} />
              </div>
              <div>
                <Label>Unit</Label>
                <Input className="h-9 mt-1" value={editing.unit || ""} onChange={(e) => setEditing({ ...editing, unit: e.target.value || undefined })} />
              </div>
              <div className="md:col-span-2">
                <Label>Product Category</Label>
                <Select value={(editing as any).category || ""} onValueChange={(v) => setEditing({ ...editing, category: v } as any)}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(() => {
                  const cat = PRODUCT_CATEGORIES.find(c => c.value === (editing as any).category);
                  return cat ? (
                    <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-xs flex gap-4">
                      <span><span className="font-medium">Target GP:</span> {cat.minGP}%–{cat.maxGP}%</span>
                      {cat.moq && <span><span className="font-medium">MOQ:</span> {cat.moq}</span>}
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="edit-inhouse"
                  checked={(editing as any).isInHouse ?? false}
                  onChange={(e) => setEditing({ ...editing, isInHouse: e.target.checked } as any)}
                  className="h-4 w-4 accent-primary"
                />
                <Label htmlFor="edit-inhouse" className="text-sm">In-House Production</Label>
                <span className="text-xs text-muted-foreground">(vs outsourced supplier)</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => { onProductsChange(products.map(p => String(p.id) === String(editing.id) ? editing : p)); setEditing(null); }}>
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
