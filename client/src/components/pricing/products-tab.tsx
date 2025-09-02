// components/pricing/products-tab.tsx
import React, { useMemo, useState } from "react";
import type { PricingProduct } from "@/types/pricing";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutList, Table as TableIcon, Pencil, Copy, Trash2, BarChart2, 
  Lightbulb, TrendingDown, Download, CheckCircle,
  CircleDollarSign, Factory, LineChart, PieChart, RefreshCw
} from "lucide-react";
import HighchartsWrapper from "@/lib/HighchartsWrapper";

/* ===========================================================
   Small utils
   =========================================================== */
const fmtR = (n: number, max = 2) =>
  `R${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: max })}`;

/* ===========================================================
   Component
   =========================================================== */
type ViewMode = "table" | "cards";
type GlobalMode = "cost-plus" | "percentage";

interface ProductsTabProps {
  products: PricingProduct[];
  onProductsChange: (rows: PricingProduct[]) => void;
  fixedCost?: number;
  results: any; // Add results prop like Dashboard
  onApplyPrices: () => void;
  onExportPdf: () => void;
  onRefresh?: () => void; // Add refresh like Dashboard
}

export default function ProductsTab({
  products,
  onProductsChange,
  fixedCost = 0,
  results, // Add results prop
  onApplyPrices,
  onExportPdf,
  onRefresh, // Add refresh
}: ProductsTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [editing, setEditing] = useState<PricingProduct | null>(null);
  const [supplierFilter, setSupplierFilter] = useState<string>("all"); // Add filtering like Dashboard
  const [search, setSearch] = useState(""); // Add search like Dashboard

  /* ----------------------- helpers ----------------------- */
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

  /* ----------------------- derived (EXACTLY LIKE DASHBOARD) ----------------------- */
  // Add filtering exactly like Dashboard
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p: any) => {
      if (supplierFilter !== "all") {
        const meta = String(p.bestSupplier || "");
        const fromName = p.name?.includes(" — ") ? p.name.split(" — ").slice(-1)[0]?.trim() : "";
        const supMatch = (meta && meta === supplierFilter) || (fromName && fromName === supplierFilter);
        if (!supMatch) return false;
      }
      if (!q) return true;
      const hay = [p.name, p.sku, p.bestSupplier, p.category].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [products, supplierFilter, search]);

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

  // KPI calculations EXACTLY like Dashboard
  const kpi = useMemo(() => {
    if (!results) {
      return {
        revenue: 0,
        costFixed: 0,
        costGoods: filteredProducts.reduce((s, p: any) => s + (Number(p.costPerUnit) || 0) * (Number(p.expectedUnits) || 0), 0),
        profit: 0,
        marginPct: 0,
        unitCount: filteredProducts.reduce((s, p: any) => s + (Number(p.expectedUnits) || 0), 0),
      };
    }
    const revenue = results.totalRevenue || 0;
    const costFixed = results.actualCost || 0; // "Total Fixed Costs" from Setup
    const costGoods = (results.calculatedProducts || []).reduce((s, p) => s + (p.costPerUnit * p.expectedUnits), 0);
    const profit = results.calculatedProfit || (revenue - costFixed - costGoods);
    const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;
    const unitCount = (results.calculatedProducts || []).reduce((s, p) => s + p.expectedUnits, 0);

    return { revenue, costFixed, costGoods, profit, marginPct, unitCount };
  }, [results, filteredProducts]);

  // Product breakdown EXACTLY like Dashboard
  const productBreaks = useMemo(() => {
    const list = (results?.calculatedProducts || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      revenue: p.totalRevenue,
      margin: p.profitMargin,
      profit: p.totalRevenue - p.costPerUnit * p.expectedUnits,
    }));
    // Top by revenue for charts
    const topRevenue = [...list].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    return { list, topRevenue };
  }, [results]);

  /* ----------------------- pagination ----------------------- */
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (pageClamped - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, pageClamped, pageSize]);

  /* ----------------------- charts (EXACTLY LIKE DASHBOARD) ----------------------- */
  // Treemap: Revenue / Costs / Profit
  const treemapOptions: Highcharts.Options = {
    chart: { type: "treemap", height: 320, backgroundColor: "transparent" },
    title: { text: null },
    series: [{
      type: "treemap",
      layoutAlgorithm: "squarified",
      data: [
        { name: "Revenue", value: kpi.revenue, color: "#22C55E" },
        { name: "Fixed Costs", value: kpi.costFixed, color: "#EF4444" },
        { name: "Product Costs", value: kpi.costGoods, color: "#F97316" },
        { name: "Profit", value: Math.max(kpi.profit, 0), color: "#3B82F6" },
      ],
      dataLabels: {
        enabled: true,
        formatter() {
          const v = (this.point as any).value || 0;
          return `<b>${this.key}</b><br>${fmtR(v)}`;
        },
        style: { textOutline: "none", fontWeight: "bold" },
      },
      tooltip: {
        useHTML: true,
        pointFormatter() {
          return `<b>${this.name}:</b> ${fmtR(this.value as number)}`;
        }
      }
    }]
  };

  // Packed Bubble: Product revenue contribution
  const packedBubbleOptions: Highcharts.Options = {
    chart: { type: "packedbubble", height: 320, backgroundColor: "transparent" },
    title: { text: null },
    tooltip: { useHTML: true, pointFormat: "<b>{point.name}:</b> {point.z:,.0f}" },
    plotOptions: {
      packedbubble: {
        minSize: "30%",
        maxSize: "120%",
        zMin: 0,
        zMax: Math.max(1, ...productBreaks.list.map((d) => d.revenue || 0)),
        layoutAlgorithm: { gravitationalConstant: 0.06, parentNodeLimit: true },
        dataLabels: {
          enabled: true,
          formatter() {
            const z = (this.point as any).z || 0;
            const zMax = (packedBubbleOptions.plotOptions as any).packedbubble.zMax || 1;
            return z > 0.09 * zMax ? this.point.name : "";
          },
          style: { textOutline: "none", fontSize: "11px" }
        }
      }
    },
    series: [{
      type: "packedbubble",
      name: "Revenue",
      data: (results?.calculatedProducts || []).map((p: any) => ({ name: p.name, value: p.totalRevenue, z: p.totalRevenue }))
    }]
  };

  // Solid Gauge: Overall margin
  const gaugeOptions: Highcharts.Options = {
    chart: { type: "solidgauge", height: 260, backgroundColor: "transparent" },
    title: { text: null },
    tooltip: { enabled: false },
    pane: {
      startAngle: -90, endAngle: 90,
      background: [{ outerRadius: "100%", innerRadius: "60%", shape: "arc" }]
    },
    yAxis: {
      min: -50, max: 60,
      stops: [
        [0.2, "#EF4444"], // red
        [0.5, "#F59E0B"], // amber
        [0.8, "#22C55E"], // green
      ],
      lineWidth: 0, tickWidth: 0, minorTickInterval: 0,
      labels: { enabled: false }
    },
    plotOptions: {
      solidgauge: {
        dataLabels: {
          y: -10,
          borderWidth: 0,
          useHTML: true,
          format: `<div style="text-align:center">
                     <div style="font-size:22px;font-weight:700">{y:.1f}%</div>
                     <div style="font-size:12px;color:#888">Overall Margin</div>
                   </div>`
        }
      }
    },
    series: [{ type: "solidgauge", data: [{ y: kpi.marginPct }] }]
  };

  // Column: Top products by revenue
  const topProductsColumn: Highcharts.Options = {
    chart: { type: "column", height: 320, backgroundColor: "transparent" },
    title: { text: null },
    xAxis: {
      categories: productBreaks.topRevenue.map(p => p.name),
      labels: { style: { fontSize: "11px" } }
    },
    yAxis: {
      title: { text: null },
      labels: { formatter() { return fmtR(this.value as number, 0); } }
    },
    legend: { enabled: false },
    tooltip: {
      pointFormatter() { return `<b>${fmtR(this.y as number)}</b>`; }
    },
    series: [{
      type: "column",
      data: productBreaks.topRevenue.map(p => p.revenue),
      color: "#3B82F6",
    }]
  };

  /* --------------------------- UI (EXACTLY LIKE DASHBOARD) ----------------------------- */
  return (
    <div className="slide-in">
      {/* HEADER (EXACTLY LIKE DASHBOARD) */}
      <div className="bg-card border-b border-border px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-card-foreground">Pricing Results</h2>
            <p className="text-muted-foreground mt-1">Review your calculated prices and profitability.</p>
          </div>
          <div className="flex gap-2">
            {onRefresh && (
              <Button variant="outline" onClick={onRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            )}
            <Button variant="outline" onClick={onApplyPrices}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply Prices
            </Button>
            <Button variant="outline" onClick={onExportPdf}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Filters (EXACTLY LIKE DASHBOARD) */}
      <div className="px-6 pt-4">
        <div className="max-w-7xl mx-auto">
          <Card className="pricing-form-section">
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
              <CardDescription>Scope the results to a supplier or search across products.</CardDescription>
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
              <div className="md:col-span-8">
                <Label>Search</Label>
                <Input
                  className="mt-1"
                  value={search}
                  onChange={(e) => (setSearch(e.target.value))}
                  placeholder="Search product / SKU / category / supplier"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* KPI Cards (EXACTLY LIKE DASHBOARD) */}
     <div className="px-6 pt-6">
  <div className="max-w-7xl mx-auto flex flex-nowrap gap-4 overflow-x-auto pb-4">
    <Card className="pricing-summary-card min-w-[240px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CircleDollarSign className="w-4 h-4 text-green-600" />
          Total Revenue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{fmtR(kpi.revenue)}</div>
      </CardContent>
    </Card>

    <Card className="pricing-summary-card min-w-[240px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Factory className="w-4 h-4 text-orange-500" />
          Product Costs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{fmtR(kpi.costGoods)}</div>
      </CardContent>
    </Card>

    <Card className="pricing-summary-card min-w-[240px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Factory className="w-4 h-4 text-red-500" />
          Fixed Costs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{fmtR(kpi.costFixed)}</div>
      </CardContent>
    </Card>

    <Card className="pricing-summary-card min-w-[240px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <LineChart className="w-4 h-4 text-blue-600" />
          Net Profit
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${kpi.profit >= 0 ? "text-foreground" : "text-destructive"}`}>
          {fmtR(kpi.profit)}
        </div>
      </CardContent>
    </Card>

    <Card className="pricing-summary-card min-w-[240px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <PieChart className="w-4 h-4 text-emerald-600" />
          Margin %
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{kpi.marginPct.toFixed(1)}%</div>
      </CardContent>
    </Card>

    <Card className="pricing-summary-card min-w-[240px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-indigo-600" />
          Units (Total)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{(kpi.unitCount || 0).toLocaleString()}</div>
      </CardContent>
    </Card>
  </div>
</div>

      {/* Product table */}
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <Card className="pricing-table-section">
            <CardHeader>
              <CardTitle>Product Pricing Breakdown</CardTitle>
              <CardDescription>Detailed pricing and profitability for each product.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr className="text-left">
                      <th className="px-3 py-2">Product Name</th>
                      <th className="px-3 py-2">Cost / Unit</th>
                      <th className="px-3 py-2">On‑hand</th>
                      <th className="px-3 py-2">Suggested Price</th>
                      <th className="px-3 py-2">Total Revenue</th>
                      <th className="px-3 py-2">Profit / Unit</th>
                      <th className="px-3 py-2">Profit Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(results?.calculatedProducts || []).map((p: any) => {
                      // Ensure we're using the proper calculated values
                      const costPerUnit = parseFloat(p.costPerUnit) || 0;
                      const units = parseInt(p.expectedUnits) || 0;
                      const price = parseFloat(p.price) || 0;
                      const totalRevenue = price * units;
                      const profitPerUnit = price - costPerUnit;
                      const profitMargin = price > 0 ? ((profitPerUnit / price) * 100) : 0;
                      
                      return (
                        <tr key={String(p.id)} className="border-t hover:bg-muted/40">
                          <td className="px-3 py-2 font-medium">{p.name}</td>
                          <td className="px-3 py-2">{fmtR(costPerUnit)}</td>
                          <td className="px-3 py-2">{units}</td>
                          <td className="px-3 py-2">{fmtR(price)}</td>
                          <td className="px-3 py-2">{fmtR(totalRevenue)}</td>
                          <td className="px-3 py-2">{fmtR(profitPerUnit)}</td>
                          <td className="px-3 py-2">
                            {isFinite(profitMargin) ? `${profitMargin.toFixed(2)}%` : "-"}
                          </td>
                        </tr>
                      );
                    })}
                    {(!results?.calculatedProducts || results.calculatedProducts.length === 0) && (
                      <tr>
                        <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                          No products to display.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts (EXACTLY LIKE DASHBOARD) */}
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="pricing-chart-section">
            <CardHeader>
              <CardTitle className="text-lg">Financial Mix</CardTitle>
              <CardDescription>Compare revenue, fixed costs, product costs and profit.</CardDescription>
            </CardHeader>
            <CardContent>
              {(kpi.revenue + kpi.costFixed + kpi.costGoods) === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                  No data to plot.
                </div>
              ) : (
                <HighchartsWrapper options={treemapOptions} />
              )}
            </CardContent>
          </Card>

          <Card className="pricing-chart-section">
            <CardHeader>
              <CardTitle className="text-lg">Overall Margin</CardTitle>
              <CardDescription>Solid gauge of current overall margin %.</CardDescription>
            </CardHeader>
            <CardContent>
              <HighchartsWrapper options={gaugeOptions} />
            </CardContent>
          </Card>

          <Card className="pricing-chart-section">
            <CardHeader>
              <CardTitle className="text-lg">Product Revenue Distribution</CardTitle>
              <CardDescription>Relative contribution by product (bubble size = revenue).</CardDescription>
            </CardHeader>
            <CardContent>
              {(results?.calculatedProducts?.length ?? 0) === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                  No products to plot.
                </div>
              ) : (
                <HighchartsWrapper options={packedBubbleOptions} />
              )}
            </CardContent>
          </Card>

          <Card className="pricing-chart-section">
            <CardHeader>
              <CardTitle className="text-lg">Top Products by Revenue</CardTitle>
              <CardDescription>Your best sellers (top 10).</CardDescription>
            </CardHeader>
            <CardContent>
              {productBreaks.topRevenue.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                  No products to plot.
                </div>
              ) : (
                <HighchartsWrapper options={topProductsColumn} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* EDIT DIALOG */}
      {editing && (
        <Dialog open={true} onOpenChange={() => setEditing(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>Adjust fields and save.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Name</Label>
                <Input
                  className="h-9 mt-1"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Cost / Unit (R)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                  <Input
                    className="pl-6 h-9"
                    type="number"
                    step="0.01"
                    value={editing.costPerUnit || 0}
                    onChange={(e) =>
                      setEditing({ ...editing, costPerUnit: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>On‑hand</Label>
                <Input
                  className="h-9 mt-1"
                  type="number"
                  value={editing.expectedUnits || 0}
                  onChange={(e) =>
                    setEditing({ ...editing, expectedUnits: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label>Suggested Price</Label>
                <div className="relative mt-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                  <Input
                    className="pl-6 h-9"
                    type="number"
                    step="0.01"
                    value={editing.price || 0}
                    onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label>Method</Label>
                <Select
                  value={editing.calculationMethod || "cost-plus"}
                  onValueChange={(v) => setEditing({ ...editing, calculationMethod: v as GlobalMode })}
                >
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue />
                  </SelectTrigger>
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
                  onChange={(e) =>
                    setEditing({ ...editing, revenuePercentage: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              {String(editing.id).startsWith("custom-") && (
                <div className="md:col-span-2">
                  <Badge variant="secondary">Custom Item</Badge>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onProductsChange(
                    products.map((p) => (String(p.id) === String(editing.id) ? editing : p))
                  );
                  setEditing(null);
                }}
              >
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}