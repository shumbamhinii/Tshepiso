import React, { useState, useEffect, useMemo, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle2, Plus, Search, X, Info, Leaf } from "lucide-react";

/* ─── Client types ────────────────────────────────────────────────── */
const CLIENT_TYPE_META = [
  { value: "corporate",  label: "Big Company / Corporate",   minGPKey: "corporateMinGP",  defaultMinGP: 35, deposit: "Negotiate deposit — get sign-off before starting." },
  { value: "government", label: "Government / SOE",          minGPKey: "governmentMinGP", defaultMinGP: 25, deposit: "Get a Purchase Order (PO) before lifting a finger." },
  { value: "retail",     label: "Shop / Retailer",           minGPKey: "retailMinGP",     defaultMinGP: 30, deposit: "Require 50% deposit upfront." },
  { value: "smme",       label: "Small Business (SMME)",     minGPKey: "smmeMinGP",       defaultMinGP: 45, deposit: "Require 70% deposit upfront." },
  { value: "reseller",   label: "Reseller / Agent",          minGPKey: "resellerMinGP",   defaultMinGP: 15, deposit: "Require 70% deposit upfront." },
] as const;

/* ─── Job categories ──────────────────────────────────────────────── */
const CATEGORY_META = [
  { value: "large-format-inhouse",    label: "Banner / Poster (own printer)",     model: "sqm",     defaultGP: 55 },
  { value: "large-format-outsourced", label: "Banner / Poster (send to printer)", model: "sqm",     defaultGP: 47 },
  { value: "signage",                 label: "Signage / Board",                   model: "sqm",     defaultGP: 47 },
  { value: "corporate-clothing",      label: "Branded Clothing",                  model: "unit",    defaultGP: 42 },
  { value: "promotional-gifts",       label: "Promotional Gifts",                 model: "unit",    defaultGP: 50 },
  { value: "eco-products",            label: "Eco-Friendly Products",             model: "unit",    defaultGP: 65 },
  { value: "paper-bags",              label: "Paper Bags",                        model: "unit",    defaultGP: 57 },
  { value: "felt-bags",               label: "Felt Bags",                         model: "unit",    defaultGP: 70 },
  { value: "laser-engraving",         label: "Laser Engraving",                   model: "unit",    defaultGP: 65 },
  { value: "branding-design",         label: "Design / Branding Services",        model: "service", defaultGP: 70 },
  { value: "event-branding",          label: "Event Branding / Activations",      model: "service", defaultGP: 55 },
  { value: "other",                   label: "Something else",                    model: "unit",    defaultGP: 40 },
] as const;

/* ─── Rush / urgency surcharges ───────────────────────────────────── */
const URGENCY_META = [
  { value: "standard", label: "Standard turnaround",    surchargeKey: null,                   defaultSurcharge: 0  },
  { value: "48h",      label: "Rush — 48 hours",        surchargeKey: "rush48hSurcharge",     defaultSurcharge: 15 },
  { value: "24h",      label: "Rush — 24 hours",        surchargeKey: "rush24hSurcharge",     defaultSurcharge: 25 },
  { value: "same-day", label: "Same-day delivery",      surchargeKey: "rushSameDaySurcharge", defaultSurcharge: 40 },
] as const;


interface SupplierProduct {
  id?: number;
  supplierName: string;
  productName: string;
  sku?: string | null;
  unit?: string | null;
  price: string | number;
}

function MiniSupplierSearch({ catalog, onSelect }: {
  catalog: SupplierProduct[];
  onSelect: (p: SupplierProduct) => void;
}) {
  const [query, setQuery] = useState("");
  const [open,  setOpen]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    return catalog
      .filter(p => [p.productName, p.sku, p.supplierName].filter(Boolean).join(" ").toLowerCase().includes(q))
      .slice(0, 6);
  }, [catalog, q]);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          className="pl-8 text-sm"
          placeholder="Search supplier catalog to auto-fill cost…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => { setQuery(""); setOpen(false); }}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map((p, i) => (
            <button
              key={`${p.id ?? i}`}
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex gap-2 border-b last:border-0"
              onMouseDown={e => { e.preventDefault(); onSelect(p); setQuery(""); setOpen(false); }}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.productName}</div>
                <div className="text-muted-foreground">{p.supplierName}{p.unit ? ` · ${p.unit}` : ""}</div>
              </div>
              <div className="font-bold text-primary flex-shrink-0">
                R {(typeof p.price === "number" ? p.price : parseFloat(String(p.price)) || 0).toFixed(2)}
              </div>
            </button>
          ))}
        </div>
      )}
      {open && q && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-lg shadow-lg px-3 py-2 text-xs text-muted-foreground">
          No supplier products found for "{query}"
        </div>
      )}
    </div>
  );
}

