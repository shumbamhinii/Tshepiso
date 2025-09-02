// components/pricing/results-tab.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle, BarChart2, Lightbulb, TrendingDown, CircleDollarSign, Factory, LineChart, PieChart } from "lucide-react";
import type { PricingResults, PricingProduct } from "@/types/pricing";
import HighchartsWrapper from "@/lib/HighchartsWrapper";

interface ResultsTabProps {
  results: PricingResults | null;
  products: PricingProduct[]; // Add this prop to get current products
  onApplyPrices: () => void;
  onExportPdf: () => void;
}

export default function ResultsTab({ results, products, onApplyPrices, onExportPdf }: ResultsTabProps) {
  if (!results) {
    return (
      <div className="slide-in">
        <div className="bg-card border-b border-border px-8 py-6">
          <h2 className="text-2xl font-bold text-card-foreground">Pricing Results</h2>
          <p className="text-muted-foreground mt-1">Run a calculation to see your pricing outcomes.</p>
        </div>
        <div className="p-8 text-center text-muted-foreground">
          No results to display. Please go to the Setup tab and run a calculation.
        </div>
      </div>
    );
  }

  // ---------- helpers ----------
  const fmtR = (n: number, max = 2) =>
    `R${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: max })}`;

  // ------------- derived -------------
  // Use the current products array to calculate KPIs
  const kpi = {
    revenue: results.totalRevenue || 0,
    costFixed: results.actualCost || 0,
    costGoods: (products || []).reduce((sum, p) => sum + (p.costPerUnit || 0) * (p.expectedUnits || 0), 0),
    profit: results.calculatedProfit || ((results.totalRevenue || 0) - (results.actualCost || 0) - 
      (products || []).reduce((sum, p) => sum + (p.costPerUnit || 0) * (p.expectedUnits || 0), 0)),
    marginPct: (results.totalRevenue || 0) > 0 ? 
      (((results.totalRevenue || 0) - (results.actualCost || 0) - 
        (products || []).reduce((sum, p) => sum + (p.costPerUnit || 0) * (p.expectedUnits || 0), 0)) / 
        (results.totalRevenue || 1)) * 100 : 0,
    unitCount: (products || []).reduce((sum, p) => sum + (p.expectedUnits || 0), 0),
  };

  // Product breakdown for charts
  const productBreaks = {
    list: (products || []).map(p => ({
      id: p.id,
      name: p.name,
      revenue: p.price ? p.price * (p.expectedUnits || 0) : 0,
      margin: p.price && p.costPerUnit ? ((p.price - p.costPerUnit) / p.price) * 100 : 0,
      profit: p.price ? p.price * (p.expectedUnits || 0) - (p.costPerUnit || 0) * (p.expectedUnits || 0) : 0,
    })),
    topRevenue: [...(products || []).map(p => ({
      id: p.id,
      name: p.name,
      revenue: p.price ? p.price * (p.expectedUnits || 0) : 0,
      margin: p.price && p.costPerUnit ? ((p.price - p.costPerUnit) / p.price) * 100 : 0,
      profit: p.price ? p.price * (p.expectedUnits || 0) - (p.costPerUnit || 0) * (p.expectedUnits || 0) : 0,
    }))].sort((a, b) => b.revenue - a.revenue).slice(0, 10)
  };

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
      data: (products || []).map(p => ({ name: p.name, value: p.price ? p.price * (p.expectedUnits || 0) : 0, z: p.price ? p.price * (p.expectedUnits || 0) : 0 }))
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

  // Product table data
  const productTableData = (products || []).map(p => ({
    id: p.id,
    name: p.name,
    costPerUnit: p.costPerUnit,
    expectedUnits: p.expectedUnits,
    price: p.price,
    totalRevenue: p.price ? p.price * (p.expectedUnits || 0) : 0,
    profitPerUnit: p.price ? p.price - p.costPerUnit : 0,
    profitMargin: p.price && p.costPerUnit ? ((p.price - p.costPerUnit) / p.price) * 100 : 0
  }));

  /* -------------------- UI -------------------- */
  return (
    <div className="slide-in">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-card-foreground">Pricing Results</h2>
            <p className="text-muted-foreground mt-1">Review your calculated prices and profitability.</p>
          </div>
          <div className="flex gap-2">
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

      {/* KPI Cards */}
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
                    {productTableData.map((p) => (
                      <tr key={p.id} className="border-t hover:bg-muted/40">
                        <td className="px-3 py-2 font-medium">{p.name}</td>
                        <td className="px-3 py-2">{fmtR(p.costPerUnit)}</td>
                        <td className="px-3 py-2">{p.expectedUnits}</td>
                        <td className="px-3 py-2">{fmtR(p.price)}</td>
                        <td className="px-3 py-2">{fmtR(p.totalRevenue)}</td>
                        <td className="px-3 py-2">{fmtR(p.profitPerUnit)}</td>
                        <td className="px-3 py-2">
                          {isFinite(p.profitMargin) ? `${p.profitMargin.toFixed(2)}%` : "-"}
                        </td>
                      </tr>
                    ))}
                    {productTableData.length === 0 && (
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
              {(products?.length ?? 0) === 0 ? (
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