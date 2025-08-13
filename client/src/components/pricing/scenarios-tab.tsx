import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WhatIfScenario, PricingResults } from "@/types/pricing"; // Import PricingResults
import { FlaskConical, Plus, Play, Trash2, LineChart, BarChart2, Lightbulb } from "lucide-react"; // Added icons
import { useState } from "react";

// Import Recharts components
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart as RechartsLineChart, // Renamed to avoid conflict with Lucide icon
  Line,
} from 'recharts';

// Define colors for the charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

interface ScenariosTabProps {
  scenarios: WhatIfScenario[];
  onScenariosChange: (scenarios: WhatIfScenario[]) => void;
  onRunScenario?: (scenario: WhatIfScenario) => void;
  baseResults: PricingResults | null; // Prop for base pricing results
}

export default function ScenariosTab({ scenarios, onScenariosChange, onRunScenario, baseResults }: ScenariosTabProps) {
  const [newScenario, setNewScenario] = useState<Partial<WhatIfScenario>>({
    name: '',
    description: '',
    changes: {
      costMultiplier: 1,
      marginAdjustment: 0,
      volumeMultiplier: 1
    }
  });
  // State for the number of periods for financial projections
  const [projectionPeriods, setProjectionPeriods] = useState(12); // Default to 12 periods (e.g., months)

  const addScenario = () => {
    if (newScenario.name) {
      const scenario: WhatIfScenario = {
        id: Date.now().toString(),
        name: newScenario.name,
        description: newScenario.description,
        changes: newScenario.changes || {
          costMultiplier: 1,
          marginAdjustment: 0,
          volumeMultiplier: 1
        }
      };
      onScenariosChange([...scenarios, scenario]);
      setNewScenario({
        name: '',
        description: '',
        changes: {
          costMultiplier: 1,
          marginAdjustment: 0,
          volumeMultiplier: 1
        }
      });
    }
  };

  const removeScenario = (id: string) => {
    onScenariosChange(scenarios.filter(s => s.id !== id));
  };

  // --- Chart Data Preparation ---

  // Data for comparing base results with scenario results
  const comparisonChartData = [{
    name: 'Base Case',
    Revenue: baseResults?.totalRevenue || 0,
    Profit: baseResults?.calculatedProfit || 0,
  }];

  scenarios.forEach(s => {
    if (s.results) {
      comparisonChartData.push({
        name: s.name,
        Revenue: s.results.totalRevenue,
        Profit: s.results.calculatedProfit,
      });
    }
  });

  // Data for simplified financial projection (Brownian-like motion)
  // This aims to visually "scare" by showing potential fluctuations.
  const getFinancialProjectionData = (initialValue: number, numPeriods: number, volatility: number, drift: number = 0) => {
    const data = [{ period: 0, value: initialValue }];
    let currentValue = initialValue;

    for (let i = 1; i <= numPeriods; i++) {
      // Simulate a random fluctuation (like a simplified random walk)
      // drift: a slight upward or downward trend over time (e.g., 0.001 for slight growth)
      // randomChange: based on volatility, creating noise
      const randomChange = (Math.random() * 2 - 1) * volatility * initialValue; // Random change based on initial value and volatility
      currentValue = currentValue * (1 + drift) + randomChange; // Apply drift and then random change
      data.push({ period: i, value: Math.max(0, currentValue) }); // Ensure value doesn't go below zero for visualization
    }
    return data;
  };

  // --- Insights Generation ---
  const getScenarioInsights = () => {
    const insights = [];

    if (!baseResults) {
      insights.push("Run a base pricing calculation first to see scenario comparisons.");
      return insights;
    }

    const baseProfit = baseResults.calculatedProfit;
    const baseRevenue = baseResults.totalRevenue;

    const profitableScenarios = scenarios.filter(s => s.results && s.results.calculatedProfit > baseProfit);
    if (profitableScenarios.length > 0) {
      insights.push(`**Positive Scenarios:** ${profitableScenarios.map(s => s.name).join(', ')} could increase your profit compared to the base case.`);
    }

    const lossScenarios = scenarios.filter(s => s.results && s.results.calculatedProfit < baseProfit);
    if (lossScenarios.length > 0) {
      insights.push(`**Risk Alert:** Scenarios like ${lossScenarios.map(s => s.name).join(', ')} could lead to a decrease in profit. Pay close attention to their assumptions.`);
    }

    const highestProfitScenario = scenarios.reduce((maxS, currentS) => {
      if (!currentS.results) return maxS;
      if (!maxS || !maxS.results || currentS.results.calculatedProfit > maxS.results.calculatedProfit) {
        return currentS;
      }
      return maxS;
    }, null as WhatIfScenario | null);

    if (highestProfitScenario && highestProfitScenario.results) {
      insights.push(`The most optimistic scenario, "${highestProfitScenario.name}", projects a profit of $${highestProfitScenario.results.calculatedProfit.toFixed(2)}.`);
    }

    const lowestProfitScenario = scenarios.reduce((minS, currentS) => {
      if (!currentS.results) return minS;
      if (!minS || !minS.results || currentS.results.calculatedProfit < minS.results.calculatedProfit) {
        return currentS;
      }
      return minS;
    }, null as WhatIfScenario | null);

    if (lowestProfitScenario && lowestProfitScenario.results) {
      insights.push(`The most pessimistic scenario, "${lowestProfitScenario.name}", projects a profit of $${lowestProfitScenario.results.calculatedProfit.toFixed(2)}. This highlights potential downside risk.`);
    }

    // NEW INSIGHT: Potential Volatility from projections
    if (baseResults.calculatedProducts.length > 0 && projectionPeriods > 0) {
      // Calculate a potential lowest point across all product projections
      let overallLowestProjectedPrice = Infinity;
      baseResults.calculatedProducts.forEach(product => {
        const productProjection = getFinancialProjectionData(product.price, projectionPeriods, 0.05); // Use a standard volatility for this insight
        const minProductPrice = Math.min(...productProjection.map(d => d.value));
        if (minProductPrice < overallLowestProjectedPrice) {
          overallLowestProjectedPrice = minProductPrice;
        }
      });
      if (overallLowestProjectedPrice < baseResults.calculatedProducts[0].price * 0.9) { // If average price could drop by more than 10%
        insights.push(`**Market Volatility Warning:** Illustrative projections show that product prices could experience significant fluctuations, with some potentially dropping to as low as $${overallLowestProjectedPrice.toFixed(2)}. This indicates a need for robust risk management.`);
      }
    }


    if (scenarios.length === 0) {
      insights.push("No scenarios have been run yet. Create and run scenarios to see their potential impact.");
    } else if (scenarios.every(s => !s.results)) {
      insights.push("Scenarios created, but not yet run. Click 'Run' to see their financial impact.");
    }

    return insights;
  };


  return (
    <div className="slide-in">
      {/* Header */}
      <div className="bg-card border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-card-foreground">What-If Scenarios</h2>
            <p className="text-muted-foreground mt-1">Test different pricing scenarios and market conditions</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Create New Scenario */}
          <Card className="pricing-form-section">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Plus className="w-5 h-5 mr-2 text-primary" />
                Create New Scenario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scenario-name">Scenario Name</Label>
                  <Input
                    id="scenario-name"
                    value={newScenario.name || ''}
                    onChange={(e) => setNewScenario({...newScenario, name: e.target.value})}
                    placeholder="e.g., Economic Downturn"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="scenario-description">Description</Label>
                  <Input
                    id="scenario-description"
                    value={newScenario.description || ''}
                    onChange={(e) => setNewScenario({...newScenario, description: e.target.value})}
                    placeholder="Brief description of the scenario"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="cost-multiplier">Cost Multiplier</Label>
                  <Input
                    id="cost-multiplier"
                    type="number"
                    value={newScenario.changes?.costMultiplier || 1}
                    onChange={(e) => setNewScenario({
                      ...newScenario,
                      changes: {
                        ...newScenario.changes,
                        costMultiplier: parseFloat(e.target.value) || 1
                      }
                    })}
                    step="0.1"
                    placeholder="1.0"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">1.0 = no change, 1.2 = 20% increase</p>
                </div>
                <div>
                  <Label htmlFor="margin-adjustment">Margin Adjustment (%)</Label>
                  <Input
                    id="margin-adjustment"
                    type="number"
                    value={newScenario.changes?.marginAdjustment || 0}
                    onChange={(e) => setNewScenario({
                      ...newScenario,
                      changes: {
                        ...newScenario.changes,
                        marginAdjustment: parseFloat(e.target.value) || 0
                      }
                    })}
                    step="0.1"
                    placeholder="0"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">+5 = increase margin by 5%</p>
                </div>
                <div>
                  <Label htmlFor="volume-multiplier">Volume Multiplier</Label>
                  <Input
                    id="volume-multiplier"
                    type="number"
                    value={newScenario.changes?.volumeMultiplier || 1}
                    onChange={(e) => setNewScenario({
                      ...newScenario,
                      changes: {
                        ...newScenario.changes,
                        volumeMultiplier: parseFloat(e.target.value) || 1
                      }
                    })}
                    step="0.1"
                    placeholder="1.0"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">0.8 = 20% decrease in volume</p>
                </div>
              </div>

              {/* NEW: Projection Periods Input */}
              <div className="space-y-2">
                <Label htmlFor="projection-periods">Projection Periods (e.g., Months)</Label>
                <Input
                  id="projection-periods"
                  type="number"
                  value={projectionPeriods}
                  onChange={(e) => setProjectionPeriods(parseInt(e.target.value) || 1)}
                  min="1"
                  placeholder="12"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Number of periods for financial projections.</p>
              </div>

              <Button onClick={addScenario} disabled={!newScenario.name}>
                <Plus className="w-4 h-4 mr-2" />
                Add Scenario
              </Button>
            </CardContent>
          </Card>

          {/* Scenario Comparison Chart */}
          {baseResults && scenarios.some(s => s.results) && (
            <Card className="pricing-chart-section">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5" />
                  Scenario Comparison: Profit & Revenue
                </CardTitle>
                <CardDescription>Compare financial outcomes across different scenarios and the base case.</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparisonChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis formatter={(value: number) => `$${value.toFixed(0)}`} />
                    <Tooltip formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]} />
                    <Legend />
                    <Bar dataKey="Revenue" fill="#22C55E" /> {/* Green for Revenue */}
                    <Bar dataKey="Profit" fill="#3B82F6" />  {/* Blue for Profit */}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Overall Profit Projection Chart (Simplified Brownian-like motion) */}
          {baseResults && scenarios.some(s => s.results) && (
            <Card className="pricing-chart-section">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  Overall Profit Projection (Illustrative)
                </CardTitle>
                <CardDescription>
                  Visualize potential profit trends and volatility for each scenario over {projectionPeriods} periods.
                  <span className="text-red-500 ml-2">This is an illustrative model and not a financial forecast.</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" type="number" label={{ value: 'Time Period', position: 'insideBottom', offset: 0 }} />
                    <YAxis formatter={(value: number) => `$${value.toFixed(0)}`} label={{ value: 'Profit', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                    <Legend />
                    {/* Base Case Line */}
                    <Line
                      type="monotone"
                      data={getFinancialProjectionData(baseResults.calculatedProfit, projectionPeriods, 0.03)} // Less volatility for base
                      dataKey="value" // Changed from 'profit' to 'value'
                      name="Base Profit"
                      stroke="#A3A3A3" // Grey
                      strokeDasharray="5 5"
                      dot={false}
                    />
                    {/* Scenario Lines */}
                    {scenarios.filter(s => s.results).map((s, index) => (
                      <Line
                        key={s.id}
                        type="monotone"
                        data={getFinancialProjectionData(s.results!.calculatedProfit, projectionPeriods, 0.05 + (index * 0.01))} // Varying volatility
                        dataKey="value" // Changed from 'profit' to 'value'
                        name={s.name}
                        stroke={COLORS[index % COLORS.length]}
                        dot={false}
                      />
                    ))}
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* NEW: Product Price Projection Chart */}
          {baseResults && baseResults.calculatedProducts.length > 0 && projectionPeriods > 0 && (
            <Card className="pricing-chart-section">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  Product Price Projection (Illustrative)
                </CardTitle>
                <CardDescription>
                  Simulated price movement for individual products over {projectionPeriods} periods.
                  <span className="text-red-500 ml-2">This is an illustrative model and not a financial forecast.</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" type="number" label={{ value: 'Time Period', position: 'insideBottom', offset: 0 }} />
                    <YAxis formatter={(value: number) => `$${value.toFixed(0)}`} label={{ value: 'Price', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                    <Legend />
                    {baseResults.calculatedProducts.map((product, index) => (
                      <Line
                        key={product.id}
                        type="monotone"
                        data={getFinancialProjectionData(product.price, projectionPeriods, 0.02 + (index * 0.005))} // Vary volatility per product
                        dataKey="value"
                        name={`${product.name} Price`}
                        stroke={COLORS[index % COLORS.length]}
                        dot={false}
                      />
                    ))}
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}


          {/* Key Insights Section */}
          <Card className="pricing-insights-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Scenario Insights
              </CardTitle>
              <CardDescription>Key observations and potential implications of your what-if scenarios.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                {getScenarioInsights().map((insight, index) => (
                  <li key={index} dangerouslySetInnerHTML={{ __html: insight }}></li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Scenarios List */}
          <div className="space-y-4">
            {scenarios.map((scenario) => (
              <Card key={scenario.id} className="pricing-form-section">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{scenario.name}</CardTitle>
                      {scenario.description && (
                        <CardDescription className="mt-1">{scenario.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRunScenario && onRunScenario(scenario)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Run
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeScenario(scenario.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {((scenario.changes.costMultiplier || 1) * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Cost Multiplier</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-accent">
                        {scenario.changes.marginAdjustment > 0 ? '+' : ''}{scenario.changes.marginAdjustment}%
                      </div>
                      <div className="text-sm text-muted-foreground">Margin Adjustment</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">
                        {((scenario.changes.volumeMultiplier || 1) * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Volume Multiplier</div>
                    </div>
                  </div>

                  {scenario.results && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Results:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Revenue:</span>
                          <span className="ml-2 font-medium">${scenario.results.totalRevenue.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Profit:</span>
                          <span className="ml-2 font-medium">${scenario.results.calculatedProfit.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="ml-2 font-medium">Margin:</span>
                          <span className="ml-2 font-medium">
                            {((scenario.results.calculatedProfit / scenario.results.totalRevenue) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {scenarios.length === 0 && (
            <Card className="border-dashed border-2 border-muted-foreground/25 bg-muted/10">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FlaskConical className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No scenarios created yet</h3>
                <p className="text-sm text-muted-foreground">Create your first what-if scenario to test different market conditions</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