/* ─── Public types ────────────────────────────────────────────────── */
export interface PricedLineItem {
  name: string;
  qty: number;
  unitSell: number;
  unitCost: number;
  notes: string;
  clientType: string;
  depositTip: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (item: PricedLineItem) => void;
}

/* ─── Main component ─────────────────────────────────────────────── */
export function QuickPricerSheet({ open, onOpenChange, onConfirm }: Props) {
  const [defs, setDefs] = useState({
    monthlyOverhead:        94_710,
    monthlyProfitTarget:    60_000,
    defaultLaborRate:       120,
    defaultDesignRate:      450,
    defaultPmFeePct:        0,
    rush48hSurcharge:       15,
    rush24hSurcharge:       25,
    rushSameDaySurcharge:   40,
    corporateMinGP:         35,
    governmentMinGP:        25,
    retailMinGP:            30,
    smmeMinGP:              45,
    resellerMinGP:          15,
    categoryGPs:   {} as Record<string, number>,
    materialCosts: {} as Record<string, number>,
  });

  const [catalog, setCatalog] = useState<SupplierProduct[]>([]);

  useEffect(() => {
    fetch("/api/quote-config", { headers: { Accept: "application/json" } })
      .then(r => r.ok ? r.json() : {})
      .then((data: any) => {
        if (data && typeof data === "object") setDefs(d => ({ ...d, ...data }));
      })
      .catch(() => {});
    fetch("/api/suppliers", { headers: { Accept: "application/json" } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setCatalog(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // ── Form state ─────────────────────────────────────────────────────
  const [description,    setDescription]    = useState("");
  const [clientType,     setClientType]     = useState("smme");
  const [urgency,        setUrgency]        = useState("standard");
  const [category,       setCategory]       = useState("large-format-inhouse");
  const [qty,            setQty]            = useState(1);
  const [model,          setModel]          = useState<"sqm" | "unit" | "service">("sqm");

  // sqm mode
  const [widthM,          setWidthM]          = useState(1);
  const [heightM,         setHeightM]         = useState(1);
  const [printCostPerSqm, setPrintCostPerSqm] = useState(55);

  // unit mode
  const [blankCost,    setBlankCost]    = useState(0);
  const [brandingCost, setBrandingCost] = useState(0);

  // labour + design
  const [laborHours,  setLaborHours]  = useState(0);
  const [designHours, setDesignHours] = useState(0);

  // delivery, PM fee, eco premium
  const [deliveryCost,  setDeliveryCost]  = useState(0);
  const [pmFeePct,      setPmFeePct]      = useState(0);
  const [ecoPremiumPct, setEcoPremiumPct] = useState(20);

  // GP target + override
  const [targetGP,     setTargetGP]     = useState(55);
  const [overrideSell, setOverrideSell] = useState("");

  // ── Derived: minimum GP floor for selected client type ────────────
  const clientMeta = CLIENT_TYPE_META.find(c => c.value === clientType) ?? CLIENT_TYPE_META[0];
  const minGP      = (defs as any)[clientMeta.minGPKey] ?? clientMeta.defaultMinGP;

  // ── Derived: urgency surcharge ────────────────────────────────────
  const urgencyMeta = URGENCY_META.find(u => u.value === urgency) ?? URGENCY_META[0];
  const surcharge   = urgencyMeta.surchargeKey ? ((defs as any)[urgencyMeta.surchargeKey] ?? urgencyMeta.defaultSurcharge) : 0;
  const effectiveGP = Math.min(Math.max(targetGP, minGP) + surcharge, 99);

  // ── Sync category → model + GP target + eco premium default ──────
  useEffect(() => {
    const cat = CATEGORY_META.find(c => c.value === category);
    if (!cat) return;
    setModel(cat.model as any);
    const savedGP = (defs.categoryGPs as Record<string, number>)[category];
    setTargetGP(savedGP ?? cat.defaultGP);
    if (category === "eco-products") setEcoPremiumPct(p => p || 20);
  }, [category, defs.categoryGPs]);

  // ── Sync PM fee default from config (once on load) ───────────────
  useEffect(() => {
    setPmFeePct(Number(defs.defaultPmFeePct) || 0);
  }, [defs.defaultPmFeePct]);

  const handleSupplierSelect = (p: SupplierProduct) => {
    const price = typeof p.price === "number" ? p.price : parseFloat(String(p.price)) || 0;
    setBlankCost(price);
    if (!description.trim()) setDescription(p.productName);
  };

  // ── Core calculation ──────────────────────────────────────────────
  const calc = useMemo(() => {
    const q = Math.max(qty, 1);
    let materialCost = 0;

    if (model === "sqm") {
      const area = (widthM || 0) * (heightM || 0);
      materialCost = area * (printCostPerSqm || 0) * q;
    } else if (model === "unit") {
      materialCost = ((blankCost || 0) + (brandingCost || 0)) * q;
    }

    const laborCost   = (laborHours  || 0) * (defs.defaultLaborRate  || 120);
    const designCost_ = (designHours || 0) * (defs.defaultDesignRate || 450);
    const totalCost   = materialCost + laborCost + designCost_;

    const gpDecimal     = effectiveGP / 100;
    const baseTotalSell = gpDecimal < 1 ? totalCost / (1 - gpDecimal) : totalCost * 2;

    // Eco premium: charged on top of the GP-calculated price (not a cost to the business)
    const ecoPremiumAmt = (category === "eco-products" && (ecoPremiumPct || 0) > 0)
      ? baseTotalSell * ((ecoPremiumPct || 0) / 100)
      : 0;

    const totalSell = baseTotalSell + ecoPremiumAmt;

    // PM fee is a separate charge (% of total sell), not a material cost
    const pmFeeAmt = (pmFeePct || 0) > 0 ? totalSell * ((pmFeePct || 0) / 100) : 0;

    const unitSell = q > 0 ? totalSell / q : 0;
    const unitCost = q > 0 ? totalCost / q : 0;

    return { totalCost, totalSell, unitSell, unitCost, ecoPremiumAmt, pmFeeAmt };
  }, [model, qty, widthM, heightM, printCostPerSqm, blankCost, brandingCost,
      laborHours, designHours, effectiveGP, defs, category, ecoPremiumPct, pmFeePct]);

  const finalUnitSell = overrideSell !== "" ? (parseFloat(overrideSell) || 0) : calc.unitSell;
  const isBelowCost   = finalUnitSell < calc.unitCost && calc.unitCost > 0;
  const isBelowMinGP  = overrideSell !== "" && calc.unitCost > 0
    ? (1 - calc.unitCost / finalUnitSell) * 100 < minGP
    : false;
  const actualGP = finalUnitSell > 0 && calc.unitCost > 0
    ? (1 - calc.unitCost / finalUnitSell) * 100
    : effectiveGP;
  const gpBelowTarget = targetGP < minGP;

  // GP contribution this job adds toward monthly overhead + profit target
  const jobGPContribution = (finalUnitSell - calc.unitCost) * Math.max(qty, 1);

  const reset = () => {
    setDescription(""); setClientType("smme"); setUrgency("standard");
    setCategory("large-format-inhouse"); setQty(1);
    setWidthM(1); setHeightM(1); setPrintCostPerSqm(55);
    setBlankCost(0); setBrandingCost(0);
    setLaborHours(0); setDesignHours(0);
    setDeliveryCost(0); setPmFeePct(Number(defs.defaultPmFeePct) || 0);
    setEcoPremiumPct(20); setOverrideSell("");
  };

  const handleConfirm = () => {
    if (!description.trim()) return;
    const catLabel = CATEGORY_META.find(c => c.value === category)?.label ?? category;

    // Main line item
    onConfirm({
      name:       description.trim(),
      qty,
      unitSell:   finalUnitSell,
      unitCost:   calc.unitCost,
      notes:      catLabel,
      clientType,
      depositTip: clientMeta.deposit,
    });

    // Delivery as a separate line (strategy: "always charge separately")
    if (deliveryCost > 0) {
      onConfirm({
        name:       "Delivery / Transport",
        qty:        1,
        unitSell:   deliveryCost,
        unitCost:   deliveryCost,
        notes:      "Delivery charge",
        clientType,
        depositTip: "",
      });
    }

    // PM fee as a separate line (strategy: "never hide inside product pricing")
    if (calc.pmFeeAmt > 0) {
      onConfirm({
        name:       "Project Management Fee",
        qty:        1,
        unitSell:   calc.pmFeeAmt,
        unitCost:   0,
        notes:      `${pmFeePct}% of job total`,
        clientType,
        depositTip: "",
      });
    }

    reset();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle>Price a Line Item</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Fill in who the client is and what the job involves — the system calculates a price that protects your margin.
          </p>
        </SheetHeader>

        <div className="space-y-4">

          {/* ── Section 1: Who is this for? ──────────────────────────── */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Who is this job for?</p>

            <div className="space-y-1.5">
              <Label>Client Type</Label>
              <Select value={clientType} onValueChange={setClientType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPE_META.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label} <span className="text-muted-foreground text-xs">— min {(defs as any)[c.minGPKey] ?? c.defaultMinGP}% GP</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span><strong>Deposit tip:</strong> {clientMeta.deposit}</span>
            </div>

            <div className="space-y-1.5">
              <Label>Urgency / Turnaround</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {URGENCY_META.map(u => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                      {u.defaultSurcharge > 0 && (
                        <span className="text-muted-foreground text-xs ml-1">(+{surcharge}% GP surcharge)</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* ── Section 2: What is the job? ──────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Input
              placeholder="e.g. 3×2m Outdoor Vinyl Banner"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Job Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORY_META.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input
              type="number" min={1}
              value={qty}
              onChange={e => setQty(parseInt(e.target.value) || 1)}
            />
          </div>

          <Separator />

          {/* ── Section 3: Costs ─────────────────────────────────────── */}
          {model === "sqm" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Width (m)</Label>
                  <Input type="number" step="0.1" min={0} value={widthM}
                    onChange={e => setWidthM(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Height (m)</Label>
                  <Input type="number" step="0.1" min={0} value={heightM}
                    onChange={e => setHeightM(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>What your printer charges (R per m²)</Label>
                <Input type="number" step="1" min={0} value={printCostPerSqm}
                  onChange={e => setPrintCostPerSqm(parseFloat(e.target.value) || 0)} />
                <p className="text-xs text-muted-foreground">Area: {(widthM * heightM).toFixed(2)} m²</p>
              </div>
            </div>
          )}

          {model === "unit" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Search supplier catalog</Label>
                <MiniSupplierSearch catalog={catalog} onSelect={handleSupplierSelect} />
              </div>
              <div className="space-y-1.5">
                <Label>Blank item cost from supplier (R per unit)</Label>
                <Input type="number" step="0.01" min={0} placeholder="0.00"
                  value={blankCost || ""}
                  onChange={e => setBlankCost(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label>Branding / decoration cost per unit (R)</Label>
                <Input type="number" step="0.01" min={0} placeholder="0.00"
                  value={brandingCost || ""}
                  onChange={e => setBrandingCost(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          )}

          {model === "service" && (
            <p className="text-sm text-muted-foreground bg-muted rounded p-3">
              Service job — add labour and design hours below to calculate cost.
            </p>
          )}

          {/* Labour + design */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Labour hours</Label>
              <Input type="number" step="0.5" min={0} placeholder="0"
                value={laborHours || ""}
                onChange={e => setLaborHours(parseFloat(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground">@ R{defs.defaultLaborRate}/hr</p>
            </div>
            <div className="space-y-1.5">
              <Label>Design hours</Label>
              <Input type="number" step="0.5" min={0} placeholder="0"
                value={designHours || ""}
                onChange={e => setDesignHours(parseFloat(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground">@ R{defs.defaultDesignRate}/hr</p>
            </div>
          </div>

          {/* Delivery + PM fee — always visible */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Delivery / Transport (R)</Label>
              <Input type="number" step="1" min={0} placeholder="0"
                value={deliveryCost || ""}
                onChange={e => setDeliveryCost(parseFloat(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground">Added as a separate line</p>
            </div>
            <div className="space-y-1.5">
              <Label>PM Fee %</Label>
              <Input type="number" step="1" min={0} max={25} placeholder="0"
                value={pmFeePct || ""}
                onChange={e => setPmFeePct(parseFloat(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground">5–18% typical · separate line</p>
            </div>
          </div>

          {/* Eco premium — only shown for eco-products */}
          {category === "eco-products" && (
            <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded p-3">
              <Leaf className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
              <div className="flex-1 space-y-1.5">
                <Label className="text-green-800">Eco / Sustainability Premium (%)</Label>
                <Input
                  type="number" step="1" min={0} max={50}
                  value={ecoPremiumPct}
                  onChange={e => setEcoPremiumPct(parseFloat(e.target.value) || 0)}
                  className="bg-white"
                />
                <p className="text-xs text-green-700">
                  Clients pay a premium for eco-friendly branding. Strategy guide: 15–30%.
                  Applied on top of the GP-calculated price.
                </p>
              </div>
            </div>
          )}

          {/* ── GP target ────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>
              Target GP%
              <span className="text-muted-foreground font-normal text-xs ml-1">(category default)</span>
            </Label>
            <Input
              type="number" step="1" min={1} max={99}
              value={targetGP}
              onChange={e => setTargetGP(parseFloat(e.target.value) || 35)}
              className={gpBelowTarget ? "border-amber-400" : ""}
            />
            {gpBelowTarget && (
              <p className="text-xs text-amber-700">
                Raised to {minGP}% — {clientMeta.label} minimum. Your target of {targetGP}% is below the floor.
              </p>
            )}
            {surcharge > 0 && (
              <p className="text-xs text-blue-700">
                +{surcharge}% rush surcharge → effective GP: <strong>{effectiveGP}%</strong>
              </p>
            )}
          </div>

          <Separator />

          {/* ── Result box ───────────────────────────────────────────── */}
          {calc.totalCost > 0 && (
            <div className="rounded-lg bg-muted p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Total cost ({qty} unit{qty > 1 ? "s" : ""})</span>
                <span>R {calc.totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Cost per unit</span>
                <span>R {calc.unitCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Effective GP</span>
                <span>
                  {effectiveGP}%
                  {surcharge > 0 ? ` (${targetGP}% + ${surcharge}% rush)` : ""}
                  {gpBelowTarget ? ` (floor: ${minGP}%)` : ""}
                </span>
              </div>
              {calc.ecoPremiumAmt > 0 && (
                <div className="flex justify-between text-green-700 text-xs">
                  <span>Eco premium ({ecoPremiumPct}%)</span>
                  <span>+R {calc.ecoPremiumAmt.toFixed(2)}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold text-green-700">
                <span>Recommended unit price</span>
                <span>R {calc.unitSell.toFixed(2)}</span>
              </div>
              {calc.pmFeeAmt > 0 && (
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>+ PM fee ({pmFeePct}%) — separate line</span>
                  <span>R {calc.pmFeeAmt.toFixed(2)}</span>
                </div>
              )}
              {deliveryCost > 0 && (
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>+ Delivery — separate line</span>
                  <span>R {deliveryCost.toFixed(2)}</span>
                </div>
              )}
              {/* GP contribution this job puts toward monthly target */}
              {jobGPContribution > 0 && (
                <div className="mt-1 text-xs rounded px-2 py-1.5 bg-muted text-muted-foreground">
                  GP contribution: <strong>R {jobGPContribution.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</strong> toward your R {(defs.monthlyOverhead + defs.monthlyProfitTarget).toLocaleString("en-ZA")} monthly target
                </div>
              )}
            </div>
          )}

          {calc.totalCost === 0 && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-center text-muted-foreground">
              Enter costs above to see the recommended selling price
            </div>
          )}

          {/* ── Final price (editable override) ─────────────────────── */}
          <div className="space-y-1.5">
            <Label>
              Final unit price to charge client
              {calc.unitSell > 0 && (
                <span className="text-muted-foreground font-normal text-xs ml-1">
                  (suggested: R {calc.unitSell.toFixed(2)})
                </span>
              )}
            </Label>
            <Input
              type="number" step="0.01" min={0}
              placeholder={calc.unitSell > 0 ? calc.unitSell.toFixed(2) : "Enter price"}
              value={overrideSell}
              onChange={e => setOverrideSell(e.target.value)}
            />

            {isBelowCost && (
              <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Below cost (R {calc.unitCost.toFixed(2)}/unit) — you'll <strong>lose R {(calc.unitCost - finalUnitSell).toFixed(2)} per unit</strong>
                  {qty > 1 ? ` (R ${((calc.unitCost - finalUnitSell) * qty).toFixed(2)} total)` : ""}.
                </span>
              </div>
            )}

            {!isBelowCost && isBelowMinGP && (
              <div className="flex items-start gap-2 text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded p-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  This gives {actualGP.toFixed(1)}% GP — below the {minGP}% minimum for {clientMeta.label} clients.
                  You're covered, but leaving money on the table.
                </span>
              </div>
            )}

            {!isBelowCost && !isBelowMinGP && finalUnitSell > 0 && calc.unitCost > 0 && (
              <div className="flex items-center gap-1.5 text-green-700 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>{actualGP.toFixed(1)}% gross profit — above the {minGP}% minimum for this client</span>
              </div>
            )}
          </div>

          <Button
            className="w-full mt-2"
            onClick={handleConfirm}
            disabled={!description.trim() || finalUnitSell <= 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add to Quotation (R {(finalUnitSell * qty).toFixed(2)} total)
          </Button>

          <p className="text-xs text-center text-muted-foreground pb-2">
            You can still adjust the unit price in the quotation form after adding.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
