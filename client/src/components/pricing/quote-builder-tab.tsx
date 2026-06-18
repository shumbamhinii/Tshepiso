// components/pricing/quote-builder-tab.tsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Trash2, Package, Brush, Ruler, Clock,
  ChevronDown, ChevronUp, Copy, RefreshCw, Target, FileText,
  AlertTriangle, CheckCircle2, Leaf, Zap, Search, X,
  Settings2, Save, FolderOpen, RotateCcw,
} from "lucide-react";
import { PricingSetup } from "@/types/pricing";

/* ─── Hardcoded factory defaults ─────────────────────────────────── */
// Starting values only. Once saved to the DB these are overridden for everyone.
const FACTORY_DEFAULTS = {
  monthlyOverhead:     94_710,  // monthly fixed costs
  monthlyProfitTarget: 60_000,  // desired monthly profit on top of overhead
  defaultLaborRate: 120,
  defaultDesignRate: 450,
  defaultPmFeePct: 10,
  defaultEcoPct: 15,
  // Rush surcharges (% added to GP target)
  rush48hSurcharge: 15,
  rush24hSurcharge: 25,
  rushSameDaySurcharge: 40,
  // Minimum GP % per client type
  corporateMinGP: 35,
  governmentMinGP: 25,
  retailMinGP: 30,
  smmeMinGP: 45,
  resellerMinGP: 15,
  // Default GP % per job category
  categoryGPs: {
    "large-format-inhouse":    55,
    "large-format-outsourced": 47,
    "signage":                 47,
    "corporate-clothing":      42,
    "promotional-gifts":       50,
    "eco-products":            65,
    "paper-bags":              57,
    "felt-bags":               70,
    "laser-engraving":         65,
    "branding-design":         70,
    "event-branding":          55,
    "other":                   40,
  } as Record<string, number>,
  // Material costs per m²
  materialCosts: {
    "outdoor-vinyl":  55,
    "mesh-banner":    65,
    "canvas":         95,
    "self-adhesive":  75,
    "one-way-vision": 110,
    "backlit-film":   100,
    "corflute":       45,
    "foam-board":     95,
    "acm":            220,
    "paper-coated":   8,
    "custom":         0,
  } as Record<string, number>,
};

export type QuoteDefaults = typeof FACTORY_DEFAULTS;



/* ─── Merge helper — overlays saved config on top of factory defaults ─ */
function mergeDefaults(saved: Record<string, unknown>): QuoteDefaults {
  return {
    ...FACTORY_DEFAULTS,
    ...saved,
    categoryGPs:   { ...FACTORY_DEFAULTS.categoryGPs,   ...((saved.categoryGPs   as Record<string, number>) || {}) },
    materialCosts: { ...FACTORY_DEFAULTS.materialCosts, ...((saved.materialCosts as Record<string, number>) || {}) },
  };
}

/* ─── Supplier data hook ──────────────────────────────────────────── */
interface SupplierProduct {
  id?: number;
  supplierName: string;
  productName: string;
  sku?: string | null;
  unit?: string | null;
  price: string | number;
}

function useSupplierCatalog() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  useEffect(() => {
    fetch("/api/suppliers", { headers: { Accept: "application/json" } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]));
  }, []);
  return products;
}

/* ─── Static meta (labels, keys — no pricing values) ─────────────── */
const CLIENT_TYPE_META = [
  { value: "corporate",  label: "Big Company / Corporate",  example: "e.g. banks, retailers, large brands",           deposit: "Negotiate deposit",           gpKey: "corporateMinGP"  as const },
  { value: "government", label: "Government or SOE",         example: "e.g. municipalities, Eskom, SASSA",             deposit: "Need a Purchase Order first", gpKey: "governmentMinGP" as const },
  { value: "retail",     label: "Shop or Retailer",          example: "e.g. spaza shop, small store",                  deposit: "50% deposit upfront",         gpKey: "retailMinGP"     as const },
  { value: "smme",       label: "Small Business (SMME)",     example: "e.g. hair salon, caterer, startup",             deposit: "70% deposit upfront",         gpKey: "smmeMinGP"       as const },
  { value: "reseller",   label: "Reseller / Agent",          example: "e.g. someone who resells your work to clients", deposit: "70% deposit upfront",         gpKey: "resellerMinGP"   as const },
] as const;

const CATEGORY_META = [
  { value: "large-format-inhouse",    label: "Banner / Poster (own printer)",        model: "sqm"     },
  { value: "large-format-outsourced", label: "Banner / Poster (send to printer)",    model: "sqm"     },
  { value: "signage",                 label: "Signage / Board",                      model: "sqm"     },
  { value: "corporate-clothing",      label: "Branded Clothing",                     model: "unit"    },
  { value: "promotional-gifts",       label: "Promotional Gifts",                    model: "unit"    },
  { value: "eco-products",            label: "Eco-Friendly Products",                model: "unit"    },
  { value: "paper-bags",              label: "Paper Bags",                           model: "unit"    },
  { value: "felt-bags",               label: "Felt Bags",                            model: "unit"    },
  { value: "laser-engraving",         label: "Laser Engraving",                      model: "unit"    },
  { value: "branding-design",         label: "Design / Branding Services",           model: "service" },
  { value: "event-branding",          label: "Event Branding / Activations",         model: "service" },
  { value: "other",                   label: "Something else",                       model: "unit"    },
] as const;

const MATERIAL_META = [
  { id: "outdoor-vinyl",  label: "Outdoor Vinyl Banner"        },
  { id: "mesh-banner",    label: "Mesh / Perforated Banner"    },
  { id: "canvas",         label: "Canvas Print"                },
  { id: "self-adhesive",  label: "Self-Adhesive Vinyl Sticker" },
  { id: "one-way-vision", label: "One-Way Vision Film"         },
  { id: "backlit-film",   label: "Backlit Film"                },
  { id: "corflute",       label: "Corflute Board (5 mm)"       },
  { id: "foam-board",     label: "PVC Foam Board"              },
  { id: "acm",            label: "Aluminium Composite Panel"   },
  { id: "paper-coated",   label: "Coated Paper (outsourced)"   },
  { id: "custom",         label: "Other / Custom material"     },
] as const;

type PricingModel = "sqm" | "unit" | "service";

