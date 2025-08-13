"use client";

import { useState, useMemo } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus, Trash2, AlertTriangle } from "lucide-react";
import { saveAs } from "file-saver";

import { DuplicateBudgetModal } from "./DuplicateBudgetModal";
import { QuickAdjustModal } from "./QuickAdjustModal";
import { BudgetItemDetailModal } from "./BudgetItemDetailModal";
import BudgetCharts from "./BudgetCharts"; // NEW Highcharts version

/* ---------- helpers ---------- */
const rands = (n: number | string | undefined | null) => {
  const v = typeof n === "string" ? parseFloat(n) : Number(n ?? 0);
  if (!Number.isFinite(v)) return "R0.00";
  return `R${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

type Period = "Monthly" | "Quarterly" | "Annually" | "One-Time";
type PayFreq = "Weekly" | "Bi-Weekly" | "Monthly" | "Quarterly" | "Annually" | "One-Time" | undefined;

interface BudgetItem {
  id: string;
  category: string;
  budgeted: number;
  actual: number;
  notes?: string;
  period: Period;
  monthYear?: string;
  paymentFrequency?: PayFreq;
  dueDate?: string;
}

interface BudgetTabProps {
  budgetItems: BudgetItem[];
  onBudgetItemsChange: (items: BudgetItem[]) => void;
}

export default function BudgetTab({ budgetItems, onBudgetItemsChange }: BudgetTabProps) {
  const [newItem, setNewItem] = useState<{
    category: string;
    budgeted: number | "";
    actual: string;
    notes: string;
    period: Period;
    monthYear: string;
    paymentFrequency: PayFreq;
    dueDate?: string;
  }>({
    category: "",
    budgeted: "",
    actual: "",
    notes: "",
    period: "Monthly",
    monthYear: "",
    paymentFrequency: undefined,
    dueDate: undefined,
  });

  const [filterPeriod, setFilterPeriod] = useState<"All" | Period>("All");
  const [filterMonthYear, setFilterMonthYear] = useState("");

  // modals
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isQuickAdjustModalOpen, setIsQuickAdjustModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedBudgetItem, setSelectedBudgetItem] = useState<BudgetItem | null>(null);

  /* ---------- filtering & totals ---------- */
  const filteredItems = useMemo(
    () => budgetItems.filter(i => (filterPeriod === "All" || i.period === filterPeriod) && (!filterMonthYear || i.monthYear === filterMonthYear)),
    [budgetItems, filterPeriod, filterMonthYear]
  );

  const totalBudgeted = filteredItems.reduce((s, i) => s + (i.budgeted || 0), 0);
  const totalActual   = filteredItems.reduce((s, i) => s + (i.actual || 0), 0);
  const totalVariance = totalActual - totalBudgeted;
  const totalVariancePct = totalBudgeted > 0 ? (totalVariance / totalBudgeted) * 100 : 0;

  const availableMonthYears = useMemo(
    () => Array.from(new Set(budgetItems.map(i => i.monthYear).filter(Boolean) as string[])).sort(),
    [budgetItems]
  );

  /* ---------- charts data ---------- */
  const monthly = useMemo(() => {
    const map = new Map<string, { budgeted: number; actual: number }>();
    budgetItems.forEach(i => {
      if (!i.monthYear) return;
      const prev = map.get(i.monthYear) || { budgeted: 0, actual: 0 };
      map.set(i.monthYear, { budgeted: prev.budgeted + i.budgeted, actual: prev.actual + i.actual });
    });
    return Array.from(map, ([monthYear, v]) => ({
      monthYear, budgeted: v.budgeted, actual: v.actual, variance: v.actual - v.budgeted
    })).sort((a, b) => a.monthYear.localeCompare(b.monthYear));
  }, [budgetItems]);

  const categoriesSeries = useMemo(() => {
    const cats = Array.from(new Set(budgetItems.map(i => i.category)));
    return cats.map(cat => {
      const items = budgetItems.filter(i => i.category === cat && i.monthYear);
      const map = new Map<string, { budgeted: number; actual: number }>();
      items.forEach(i => {
        const prev = map.get(i.monthYear!) || { budgeted: 0, actual: 0 };
        map.set(i.monthYear!, { budgeted: prev.budgeted + i.budgeted, actual: prev.actual + i.actual });
      });
      const points = Array.from(map, ([monthYear, v]) => ({ monthYear, budgeted: v.budgeted, actual: v.actual }))
        .sort((a, b) => a.monthYear.localeCompare(b.monthYear));
      return { category: cat, data: points };
    }).filter(s => s.data.length > 0);
  }, [budgetItems]);

  /* ---------- CRUD ---------- */
  const addBudgetItem = () => {
    const budgetedNum = typeof newItem.budgeted === "string" ? parseFloat(newItem.budgeted) : Number(newItem.budgeted);
    const actualNum   = parseFloat(newItem.actual || "0");
    if (!newItem.category || !newItem.period || !Number.isFinite(budgetedNum)) return;

    onBudgetItemsChange([
      ...budgetItems,
      {
        id: crypto.randomUUID(),
        category: newItem.category.trim(),
        budgeted: budgetedNum || 0,
        actual: actualNum || 0,
        notes: newItem.notes?.trim(),
        period: newItem.period,
        monthYear: newItem.monthYear || undefined,
        paymentFrequency: newItem.paymentFrequency,
        dueDate: newItem.dueDate,
      },
    ]);

    setNewItem({ category: "", budgeted: "", actual: "", notes: "", period: "Monthly", monthYear: "", paymentFrequency: undefined, dueDate: undefined });
  };

  const removeItem = (id: string) => onBudgetItemsChange(budgetItems.filter(i => i.id !== id));
  const updateItem = (id: string, field: keyof BudgetItem, value: string | number | undefined) =>
    onBudgetItemsChange(budgetItems.map(i => (i.id === id ? { ...i, [field]: value } as BudgetItem : i)));

  /* ---------- export ---------- */
  const exportCSV = () => {
    const headers = ["Category","Budgeted (R)","Actual (R)","Variance (R)","Variance %","Period","Month/Year","Payment Frequency","Due Date","Notes"];
    const rows = filteredItems.map(i => {
      const variance = i.actual - i.budgeted;
      const variancePct = i.budgeted > 0 ? (variance / i.budgeted) * 100 : 0;
      return [
        i.category, i.budgeted.toFixed(2), i.actual.toFixed(2), variance.toFixed(2),
        `${variancePct.toFixed(1)}%`, i.period, i.monthYear ?? "", i.paymentFrequency ?? "", i.dueDate ?? "", (i.notes ?? "").replace(/,/g, " "),
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    saveAs(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "budget-export.csv");
  };

  const handleItemClick = (item: BudgetItem) => { setSelectedBudgetItem(item); setIsDetailModalOpen(true); };

  /* ---------- UI ---------- */
  return (
    <div className="slide-in">
      {/* Header / Filters */}
      <div className="bg-card border-b border-border px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-card-foreground">Budget Management</h2>
            <p className="text-muted-foreground mt-1">Track and manage your budget vs actual spending</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Label className="flex items-center gap-2">
              Period:
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value as "All" | Period)}
                className="border rounded px-2 py-1"
              >
                <option value="All">All</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Annually">Annually</option>
                <option value="One-Time">One-Time</option>
              </select>
            </Label>

            <Label className="flex items-center gap-2">
              Month/Year:
              <input
                type="month"
                value={filterMonthYear}
                onChange={(e) => setFilterMonthYear(e.target.value)}
                className="border rounded px-2 py-1"
              />
              {filterMonthYear && <Button variant="ghost" size="sm" onClick={() => setFilterMonthYear("")}>Clear</Button>}
            </Label>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="p-8 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="pricing-form-section">
          <CardContent className="p-6 flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Total Budgeted</p><p className="text-2xl font-bold">{rands(totalBudgeted)}</p></div>
            <Wallet className="w-6 h-6 text-primary" />
          </CardContent>
        </Card>

        <Card className="pricing-form-section">
          <CardContent className="p-6 flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Total Actual</p><p className="text-2xl font-bold">{rands(totalActual)}</p></div>
            <Wallet className="w-6 h-6 text-accent" />
          </CardContent>
        </Card>

        <Card className="pricing-form-section">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Variance</p>
              <p className={`text-2xl font-bold ${totalVariance >= 0 ? "text-destructive" : "text-success"}`}>{rands(Math.abs(totalVariance))}</p>
            </div>
            <div className={`w-12 h-12 ${totalVariance >= 0 ? "bg-destructive/10" : "bg-success/10"} rounded-full flex items-center justify-center`}>
              <AlertTriangle className={`w-6 h-6 ${totalVariance >= 0 ? "text-destructive" : "text-success"}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="pricing-form-section">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Variance %</p>
              <p className={`text-2xl font-bold ${totalVariancePct >= 0 ? "text-destructive" : "text-success"}`}>
                {totalVariancePct >= 0 ? "+" : ""}{totalVariancePct.toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-muted/10 rounded-full flex items-center justify-center"><span className="text-sm font-bold">%</span></div>
          </CardContent>
        </Card>
      </div>

      {/* ACTIONS */}
      <div className="max-w-6xl mx-auto flex gap-4 px-8 mb-6">
        <Button onClick={exportCSV} variant="outline">Export CSV</Button>
        <Button onClick={() => setIsQuickAdjustModalOpen(true)} variant="secondary">AI Quick Adjust</Button>
        <Button onClick={() => setIsDuplicateModalOpen(true)} variant="outline">Duplicate Budget</Button>
      </div>

      {/* ADD BUDGET ITEM — directly under KPIs */}
      <div className="p-8 max-w-6xl mx-auto">
        <Card className="pricing-form-section">
          <CardHeader><CardTitle className="flex items-center text-lg"><Plus className="w-5 h-5 mr-2 text-primary" />Add Budget Item</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Input id="category" value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} placeholder="e.g., Marketing" className="mt-1" />
              </div>

              <div>
                <Label htmlFor="budgeted">Budgeted Amount</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                  <Input id="budgeted" type="number" value={newItem.budgeted}
                    onChange={(e) => setNewItem({ ...newItem, budgeted: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                    className="pl-8" placeholder="0.00" step="0.01" />
                </div>
              </div>

              <div>
                <Label htmlFor="actual">Actual Amount</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                  <Input id="actual" type="number" value={newItem.actual}
                    onChange={(e) => setNewItem({ ...newItem, actual: e.target.value })}
                    className="pl-8" placeholder="0.00" step="0.01" />
                </div>
              </div>

              <div>
                <Label htmlFor="period">Period</Label>
                <select id="period" value={newItem.period}
                  onChange={(e) => {
                    const next = e.target.value as Period;
                    setNewItem({
                      ...newItem,
                      period: next,
                      monthYear: next === "One-Time" ? "" : newItem.monthYear,
                      dueDate: next !== "One-Time" ? undefined : newItem.dueDate,
                      paymentFrequency: next === "One-Time" ? undefined : newItem.paymentFrequency,
                    });
                  }}
                  className="w-full border rounded px-2 py-1 mt-1">
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Annually">Annually</option>
                  <option value="One-Time">One-Time</option>
                </select>
              </div>

              {newItem.period === "One-Time" ? (
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input id="dueDate" type="date" value={newItem.dueDate || ""} onChange={(e) => setNewItem({ ...newItem, dueDate: e.target.value })} className="mt-1" />
                </div>
              ) : (
                <div>
                  <Label htmlFor="paymentFrequency">Payment Frequency (optional)</Label>
                  <select
                    id="paymentFrequency"
                    value={newItem.paymentFrequency || ""}
                    onChange={(e) => setNewItem({ ...newItem, paymentFrequency: (e.target.value || undefined) as PayFreq })}
                    className="w-full border rounded px-2 py-1 mt-1"
                  >
                    <option value="">Select Frequency</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Bi-Weekly">Bi-Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annually">Annually</option>
                  </select>
                </div>
              )}

              {newItem.period !== "One-Time" && (
                <div>
                  <Label htmlFor="monthYear">Month/Year (optional)</Label>
                  <Input id="monthYear" type="month" value={newItem.monthYear} onChange={(e) => setNewItem({ ...newItem, monthYear: e.target.value })} className="mt-1" />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" value={newItem.notes} onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })} placeholder="Additional notes" className="mt-1" />
            </div>

            <Button onClick={addBudgetItem} disabled={!newItem.category || newItem.budgeted === "" || !newItem.period}>
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* BUDGET ITEMS LIST (under Add) */}
      <div className="p-8 max-w-6xl mx-auto">
        {filteredItems.length > 0 ? (
          <Card className="pricing-form-section">
            <CardHeader><CardTitle className="text-lg">Budget Items</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredItems.map(item => {
                  const variance = item.actual - item.budgeted;
                  const progress = item.budgeted > 0 ? (item.actual / item.budgeted) * 100 : 0;
                  return (
                    <div key={item.id} className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleItemClick(item)}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{item.category}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant={variance <= 0 ? "default" : "destructive"}>
                            {variance <= 0 ? "Under" : "Over"} {rands(Math.abs(variance))}
                          </Badge>
                          <Button
                            variant="ghost" size="sm"
                            onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <Label className="text-sm">Budgeted</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                            <Input type="number" value={item.budgeted} onChange={(e) => updateItem(item.id, "budgeted", parseFloat(e.target.value) || 0)} className="pl-8" step="0.01" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm">Actual</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                            <Input type="number" value={item.actual} onChange={(e) => updateItem(item.id, "actual", parseFloat(e.target.value) || 0)} className="pl-8" step="0.01" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm">Period</Label>
                          <select value={item.period} onChange={(e) => updateItem(item.id, "period", e.target.value as Period)} className="w-full border rounded px-2 py-1">
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Annually">Annually</option>
                            <option value="One-Time">One-Time</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-sm">Month/Year</Label>
                          <Input type="month" value={item.monthYear || ""} onChange={(e) => updateItem(item.id, "monthYear", e.target.value)} />
                        </div>
                      </div>

                      <div className="mb-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span><span>{progress.toFixed(1)}%</span>
                        </div>
                        <Progress value={Math.min(progress, 100)} className="h-2" />
                      </div>

                      {item.notes && (
                        <div className="mt-2">
                          <Label className="text-sm">Notes</Label>
                          <Input value={item.notes} onChange={(e) => updateItem(item.id, "notes", e.target.value)} placeholder="Notes" className="mt-1" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-2 border-muted-foreground/25 bg-muted/10 max-w-6xl mx-auto p-12 flex flex-col items-center justify-center">
            <Wallet className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No budget items found</h3>
            <p className="text-sm text-muted-foreground">Add or adjust filters to see budget items.</p>
          </Card>
        )}
      </div>

      {/* CHARTS — at the very bottom */}
      <div className="p-8 max-w-6xl mx-auto">
        <BudgetCharts
          monthly={monthly}
          categoriesSeries={categoriesSeries}
          currencyFormatter={rands}
        />
      </div>

      {/* Modals */}
      <DuplicateBudgetModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        onDuplicate={(src, dst) => {
          const copy = budgetItems
            .filter(i => i.monthYear === src)
            .map(i => ({ ...i, id: crypto.randomUUID(), monthYear: dst, actual: 0, notes: `Copied from ${src}` }));
          onBudgetItemsChange([...budgetItems, ...copy]);
        }}
        availablePeriods={availableMonthYears}
      />
      <QuickAdjustModal
        isOpen={isQuickAdjustModalOpen}
        onClose={() => setIsQuickAdjustModalOpen(false)}
        budgetItems={filteredItems}
        onApplySuggestions={(updated) => {
          const m = new Map(updated.map(u => [u.id, u]));
          onBudgetItemsChange(budgetItems.map(i => (m.has(i.id) ? { ...i, budgeted: m.get(i.id)!.budgeted } : i)));
        }}
      />
      <BudgetItemDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        item={selectedBudgetItem}
        historicalData={
          selectedBudgetItem
            ? monthly.map(m => ({
                monthYear: m.monthYear,
                budgeted: budgetItems.filter(b => b.category === selectedBudgetItem.category && b.monthYear === m.monthYear).reduce((s, b) => s + b.budgeted, 0),
                actual:   budgetItems.filter(b => b.category === selectedBudgetItem.category && b.monthYear === m.monthYear).reduce((s, b) => s + b.actual, 0),
              }))
            : []
        }
      />
    </div>
  );
}
