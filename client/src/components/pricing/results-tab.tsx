import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle, BarChart2, Lightbulb, TrendingDown } from "lucide-react";
import type { PricingResults } from "@/types/pricing";
import HighchartsWrapper from "@/lib/HighchartsWrapper";

interface ResultsTabProps {
  results: PricingResults | null;
  onApplyPrices: () => void;
  onExportPdf: () => void;
}

export default function ResultsTab({ results, onApplyPrices, onExportPdf }: ResultsTabProps) {
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

  const { actualCost, totalRevenue, calculatedProfit, calculatedProducts } = results;

  // Inventory (product purchase) cost = Σ(costPerUnit * onHand)
  const inventoryCost = calculatedProducts.reduce((sum, p) => {
    const cost = typeof p.costPerUnit === "string" ? parseFloat(p.costPerUnit as any) : (p.costPerUnit as number) || 0;
    const units = Number(p.expectedUnits) || 0;
    return sum + cost * units;
  }, 0);

  // Combined costs for charts (fixed + inventory)
  const combinedCosts = (Number(actualCost) || 0) + inventoryCost;

  // Summary inputs for the treemap
  const summaryCategories = ["Revenue", "Costs", "Profit"];
  const summaryValues = [totalRevenue || 0, combinedCosts, calculatedProfit || 0];
  const summaryColors = ["#22C55E", "#EF4444", "#3B82F6"];
  const isSummaryDataEmpty = summaryValues.every((v) => !v || v === 0);

  // Product Revenue data for packed-bubble
  const productRevenueData = calculatedProducts.map((p) => ({
    name: p.name,
    value: p.totalRevenue,
  }));

  // Units to break even
  const totalOnHandUnits = calculatedProducts.reduce((s, p) => s + (Number(p.expectedUnits) || 0), 0);
  const unitsToBreakEven = totalRevenue > 0 ? (combinedCosts * totalOnHandUnits) / totalRevenue : 0;

  /* -------------------- Highcharts options -------------------- */

  // Treemap for Revenue / Costs / Profit
const treemapOptions: Highcharts.Options = {
  chart: { type: "treemap", height: 320 },
  title: { text: null },
  credits: { enabled: false },
  series: [
    {
      type: "treemap",
      layoutAlgorithm: "squarified",
      data: summaryValues.map((v, i) => ({
        name: summaryCategories[i] || "N/A",
        value: Number(v) || 0,
        color: summaryColors[i],
        colorValue: i,
      })),
      tooltip: {
        pointFormatter() {
          const v = Number(this.value) || 0;
          return `<b>${this.name}:</b> R${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
        },
      },
      dataLabels: {
        enabled: true,
        formatter() {
          const v = Number(this.point.value) || 0;
          const n = this.point.name || "N/A";
          return `<b>${n}</b><br>R${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
        },
        style: { textOutline: "none", fontWeight: "bold" },
      },
    },
  ],
};


  // Packed bubble for product revenue distribution
  const maxRevenue = Math.max(...productRevenueData.map((d) => d.value), 1);
  const packedBubbleOptions: Highcharts.Options = {
    chart: { type: "packedbubble", height: 320 },
    title: { text: null },
    credits: { enabled: false },
    tooltip: {
      useHTML: true,
      pointFormat: "<b>{point.name}:</b> R{point.value:,.2f}",
    },
    plotOptions: {
      packedbubble: {
        minSize: "30%",
        maxSize: "120%",
        zMin: 0,
        zMax: maxRevenue,
        layoutAlgorithm: {
          gravitationalConstant: 0.06,
          splitSeries: false,
          parentNodeLimit: true,
        },
        dataLabels: {
          enabled: true,
          formatter() {
            // Show a label only if bubble is “large enough”
            const v = (this.point as any).value || 0;
            return v >= 0.06 * maxRevenue ? this.point.name : "";
          },
          style: { textOutline: "none", fontWeight: "normal" },
        },
      },
    },
    series: [
      {
        type: "packedbubble",
        name: "Revenue",
        data: productRevenueData,
      },
    ],
  };

  /* -------------------- Insights -------------------- */
  const getInsights = () => {
    const insights: string[] = [];
    if (calculatedProfit > 0) {
      insights.push(
        `Your overall pricing strategy is profitable, yielding a net profit of R${calculatedProfit.toFixed(2)}.`
      );
    } else {
      insights.push(
        `Your current pricing strategy is resulting in a loss of R${Math.abs(calculatedProfit).toFixed(
          2
        )}. Consider reviewing your costs or increasing prices.`
      );
    }

    if (calculatedProducts && calculatedProducts.length > 0) {
      const highestRevenue = calculatedProducts.reduce((prev, cur) =>
        prev.totalRevenue > cur.totalRevenue ? prev : cur
      );
      insights.push(
        `"${highestRevenue.name}" is your top revenue generator, contributing R${highestRevenue.totalRevenue.toFixed(
          2
        )}.`
      );

      const lowestMargin = calculatedProducts.reduce((prev, cur) =>
        prev.profitMargin < cur.profitMargin ? prev : cur
      );
      if (lowestMargin.profitMargin < 10) {
        insights.push(
          `"${lowestMargin.name}" has a low profit margin of ${lowestMargin.profitMargin.toFixed(
            2
          )}%. Investigate ways to reduce its cost or increase its price.`
        );
      } else {
        insights.push(
          `Your products generally maintain healthy margins. The lowest is "${lowestMargin.name}" at ${lowestMargin.profitMargin.toFixed(
            2
          )}%.`
        );
      }
    } else {
      insights.push("No product data available to generate detailed insights.");
    }

    if (unitsToBreakEven > 0) {
      if (unitsToBreakEven > totalOnHandUnits) {
        insights.push(
          `**Critical Insight:** You need to sell approximately ${unitsToBreakEven.toFixed(
            0
          )} units to break even, which is higher than your current on‑hand total of ${totalOnHandUnits} units.`
        );
      } else {
        insights.push(
          `You need to sell approximately ${unitsToBreakEven.toFixed(
            0
          )} units to break even. This is within your current on‑hand total of ${totalOnHandUnits} units.`
        );
      }
    } else if (combinedCosts > 0 && totalRevenue === 0) {
      insights.push("No revenue generated yet, so breakeven units cannot be calculated.");
    }

    return insights;
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="slide-in">
      {/* Header */}
      <div className="bg-card border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-card-foreground">Pricing Results</h2>
            <p className="text-muted-foreground mt-1">Review your calculated prices and profitability.</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={onApplyPrices}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply Prices
            </Button>
            <Button variant="outline" size="sm" onClick={onExportPdf}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Revenue */}
            <Card className="pricing-summary-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <span className="text-primary-foreground bg-primary rounded-full p-1">R</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R{(totalRevenue || 0).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Based on calculated prices</p>
              </CardContent>
            </Card>

            {/* Actual (Fixed) Costs */}
            <Card className="pricing-summary-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Actual Costs (Fixed)</CardTitle>
                <span className="text-destructive-foreground bg-destructive rounded-full p-1">R</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R{(Number(actualCost) || 0).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Fixed costs from Setup
                </p>
              </CardContent>
            </Card>

            {/* Inventory Cost */}
            <Card className="pricing-summary-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inventory Cost</CardTitle>
                <span className="text-destructive-foreground bg-destructive rounded-full p-1">R</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R{inventoryCost.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sum of on‑hand × cost per unit
                </p>
              </CardContent>
            </Card>

            {/* Break-even */}
            <Card className="pricing-summary-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Units to Break Even</CardTitle>
                <span className="text-warning-foreground bg-warning rounded-full p-1">
                  <TrendingDown className="h-4 w-4" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{unitsToBreakEven.toFixed(0)} units</div>
                <p className="text-xs text-muted-foreground mt-1">Based on combined costs</p>
              </CardContent>
            </Card>
          </div>

          {/* Product table */}
          <Card className="pricing-table-section">
            <CardHeader>
              <CardTitle>Product Pricing Breakdown</CardTitle>
              <CardDescription>Detailed pricing and profitability for each product.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Cost Per Unit</TableHead>
                    <TableHead>On‑hand</TableHead>
                    <TableHead>Suggested Price</TableHead>
                    <TableHead>Total Revenue</TableHead>
                    <TableHead>Profit Per Unit</TableHead>
                    <TableHead>Profit Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculatedProducts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        R{(
                          typeof p.costPerUnit === "string"
                            ? parseFloat(p.costPerUnit as any) || 0
                            : (p.costPerUnit as number) || 0
                        ).toFixed(2)}
                      </TableCell>
                      <TableCell>{Number(p.expectedUnits) || 0}</TableCell>
                      <TableCell>R{p.price.toFixed(2)}</TableCell>
                      <TableCell>R{p.totalRevenue.toFixed(2)}</TableCell>
                      <TableCell>R{p.profitPerUnit.toFixed(2)}</TableCell>
                      <TableCell>{p.profitMargin.toFixed(2)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="pricing-chart-section">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5" />
                  Overall Financials
                </CardTitle>
                <CardDescription>Revenue, combined costs, and profit.</CardDescription>
              </CardHeader>
              <CardContent>
                {isSummaryDataEmpty ? (
                  <div className="text-center text-muted-foreground h-[320px] flex items-center justify-center">
                    No financial summary data available.
                  </div>
                ) : (
                  <HighchartsWrapper options={treemapOptions} />
                )}
              </CardContent>
            </Card>

            <Card className="pricing-chart-section">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5" />
                  Product Revenue Distribution
                </CardTitle>
                <CardDescription>Relative contribution (bubble size = revenue).</CardDescription>
              </CardHeader>
              <CardContent>
                <HighchartsWrapper options={packedBubbleOptions} />
              </CardContent>
            </Card>
          </div>

          {/* Insights */}
          <Card className="pricing-insights-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Key Insights
              </CardTitle>
              <CardDescription>Actionable insights derived from your pricing results.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                {getInsights().map((insight, i) => (
                  <li key={i}>{insight}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}