/* ─── Line item type ──────────────────────────────────────────────── */
export interface QuoteLineItem {
  id: string;
  description: string;
  category: string;
  model: PricingModel;
  widthM: number;
  heightM: number;
  materialId: string;
  materialCostPerSqm: number;
  inkCoveragePct: number;
  blankItemCost: number;
  brandingCostPerUnit: number;
  brandingDescription: string;
  linkedSupplierProductId?: number;
  qty: number;
  laborHours: number;
  laborRate: number;
  artworkFee: number;
  designHours: number;
  designRate: number;
  targetGpPct: number;
  collapsed: boolean;
}

/* ─── Calculation ─────────────────────────────────────────────────── */
function calcLine(item: QuoteLineItem, urgencySurcharge = 0) {
  const qty = Math.max(item.qty || 1, 1);
  let materialCost = 0;
  let area = 0;

  if (item.model === "sqm") {
    area = (item.widthM || 0) * (item.heightM || 0);
    const inkAdj = 1 + (item.inkCoveragePct || 0) / 100;
    materialCost = area * (item.materialCostPerSqm || 0) * qty * inkAdj;
  } else if (item.model === "unit") {
    materialCost = ((item.blankItemCost || 0) + (item.brandingCostPerUnit || 0)) * qty;
  }

  const laborCost   = (item.laborHours  || 0) * (item.laborRate  || 120);
  const designCost  = (item.designHours || 0) * (item.designRate || 450);
  const artworkCost = (item.artworkFee  || 0) + designCost;
  const totalCost   = materialCost + laborCost + artworkCost;

  const baseGP      = Math.max(item.targetGpPct || 35, 1);
  const effectiveGP = Math.min(baseGP + urgencySurcharge, 99);
  const gpDecimal   = effectiveGP / 100;
  const totalSell   = gpDecimal < 1 ? totalCost / (1 - gpDecimal) : totalCost * 2;
  const gpAmount    = totalSell - totalCost;
  const actualGpPct = totalSell > 0 ? (gpAmount / totalSell) * 100 : 0;
  const unitSell    = qty > 0 ? totalSell / qty : 0;
  const unitCostAmt = qty > 0 ? totalCost / qty : 0;
  const sellPerSqm  = area > 0 ? unitSell / area : 0;
  const costPerSqm  = area > 0 ? materialCost / (area * qty) : 0;

  return { area, materialCost, laborCost, artworkCost, totalCost, totalSell, gpAmount, actualGpPct, unitSell, unitCostAmt, sellPerSqm, costPerSqm };
}

const fmt = (n: number) => n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const R   = (n: number) => `R ${fmt(n)}`;

