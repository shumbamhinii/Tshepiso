// client/src/components/pricing/BudgetCharts.tsx
import HighchartsWrapper from "@/lib/HighchartsWrapper";

type MonthlyPoint = { monthYear: string; budgeted: number; actual: number; variance: number };
type CategorySeries = { category: string; data: { monthYear: string; budgeted: number; actual: number }[] };

export default function BudgetCharts({
  monthly,
  categoriesSeries,
  currencyFormatter,
}: {
  monthly: MonthlyPoint[];
  categoriesSeries: CategorySeries[];
  currencyFormatter: (n: number | string) => string;
}) {
  const months = monthly.map(d => d.monthYear);
  const budgeted = monthly.map(d => d.budgeted);
  const actual = monthly.map(d => d.actual);
  const variance = monthly.map(d => d.variance);

  const fmtR = (v: any) => currencyFormatter(Number(v || 0));

  const mainOptions: Highcharts.Options = {
    title: { text: "Budget vs Actual by Month" },
    xAxis: { categories: months, tickLength: 0 },
    yAxis: [{
      title: { text: "Amount (R)" },
      labels: { formatter() { return fmtR(this.value as number); } },
    }, {
      title: { text: "Variance (R)" },
      labels: { formatter() { return fmtR(this.value as number); } },
      opposite: true
    }],
    legend: { verticalAlign: "bottom" },
    tooltip: {
      shared: true,
      useHTML: true,
      formatter() {
        const p = this.points || [];
        const lines = [`<b>${this.x}</b>`];
        p.forEach(pt => lines.push(`${pt.series.name}: <b>${fmtR(pt.y as number)}</b>`));
        return lines.join("<br/>");
      }
    },
    plotOptions: {
      column: {
        pointPadding: 0.1,
        borderWidth: 0,
        dataLabels: { enabled: true, formatter() { return fmtR(this.y as number); } }
      },
      line: { dataLabels: { enabled: true, formatter() { return fmtR(this.y as number); } } }
    },
    series: [
      { type: "column", name: "Budgeted", data: budgeted, color: "#94a3b8" },
      { type: "column", name: "Actual",   data: actual,   color: "#22c55e" },
      { type: "line",   name: "Variance", data: variance, color: "#ef4444", yAxis: 1 }
    ],
    credits: { enabled: false }
  };

  const perCategoryOptions: Highcharts.Options = {
    title: { text: "Category Breakdown (Grouped Columns)" },
    xAxis: { categories: Array.from(new Set(months)), tickLength: 0 },
    yAxis: {
      title: { text: "Amount (R)" },
      labels: { formatter() { return fmtR(this.value as number); } },
    },
    legend: { verticalAlign: "bottom" },
    tooltip: {
      shared: true,
      useHTML: true,
      formatter() {
        const p = this.points || [];
        const lines = [`<b>${this.x}</b>`];
        p.forEach(pt => lines.push(`${pt.series.name}: <b>${fmtR(pt.y as number)}</b>`));
        return lines.join("<br/>");
      }
    },
    plotOptions: {
      column: {
        pointPadding: 0.1,
        borderWidth: 0,
        grouping: true,
        dataLabels: { enabled: true, formatter() { return fmtR(this.y as number); } }
      }
    },
    series: categoriesSeries.map(cat => ({
      type: "column",
      name: cat.category,
      data: Array.from(new Set(months)).map(m => {
        const pt = cat.data.find(d => d.monthYear === m);
        return (pt?.actual ?? 0); // show ACTUAL by category; swap to budgeted if you prefer
      })
    })),
    credits: { enabled: false }
  };

  return (
    <div className="space-y-8">
      <HighchartsWrapper options={mainOptions} />
      <HighchartsWrapper options={perCategoryOptions} />
    </div>
  );
}
