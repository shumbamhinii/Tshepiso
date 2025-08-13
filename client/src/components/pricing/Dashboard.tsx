"use client";

import { useMemo, useState } from "react";
import HighchartsWrapper from "@/lib/HighchartsWrapper";
import type { PricingResults, PricingProduct } from "@/types/pricing";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart2, CircleDollarSign, Factory, LineChart, PieChart, Download, RefreshCw
} from "lucide-react";

// ---------- helpers ----------
const fmtR = (n: number, max = 2) =>
  `R${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: max })}`;

type DashboardProps = {
  results: PricingResults | null;
  products: PricingProduct[];
  onExportPdf?: () => void;
  onRefresh?: () => void;
};

export default function Dashboard({
  results,
  products,
  onExportPdf,
  onRefresh,
}: DashboardProps) {
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // ------------- derived -------------
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
    const costFixed = results.actualCost || 0; // “Total Fixed Costs” from Setup
    const costGoods = (results.calculatedProducts || []).reduce((s, p) => s + (p.costPerUnit * p.expectedUnits), 0);
    const profit = results.calculatedProfit || (revenue - costFixed - costGoods);
    const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;
    const unitCount = (results.calculatedProducts || []).reduce((s, p) => s + p.expectedUnits, 0);

    return { revenue, costFixed, costGoods, profit, marginPct, unitCount };
  }, [results, filteredProducts]);

  const productBreaks = useMemo(() => {
    const list = (results?.calculatedProducts || []).map(p => ({
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

  // ------------- Highcharts options -------------

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
      data: (results?.calculatedProducts || []).map(p => ({ name: p.name, value: p.totalRevenue, z: p.totalRevenue }))
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

  // ------------- UI -------------
  return (
    <div className="slide-in">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-card-foreground">Business Dashboard</h2>
            <p className="text-muted-foreground mt-1">
              Snapshot of revenue, costs, profit, and product performance.
            </p>
          </div>
          <div className="flex gap-2">
            {onRefresh && (
              <Button variant="outline" onClick={onRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            )}
            <Button variant="outline" onClick={onExportPdf}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 pt-4">
        <div className="max-w-7xl mx-auto">
          <Card className="pricing-form-section">
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
              <CardDescription>Scope the dashboard to a supplier or search across products.</CardDescription>
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

     <div className="px-6 pt-6">
  {/* The parent container is changed to use flexbox with horizontal scrolling */}
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

      {/* Charts */}
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
    </div>
  );
}