function newLine(defs: QuoteDefaults, overrides: Partial<QuoteLineItem> = {}): QuoteLineItem {
  return {
    id: `ql-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    description: "", category: "large-format-inhouse", model: "sqm",
    widthM: 1, heightM: 1, materialId: "outdoor-vinyl",
    materialCostPerSqm: defs.materialCosts["outdoor-vinyl"] ?? 55,
    inkCoveragePct: 0,
    blankItemCost: 0, brandingCostPerUnit: 0, brandingDescription: "",
    qty: 1,
    laborHours: 0, laborRate: defs.defaultLaborRate,
    artworkFee: 0, designHours: 0, designRate: defs.defaultDesignRate,
    targetGpPct: defs.categoryGPs["large-format-inhouse"] ?? 55,
    collapsed: false,
    ...overrides,
  };
}

/* ─── Supplier search dropdown ────────────────────────────────────── */
function SupplierSearch({ catalog, onSelect }: {
  catalog: SupplierProduct[];
  onSelect: (p: SupplierProduct) => void;
}) {
  const [query, setQuery] = useState("");
  const [open,  setOpen]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    return catalog
      .filter(p => [p.productName, p.sku, p.supplierName].filter(Boolean).join(" ").toLowerCase().includes(q))
      .slice(0, 8);
  }, [catalog, q]);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input className="pl-8 h-8 text-xs" placeholder="Search your supplier catalog…"
          value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
        {query && (
          <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => { setQuery(""); setOpen(false); }}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {results.map((p, i) => (
            <button key={`${p.id ?? i}`} className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex gap-2 border-b last:border-0"
              onMouseDown={e => { e.preventDefault(); onSelect(p); setQuery(""); setOpen(false); }}>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.productName}</div>
                <div className="text-muted-foreground">{p.supplierName}{p.unit ? ` · ${p.unit}` : ""}{p.sku ? ` · SKU: ${p.sku}` : ""}</div>
              </div>
              <div className="font-bold text-primary flex-shrink-0">
                {R(typeof p.price === "number" ? p.price : parseFloat(String(p.price)) || 0)}
              </div>
            </button>
          ))}
        </div>
      )}
      {open && q && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-lg shadow-lg px-3 py-2 text-xs text-muted-foreground">
          No products found for "{query}"
        </div>
      )}
    </div>
  );
}

/* ─── DB-backed template type ─────────────────────────────────────── */
interface DbQuoteTemplate {
  id: number;
  name: string;
  config: unknown;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/* ─── Settings & Templates panel ─────────────────────────────────── */
function DefaultsPanel({ defs, onApply }: { defs: QuoteDefaults; onApply: (d: QuoteDefaults) => void }) {
  const [local,     setLocal]     = useState<QuoteDefaults>({ ...defs, categoryGPs: { ...defs.categoryGPs }, materialCosts: { ...defs.materialCosts } });
  const [templates, setTemplates] = useState<DbQuoteTemplate[]>([]);
  const [newName,   setNewName]   = useState("");
  const [saved,     setSaved]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    setLocal({ ...defs, categoryGPs: { ...defs.categoryGPs }, materialCosts: { ...defs.materialCosts } });
  }, [defs]);

  // Fetch templates from DB on mount
  useEffect(() => {
    fetch("/api/quote-templates", { headers: { Accept: "application/json" } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTemplates(false));
  }, []);

  const set        = (patch: Partial<QuoteDefaults>) => setLocal(d => ({ ...d, ...patch }));
  const setCatGP   = (key: string, v: number) => setLocal(d => ({ ...d, categoryGPs:   { ...d.categoryGPs,   [key]: v } }));
  const setMatCost = (key: string, v: number) => setLocal(d => ({ ...d, materialCosts: { ...d.materialCosts, [key]: v } }));

  const handleApply = async () => {
    setSaving(true);
    try {
      await fetch("/api/quote-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(local),
      });
      onApply(local);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Failed to save — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/quote-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), config: local }),
      });
      if (!res.ok) throw new Error();
      const created: DbQuoteTemplate = await res.json();
      setTemplates(ts => [...ts, created]);
      setNewName("");
    } catch {
      alert("Failed to save template.");
    }
  };

  const handleLoadTemplate = (t: DbQuoteTemplate) => {
    const merged = mergeDefaults(t.config as Record<string, unknown>);
    setLocal({ ...merged, categoryGPs: { ...merged.categoryGPs }, materialCosts: { ...merged.materialCosts } });
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      const res = await fetch(`/api/quote-templates/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error();
      setTemplates(ts => ts.filter(t => t.id !== id));
    } catch {
      alert("Failed to delete template.");
    }
  };

  const handleReset = () => {
    setLocal({ ...FACTORY_DEFAULTS, categoryGPs: { ...FACTORY_DEFAULTS.categoryGPs }, materialCosts: { ...FACTORY_DEFAULTS.materialCosts } });
  };

  return (
    <div className="space-y-6">

      {/* Monthly business targets — drives the coverage bar on quotations */}
      <div className="rounded-lg border bg-amber-50 border-amber-200 p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-amber-900">Monthly Business Targets</h3>
          <p className="text-xs text-amber-700 mt-0.5">
            These figures power the coverage bar on Manage Quotations and the GP contribution shown in the pricer.
            Change them here and they update everywhere.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Monthly overhead (R)</Label>
            <div className="flex gap-1 mt-1">
              <Input type="number" step="100" min="0" className="h-8 text-sm"
                value={local.monthlyOverhead}
                onChange={e => set({ monthlyOverhead: parseFloat(e.target.value) || 0 })} />
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground"
                onClick={() => set({ monthlyOverhead: FACTORY_DEFAULTS.monthlyOverhead })}>
                Reset
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">default R {FACTORY_DEFAULTS.monthlyOverhead.toLocaleString("en-ZA")}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Monthly profit target (R)</Label>
            <div className="flex gap-1 mt-1">
              <Input type="number" step="100" min="0" className="h-8 text-sm"
                value={local.monthlyProfitTarget}
                onChange={e => set({ monthlyProfitTarget: parseFloat(e.target.value) || 0 })} />
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground"
                onClick={() => set({ monthlyProfitTarget: FACTORY_DEFAULTS.monthlyProfitTarget })}>
                Reset
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">default R {FACTORY_DEFAULTS.monthlyProfitTarget.toLocaleString("en-ZA")}</p>
          </div>
        </div>
        <div className="text-xs font-semibold text-amber-800 border-t border-amber-200 pt-2">
          Total monthly target: R {((local.monthlyOverhead || 0) + (local.monthlyProfitTarget || 0)).toLocaleString("en-ZA")}
        </div>
      </div>

      {/* Rates & Fees */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Default Rates &amp; Fees</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            { label: "Labour rate (R/hr)",   key: "defaultLaborRate"  },
            { label: "Design rate (R/hr)",   key: "defaultDesignRate" },
            { label: "Coordination fee (%)", key: "defaultPmFeePct"   },
            { label: "Eco premium (%)",      key: "defaultEcoPct"     },
          ] as { label: string; key: keyof QuoteDefaults }[]).map(f => (
            <div key={f.key as string}>
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              <Input type="number" step="0.5" min="0" className="h-8 mt-1 text-sm"
                value={local[f.key] as number}
                onChange={e => set({ [f.key]: parseFloat(e.target.value) || 0 })} />
            </div>
          ))}
        </div>
      </div>

      {/* Rush surcharges */}
      <div>
        <h3 className="text-sm font-semibold mb-1">Rush Surcharges</h3>
        <p className="text-xs text-muted-foreground mb-3">These % amounts are added on top of the target profit when a job is urgent.</p>
        <div className="grid grid-cols-3 gap-3">
          {([
            { label: "48-hour rush (%)",  key: "rush48hSurcharge"     },
            { label: "24-hour rush (%)",  key: "rush24hSurcharge"     },
            { label: "Same-day rush (%)", key: "rushSameDaySurcharge" },
          ] as { label: string; key: keyof QuoteDefaults }[]).map(f => (
            <div key={f.key as string}>
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              <Input type="number" step="1" min="0" max="100" className="h-8 mt-1 text-sm"
                value={local[f.key] as number}
                onChange={e => set({ [f.key]: parseFloat(e.target.value) || 0 })} />
            </div>
          ))}
        </div>
      </div>

      {/* Min GP per client type */}
      <div>
        <h3 className="text-sm font-semibold mb-1">Minimum Profit % per Client Type</h3>
        <p className="text-xs text-muted-foreground mb-3">The system warns you if a quote falls below these levels.</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {CLIENT_TYPE_META.map(ct => (
            <div key={ct.value}>
              <Label className="text-xs text-muted-foreground">{ct.label}</Label>
              <Input type="number" step="1" min="0" max="99" className="h-8 mt-1 text-sm"
                value={local[ct.gpKey]}
                onChange={e => set({ [ct.gpKey]: parseFloat(e.target.value) || 0 })} />
            </div>
          ))}
        </div>
      </div>

      {/* Default GP per category */}
      <div>
        <h3 className="text-sm font-semibold mb-1">Default Profit % per Job Type</h3>
        <p className="text-xs text-muted-foreground mb-3">New line items start with this profit %. Staff can still change it per line.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {CATEGORY_META.map(c => (
            <div key={c.value} className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{c.label}</Label>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Input type="number" step="1" min="1" max="99" className="h-7 w-16 text-xs text-right"
                  value={local.categoryGPs[c.value] ?? FACTORY_DEFAULTS.categoryGPs[c.value] ?? 40}
                  onChange={e => setCatGP(c.value, parseFloat(e.target.value) || 0)} />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Material costs */}
      <div>
        <h3 className="text-sm font-semibold mb-1">Outsourced Print / Signage Costs (R per m²)</h3>
        <p className="text-xs text-muted-foreground mb-3">What you typically pay your printer or supplier per m². Auto-filled when you select a print type on a job line. Update these whenever your printer changes their rates.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {MATERIAL_META.map(m => (
            <div key={m.id} className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{m.label}</Label>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs text-muted-foreground">R</span>
                <Input type="number" step="0.5" min="0" className="h-7 w-16 text-xs"
                  value={local.materialCosts[m.id] ?? FACTORY_DEFAULTS.materialCosts[m.id] ?? 0}
                  onChange={e => setMatCost(m.id, parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Apply / Reset */}
      <div className="flex flex-wrap gap-2 pt-1 border-t">
        <Button className="gap-2" onClick={handleApply} disabled={saving}>
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : saved ? "Saved for everyone!" : "Save These Defaults (shared with all staff)"}
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleReset}>
          <RotateCcw className="w-4 h-4" /> Reset to factory defaults
        </Button>
      </div>

      {/* Templates */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-1">Save as a Named Template</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Save your current settings under a name — e.g. "Premium Rates 2025" or "Government Jobs".
          Templates are saved to the database and available to all staff.
        </p>
        <div className="flex gap-2">
          <Input className="h-8 text-sm flex-1" placeholder="e.g. Standard Rates 2025"
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSaveTemplate(); }} />
          <Button size="sm" className="gap-1.5 h-8 flex-shrink-0" onClick={handleSaveTemplate} disabled={!newName.trim()}>
            <Save className="w-3.5 h-3.5" /> Save template
          </Button>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Saved templates {loadingTemplates && <span className="font-normal normal-case">(loading…)</span>}
          </div>
          {!loadingTemplates && templates.length === 0 && (
            <p className="text-xs text-muted-foreground">No templates saved yet.</p>
          )}
          {templates.map(t => (
            <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.name}</div>
                <div className="text-xs text-muted-foreground">
                  Saved {new Date(t.createdAt).toLocaleDateString("en-ZA")}
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs flex-shrink-0" onClick={() => handleLoadTemplate(t)}>
                <FolderOpen className="w-3 h-3" /> Load into editor
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive flex-shrink-0" onClick={() => handleDeleteTemplate(t.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────── */
interface Props {
  setup?: PricingSetup;
}

export default function QuoteBuilderTab({ setup }: Props) {
  const supplierCatalog = useSupplierCatalog();

  // Configurable defaults — loaded from the DB (shared across all staff), falling back to factory values
  const [defs,         setDefs]         = useState<QuoteDefaults>(FACTORY_DEFAULTS);
  const [showSettings, setShowSettings] = useState(false);

  // Fetch shared defaults from DB on mount
  useEffect(() => {
    fetch("/api/quote-config", { headers: { Accept: "application/json" } })
      .then(r => r.ok ? r.json() : {})
      .then(data => {
        if (data && typeof data === "object" && Object.keys(data).length > 0) {
          setDefs(mergeDefaults(data as Record<string, unknown>));
        }
      })
      .catch(() => {}); // silently fall back to factory defaults
  }, []);

  // Real monthly overhead from the Setup tab (falls back to stored/factory default)
  const monthlyOverhead = useMemo(() => {
    if (!setup) return defs.monthlyOverhead;
    if (setup.useBreakdown && setup.expenses?.length) {
      const total = setup.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      return total > 0 ? total : setup.totalCost || defs.monthlyOverhead;
    }
    return setup.totalCost || defs.monthlyOverhead;
  }, [setup, defs.monthlyOverhead]);

  // Urgency config built from current defaults (surcharges are configurable)
  const URGENCY = useMemo(() => [
    { value: "standard", label: "No rush — normal delivery (3–5 days)", surcharge: 0,                          icon: "🟢" },
    { value: "48h",      label: "Need it in 2 days",                     surcharge: defs.rush48hSurcharge,      icon: "🟡" },
    { value: "24h",      label: "Need it tomorrow",                      surcharge: defs.rush24hSurcharge,      icon: "🟠" },
    { value: "same-day", label: "Need it TODAY",                         surcharge: defs.rushSameDaySurcharge,  icon: "🔴" },
  ], [defs]);

  const [jobName,    setJobName]    = useState("");
  const [clientName, setClientName] = useState("");
  const [clientType, setClientType] = useState(setup?.clientType || "");
  const [urgency,    setUrgency]    = useState<"standard" | "48h" | "24h" | "same-day">((setup?.urgency as any) || "standard");
  const [ecoJob,     setEcoJob]     = useState(false);
  const [ecoPct,     setEcoPct]     = useState(defs.defaultEcoPct);
  const [pmFee,      setPmFee]      = useState(defs.defaultPmFeePct);
  const [includeVat, setIncludeVat] = useState(true);
  const [notes,      setNotes]      = useState("");
  const [lines,      setLines]      = useState<QuoteLineItem[]>(() => [newLine(defs)]);

  const selectedClient   = CLIENT_TYPE_META.find(c => c.value === clientType);
  const urgencyConfig    = URGENCY.find(u => u.value === urgency)!;
  const urgencySurcharge = urgencyConfig?.surcharge ?? 0;
  const clientMinGP      = selectedClient ? defs[selectedClient.gpKey] : 30;

  // When templates are loaded, sync the per-quote fee defaults too
  const handleDefsApply = useCallback((d: QuoteDefaults) => {
    setDefs(d);
    setEcoPct(d.defaultEcoPct);
    setPmFee(d.defaultPmFeePct);
  }, []);

  /* ── Calculations ── */
  // Base per-line price from each line's own GP target (excludes quote-level fees)
  const baseCalcs = useMemo(() => lines.map(l => calcLine(l, urgencySurcharge)), [lines, urgencySurcharge]);

  // PM fee + eco premium are quote-level charges — apply them to every line
  // proportionally so the price shown per line always matches what's invoiced.
  const markupMultiplier = useMemo(() => {
    const pm  = 1 + (pmFee || 0) / 100;
    const eco = ecoJob ? 1 + (ecoPct || 0) / 100 : 1;
    return pm * eco;
  }, [pmFee, ecoJob, ecoPct]);

  const calcs = useMemo(() => baseCalcs.map(c => {
    const totalSell   = c.totalSell  * markupMultiplier;
    const unitSell    = c.unitSell   * markupMultiplier;
    const sellPerSqm  = c.sellPerSqm * markupMultiplier;
    const gpAmount    = totalSell - c.totalCost;
    const actualGpPct = totalSell > 0 ? (gpAmount / totalSell) * 100 : 0;
    return { ...c, totalSell, unitSell, sellPerSqm, gpAmount, actualGpPct };
  }), [baseCalcs, markupMultiplier]);

  const totals = useMemo(() => {
    const totalCost     = calcs.reduce((s, c) => s + c.totalCost, 0);
    const totalSelling  = calcs.reduce((s, c) => s + c.totalSell, 0);
    const gpAmount       = totalSelling - totalCost;
    const gpPct          = totalSelling > 0 ? (gpAmount / totalSelling) * 100 : 0;
    const vat            = includeVat ? totalSelling * 0.15 : 0;
    const grandTotal     = totalSelling + vat;
    const overheadCoverage = monthlyOverhead > 0 ? (gpAmount / monthlyOverhead) * 100 : 0;
    return { totalCost, totalSelling, gpAmount, gpPct, vat, grandTotal, overheadCoverage };
  }, [calcs, includeVat, monthlyOverhead]);

  const allGpOk = calcs.every(c => !clientType || c.actualGpPct >= clientMinGP);

  /* ── Line mutators ── */
  const updateLine = useCallback((id: string, patch: Partial<QuoteLineItem>) => {
    setLines(ls => ls.map(l => {
      if (l.id !== id) return l;
      const u = { ...l, ...patch };
      if (patch.materialId) {
        const cost = defs.materialCosts[patch.materialId];
        if (cost != null && cost > 0) u.materialCostPerSqm = cost;
      }
      if (patch.category) {
        const cat   = CATEGORY_META.find(c => c.value === patch.category);
        const catGP = defs.categoryGPs[patch.category];
        if (cat)   u.model       = cat.model as PricingModel;
        if (catGP) u.targetGpPct = catGP;
      }
      return u;
    }));
  }, [defs]);

  const addLine        = ()           => setLines(ls => [...ls, newLine(defs)]);
  const removeLine     = (id: string) => setLines(ls => ls.filter(l => l.id !== id));
  const dupLine        = (id: string) => setLines(ls => {
    const src = ls.find(l => l.id === id);
    return src ? [...ls, { ...src, id: `ql-${Date.now()}`, description: src.description ? `${src.description} (copy)` : "" }] : ls;
  });
  const toggleCollapse = (id: string) => updateLine(id, { collapsed: !lines.find(l => l.id === id)?.collapsed });

  const handleSupplierSelect = useCallback((lineId: string, product: SupplierProduct) => {
    const price = typeof product.price === "number" ? product.price : parseFloat(String(product.price)) || 0;
    updateLine(lineId, { blankItemCost: price, description: product.productName, linkedSupplierProductId: product.id });
  }, [updateLine]);

  /* ── Render ── */
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Build a Quote</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fill in the details below and the system calculates exactly what to charge.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" className="gap-2" onClick={() => setShowSettings(s => !s)}>
            <Settings2 className="w-4 h-4" />
            {showSettings ? "Hide Settings" : "Default Settings"}
          </Button>
          <Button className="gap-2" onClick={addLine}>
            <Plus className="w-4 h-4" /> Add Line Item
          </Button>
        </div>
      </div>

      {/* ── Settings & Templates (collapsible) ── */}
      {showSettings && (
        <Card className="border-primary/30 bg-primary/3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              Default Settings &amp; Templates
              <Badge variant="outline" className="text-xs">Saved to your browser</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Change these and click "Apply &amp; Save" — new quotes will use your values.
              Save named templates to switch between different pricing configurations in one click.
              {setup?.totalCost
                ? <span className="ml-1 text-green-700 font-medium"> · Monthly overhead showing real figure from Setup tab: {R(monthlyOverhead)}</span>
                : <span className="ml-1 text-amber-700"> · Go to <strong>My Monthly Costs</strong> and enter your expenses to get an accurate overhead figure.</span>
              }
            </p>
          </CardHeader>
          <CardContent>
            <DefaultsPanel defs={defs} onApply={handleDefsApply} />
          </CardContent>
        </Card>
      )}

      {/* ── Step 1: Who is this job for? ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
            Who is this job for?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Client / Company Name</Label>
              <Input className="mt-1 h-9" placeholder="e.g. ABC Company" value={clientName} onChange={e => setClientName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Job / Project Name</Label>
              <Input className="mt-1 h-9" placeholder="e.g. Office Signage October 2025" value={jobName} onChange={e => setJobName(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">What type of client are they?</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {CLIENT_TYPE_META.map(ct => (
                <button key={ct.value} onClick={() => setClientType(ct.value)}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${clientType === ct.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                  <div className="font-medium text-sm">{ct.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{ct.example}</div>
                  {clientType === ct.value && (
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">Min profit: {defs[ct.gpKey]}%</Badge>
                      <Badge variant="outline" className="text-[10px]">{ct.deposit}</Badge>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Step 2: Job details ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
            Job details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Zap className="w-3 h-3" /> How fast do they need it?
              </Label>
              <div className="space-y-1.5">
                {URGENCY.map(u => (
                  <button key={u.value} onClick={() => setUrgency(u.value)}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${urgency === u.value ? "border-primary bg-primary/5 font-medium" : "border-border hover:border-primary/40"}`}>
                    <span className="text-base leading-none">{u.icon}</span>
                    <span className="flex-1">{u.label}</span>
                    {u.surcharge > 0 && (
                      <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-400">+{u.surcharge}% to price</Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Your coordination fee</Label>
                <p className="text-[10px] text-muted-foreground">Your time managing this job — sourcing, admin, chasing suppliers</p>
                <div className="flex items-center gap-2 mt-1">
                  <Input type="number" min="0" max="25" step="0.5" className="h-9 w-20"
                    value={pmFee} onChange={e => setPmFee(parseFloat(e.target.value) || 0)} />
                  <span className="text-sm text-muted-foreground">% added to total price</span>
                </div>
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="eco" checked={ecoJob} onChange={e => setEcoJob(e.target.checked)} className="w-4 h-4 accent-primary" />
                  <label htmlFor="eco" className="text-sm font-medium flex items-center gap-1 cursor-pointer">
                    <Leaf className="w-3.5 h-3.5 text-green-600" /> Using eco-friendly / green materials?
                  </label>
                </div>
                {ecoJob && (
                  <div className="flex items-center gap-2 pl-6">
                    <span className="text-xs text-muted-foreground">Add</span>
                    <Input type="number" min="0" max="40" className="h-7 w-14 text-xs"
                      value={ecoPct} onChange={e => setEcoPct(parseFloat(e.target.value) || 0)} />
                    <span className="text-xs text-muted-foreground">% eco premium</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="vat" checked={includeVat} onChange={e => setIncludeVat(e.target.checked)} className="w-4 h-4 accent-primary" />
                <label htmlFor="vat" className="text-sm cursor-pointer">Add 15% VAT to the final quote</label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Step 3: Line items ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">3</span>
          <h2 className="text-base font-semibold">What are you making or supplying?</h2>
          <span className="text-xs text-muted-foreground ml-1">Add one line per item or service</span>
        </div>

        <div className="space-y-4">
          {lines.map((line, idx) => {
            const c    = calcs[idx];
            const gpOk = !clientType || c.actualGpPct >= clientMinGP;
            const unitTotalCost = (line.blankItemCost || 0) + (line.brandingCostPerUnit || 0);

            return (
              <Card key={line.id} className={`border-l-4 ${gpOk ? "border-l-green-500" : "border-l-amber-500"}`}>

                {/* Line header */}
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-5 flex-shrink-0">#{idx + 1}</span>
                    <Input className="h-8 flex-1 font-medium border-0 shadow-none px-0 text-sm focus-visible:ring-0"
                      placeholder="What is this item? e.g. Branded polo shirts"
                      value={line.description} onChange={e => updateLine(line.id, { description: e.target.value })} />
                    <Select value={line.category} onValueChange={v => updateLine(line.id, { category: v })}>
                      <SelectTrigger className="h-8 w-44 text-xs border-dashed flex-shrink-0"><SelectValue placeholder="Type of item" /></SelectTrigger>
                      <SelectContent>{CATEGORY_META.map(c => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                    {c.totalCost > 0 && (
                      <Badge variant="outline" className={`text-xs flex-shrink-0 ${gpOk ? "border-green-400 text-green-800 bg-green-50" : "border-amber-400 text-amber-800 bg-amber-50"}`}>
                        {gpOk ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                        {c.actualGpPct.toFixed(0)}% profit
                      </Badge>
                    )}
                    <div className="flex gap-0.5 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => dupLine(line.id)}><Copy className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeLine(line.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleCollapse(line.id)}>
                        {line.collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {!line.collapsed && (
                  <CardContent className="pt-0 pb-4 px-4 space-y-4">

                    {/* Model tabs */}
                    <div className="flex gap-2 flex-wrap">
                      {(["sqm", "unit", "service"] as PricingModel[]).map(m => (
                        <button key={m} onClick={() => updateLine(line.id, { model: m })}
                          className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${line.model === m ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                          {m === "sqm"     && <><Ruler   className="w-3 h-3 inline mr-1" />Per m² — print &amp; signage</>}
                          {m === "unit"    && <><Package  className="w-3 h-3 inline mr-1" />Per item — clothing, gifts, bags</>}
                          {m === "service" && <><Brush    className="w-3 h-3 inline mr-1" />Service — design, consulting</>}
                        </button>
                      ))}
                    </div>

                    {/* ── PER M² ── */}
                    {line.model === "sqm" && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Width (metres)</Label>
                          <Input type="number" step="0.01" min="0" className="h-8 mt-1 text-sm"
                            value={line.widthM || ""} onChange={e => updateLine(line.id, { widthM: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Height (metres)</Label>
                          <Input type="number" step="0.01" min="0" className="h-8 mt-1 text-sm"
                            value={line.heightM || ""} onChange={e => updateLine(line.id, { heightM: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="flex items-end pb-1">
                          <div className="bg-muted/70 rounded px-3 py-2 text-sm w-full text-center">
                            <div className="text-xs text-muted-foreground">Total area</div>
                            <div className="font-bold">{c.area.toFixed(2)} m²</div>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">How many?</Label>
                          <Input type="number" min="1" className="h-8 mt-1 text-sm"
                            value={line.qty || ""} onChange={e => updateLine(line.id, { qty: parseInt(e.target.value) || 1 })} />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs text-muted-foreground">Type of print / finish</Label>
                          <Select value={line.materialId} onValueChange={v => updateLine(line.id, { materialId: v })}>
                            <SelectTrigger className="h-8 mt-1 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {MATERIAL_META.map(m => (
                                <SelectItem key={m.id} value={m.id} className="text-xs">
                                  {m.label}{(defs.materialCosts[m.id] ?? 0) > 0 ? ` — R${defs.materialCosts[m.id]}/m²` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">What your printer charges (R per m²)</Label>
                          <Input type="number" step="0.01" min="0" className="h-8 mt-1 text-sm"
                            value={line.materialCostPerSqm || ""} onChange={e => updateLine(line.id, { materialCostPerSqm: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Ink coverage extra (%)</Label>
                          <p className="text-[10px] text-muted-foreground">e.g. 20 for heavy/dark print</p>
                          <Input type="number" step="1" min="0" max="100" className="h-8 mt-1 text-sm" placeholder="0"
                            value={line.inkCoveragePct || ""} onChange={e => updateLine(line.id, { inkCoveragePct: parseFloat(e.target.value) || 0 })} />
                        </div>
                      </div>
                    )}

                    {/* ── PER UNIT ── */}
                    {line.model === "unit" && (
                      <div className="space-y-3">
                        {supplierCatalog.length > 0 && (
                          <div className="rounded-lg border border-dashed border-primary/40 bg-primary/3 p-3">
                            <Label className="text-xs font-medium text-primary mb-1.5 block">
                              <Search className="w-3 h-3 inline mr-1" />
                              Search your supplier catalog to auto-fill the cost
                            </Label>
                            <SupplierSearch catalog={supplierCatalog} onSelect={p => handleSupplierSelect(line.id, p)} />
                            {line.linkedSupplierProductId && (
                              <p className="text-[10px] text-green-700 mt-1.5 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Linked to supplier product — cost auto-filled below
                              </p>
                            )}
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="rounded-lg bg-muted/40 p-3 space-y-3">
                            <div className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">What does each item cost you?</div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Item from supplier (R per unit)</Label>
                              <p className="text-[10px] text-muted-foreground">e.g. blank polo shirt, mug, bag</p>
                              <div className="relative mt-1">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R</span>
                                <Input type="number" step="0.01" min="0" className="h-8 pl-6 text-sm" placeholder="0.00"
                                  value={line.blankItemCost || ""} onChange={e => updateLine(line.id, { blankItemCost: parseFloat(e.target.value) || 0 })} />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Branding / decoration cost (R per unit)</Label>
                              <p className="text-[10px] text-muted-foreground">e.g. embroidery, screen print, vinyl application</p>
                              <div className="relative mt-1">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R</span>
                                <Input type="number" step="0.01" min="0" className="h-8 pl-6 text-sm" placeholder="0.00"
                                  value={line.brandingCostPerUnit || ""} onChange={e => updateLine(line.id, { brandingCostPerUnit: parseFloat(e.target.value) || 0 })} />
                              </div>
                              <Input className="h-7 mt-1 text-xs" placeholder="What type? e.g. embroidery, screen print"
                                value={line.brandingDescription} onChange={e => updateLine(line.id, { brandingDescription: e.target.value })} />
                            </div>
                            {unitTotalCost > 0 && (
                              <div className="bg-background rounded px-3 py-2 border text-xs">
                                <div className="text-muted-foreground">Your total cost per item</div>
                                <div className="text-lg font-bold">{R(unitTotalCost)}</div>
                                <div className="text-muted-foreground mt-0.5">{R(line.blankItemCost || 0)} item + {R(line.brandingCostPerUnit || 0)} branding</div>
                              </div>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">How many items?</Label>
                            <Input type="number" min="1" className="h-8 mt-1 text-sm"
                              value={line.qty || ""} onChange={e => updateLine(line.id, { qty: parseInt(e.target.value) || 1 })} />
                            {unitTotalCost > 0 && line.qty > 1 && (
                              <div className="text-xs text-muted-foreground mt-1">Total supply cost: <strong>{R(unitTotalCost * line.qty)}</strong></div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Labour (all models) ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground"><Clock className="w-3 h-3 inline mr-1" />Labour hours</Label>
                        <p className="text-[10px] text-muted-foreground">cutting, mounting, installing</p>
                        <Input type="number" step="0.5" min="0" className="h-8 mt-1 text-sm" placeholder="0"
                          value={line.laborHours || ""} onChange={e => updateLine(line.id, { laborHours: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Labour rate (R/hr)</Label>
                        <Input type="number" step="1" min="0" className="h-8 mt-1 text-sm"
                          value={line.laborRate} onChange={e => updateLine(line.id, { laborRate: parseFloat(e.target.value) || defs.defaultLaborRate })} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground"><Brush className="w-3 h-3 inline mr-1" />Design hours</Label>
                        <p className="text-[10px] text-muted-foreground">time spent on artwork</p>
                        <Input type="number" step="0.5" min="0" className="h-8 mt-1 text-sm" placeholder="0"
                          value={line.designHours || ""} onChange={e => updateLine(line.id, { designHours: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Design rate (R/hr)</Label>
                        <Input type="number" step="1" min="0" className="h-8 mt-1 text-sm"
                          value={line.designRate} onChange={e => updateLine(line.id, { designRate: parseFloat(e.target.value) || defs.defaultDesignRate })} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Fixed artwork fee (R)</Label>
                        <p className="text-[10px] text-muted-foreground">flat fee for artwork files</p>
                        <Input type="number" step="1" min="0" className="h-8 mt-1 text-sm" placeholder="0"
                          value={line.artworkFee || ""} onChange={e => updateLine(line.id, { artworkFee: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground"><Target className="w-3 h-3 inline mr-1" />Profit % you want</Label>
                        <p className="text-[10px] text-muted-foreground">
                          {clientType ? `Min for ${selectedClient?.label}: ${clientMinGP}%` : "Select client type above for guidance"}
                        </p>
                        <Input type="number" step="1" min="1" max="99" className="h-8 mt-1 text-sm"
                          value={line.targetGpPct || ""} onChange={e => updateLine(line.id, { targetGpPct: parseFloat(e.target.value) || 35 })} />
                      </div>
                    </div>

                    {/* ── Suggested price output ── */}
                    {c.totalCost > 0 && (
                      <>
                        <Separator />
                        <div className={`rounded-xl border-2 p-4 ${gpOk ? "border-green-400 bg-green-50 dark:bg-green-950/20" : "border-amber-400 bg-amber-50 dark:bg-amber-950/20"}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                {gpOk ? "✅ Suggested price to charge your client" : "⚠️ Suggested price (check profit below)"}
                              </div>
                              {line.model === "unit"    && <div className="text-3xl font-bold">{R(c.unitSell)} <span className="text-lg font-normal text-muted-foreground">per item</span></div>}
                              {line.model === "sqm"     && <div className="text-3xl font-bold">{R(c.sellPerSqm)} <span className="text-lg font-normal text-muted-foreground">per m²</span></div>}
                              {line.model === "service" && <div className="text-3xl font-bold">{R(c.totalSell)}</div>}
                              <div className="text-sm text-muted-foreground mt-1">
                                Total for this line: <strong className="text-foreground">{R(c.totalSell)}</strong>
                                {line.model === "unit" && line.qty > 1 && <span> ({line.qty} × {R(c.unitSell)})</span>}
                                {line.model === "sqm"  && <span> ({c.area.toFixed(2)} m² × {line.qty})</span>}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-xs text-muted-foreground">Your cost</div>
                              <div className="font-bold">{R(c.totalCost)}</div>
                              <div className="text-xs text-muted-foreground mt-1">Your profit</div>
                              <div className={`font-bold ${gpOk ? "text-green-700" : "text-amber-700"}`}>{R(c.gpAmount)} ({c.actualGpPct.toFixed(0)}%)</div>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {line.model !== "service" && <span className="bg-background rounded px-2 py-0.5 border">{line.model === "sqm" ? "Outsourced print" : "Supply cost"}: {R(c.materialCost)}</span>}
                            {c.laborCost  > 0 && <span className="bg-background rounded px-2 py-0.5 border">Labour: {R(c.laborCost)}</span>}
                            {c.artworkCost > 0 && <span className="bg-background rounded px-2 py-0.5 border">Artwork: {R(c.artworkCost)}</span>}
                          </div>
                        </div>
                        {!gpOk && clientType && (
                          <div className="flex gap-2 items-start p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span>
                              Profit is {c.actualGpPct.toFixed(0)}% — below the {clientMinGP}% minimum for {selectedClient?.label} clients.
                              Increase the "Profit % you want" or reduce your costs.
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                )}

                {/* Collapsed summary */}
                {line.collapsed && (
                  <CardContent className="pt-0 pb-3 px-4">
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {line.model === "sqm"  && <span>{c.area.toFixed(2)} m² × {line.qty}</span>}
                      {line.model === "unit" && <span>{line.qty} items @ {R(unitTotalCost)} cost each</span>}
                      <span>Your cost: <strong className="text-foreground">{R(c.totalCost)}</strong></span>
                      <span>Charge client: <strong className="text-foreground">{R(c.totalSell)}</strong></span>
                      <span className={gpOk ? "text-green-700 font-medium" : "text-amber-700 font-medium"}>
                        {c.actualGpPct.toFixed(0)}% profit
                      </span>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        <Button variant="outline" className="w-full mt-3 gap-2 border-dashed" onClick={addLine}>
          <Plus className="w-4 h-4" /> Add another item to this quote
        </Button>
      </div>

      {/* ── Step 4: Final summary ── */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">4</span>
            Your Quote Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-background rounded-xl p-3 border">
              <div className="text-xs text-muted-foreground">This job costs you</div>
              <div className="text-xl font-bold mt-1">{R(totals.totalCost)}</div>
            </div>
            <div className="bg-background rounded-xl p-3 border border-green-200">
              <div className="text-xs text-muted-foreground">Your profit</div>
              <div className="text-xl font-bold text-green-700 mt-1">{R(totals.gpAmount)}</div>
              <div className="text-xs text-muted-foreground">{totals.gpPct.toFixed(1)}%</div>
            </div>
            <div className="bg-background rounded-xl p-3 border">
              <div className="text-xs text-muted-foreground">To invoice (excl. VAT)</div>
              <div className="text-xl font-bold mt-1">{R(totals.totalSelling)}</div>
              {includeVat && <div className="text-xs text-muted-foreground">+ VAT {R(totals.vat)}</div>}
            </div>
            <div className="bg-primary/10 rounded-xl p-3 border-2 border-primary/30">
              <div className="text-xs font-semibold text-muted-foreground">TOTAL TO INVOICE{includeVat ? " (incl. VAT)" : ""}</div>
              <div className="text-2xl font-bold text-primary mt-1">{R(totals.grandTotal)}</div>
            </div>
          </div>

          {clientType && (
            <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${allGpOk ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
              {allGpOk
                ? <><CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Good — this quote meets the minimum {clientMinGP}% profit requirement for {selectedClient?.label} clients.</>
                : <><AlertTriangle className="w-4 h-4 flex-shrink-0" /> Some items are below the {clientMinGP}% minimum for {selectedClient?.label} clients. Scroll up and fix them.</>
              }
            </div>
          )}

          {/* Overhead coverage bar — now uses real monthly overhead from Setup tab */}
          <div className="rounded-xl border border-dashed p-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="text-sm font-semibold">How much of your monthly costs does this job cover?</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your business costs <strong>{R(monthlyOverhead)}/month</strong> to run.
                  The profit from this job covers <strong>{totals.overheadCoverage.toFixed(1)}%</strong> of that.
                  {!setup?.totalCost && (
                    <span className="text-amber-700 ml-1">
                      Enter your actual expenses in <strong>My Monthly Costs</strong> for an accurate number.
                    </span>
                  )}
                </p>
              </div>
              <div className="text-3xl font-bold text-primary flex-shrink-0">{totals.overheadCoverage.toFixed(1)}%</div>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${totals.overheadCoverage >= 100 ? "bg-green-500" : totals.overheadCoverage >= 30 ? "bg-primary" : "bg-amber-500"}`}
                style={{ width: `${Math.min(totals.overheadCoverage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>R 0</span>
              <span>{R(monthlyOverhead / 2)} (halfway)</span>
              <span>{R(monthlyOverhead)} (fully covered)</span>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Notes for this quote (optional)</Label>
            <textarea
              className="w-full mt-1 min-h-[60px] text-sm border border-input rounded-lg px-3 py-2 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Delivery instructions, payment terms, special requirements…"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button className="gap-2" onClick={() => {
              const lines_text = lines.map((l, i) => {
                const c = calcs[i];
                const price = l.model === "unit" ? `${R(c.unitSell)}/item` : l.model === "sqm" ? `${R(c.sellPerSqm)}/m²` : R(c.totalSell);
                return `${i + 1}. ${l.description || "(item)"}\n   Qty: ${l.qty}  |  Price: ${price}  |  Total: ${R(c.totalSell)}  |  Profit: ${c.actualGpPct.toFixed(0)}%`;
              }).join("\n");
              const text = [
                `QUOTE — ${jobName || "(untitled)"}`,
                `Client: ${clientName || "(no name)"}`,
                `Date: ${new Date().toLocaleDateString("en-ZA")}`,
                "",
                lines_text,
                "",
                `Amount to invoice (excl. VAT): ${R(totals.totalSelling)}`,
                includeVat ? `VAT (15%):                     ${R(totals.vat)}` : "",
                `TOTAL TO INVOICE:              ${R(totals.grandTotal)}`,
                notes ? `\nNotes:\n${notes}` : "",
              ].filter(Boolean).join("\n");
              navigator.clipboard.writeText(text).then(() => alert("Quote copied! Paste it into an email or WhatsApp."));
            }}>
              <FileText className="w-4 h-4" /> Copy quote to clipboard
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => {
              setLines([newLine(defs)]);
              setJobName(""); setClientName(""); setNotes("");
              setClientType(""); setUrgency("standard"); setEcoJob(false);
              setPmFee(defs.defaultPmFeePct); setEcoPct(defs.defaultEcoPct);
            }}>
              <RefreshCw className="w-4 h-4" /> Start a new quote
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
