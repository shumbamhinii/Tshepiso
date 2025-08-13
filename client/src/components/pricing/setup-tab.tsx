import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PricingSetup, PricingExpense } from "@/types/pricing";
import { Coins, Target, Plus, Trash2, HelpCircle, Calculator } from "lucide-react";

interface SetupTabProps {
  setup: PricingSetup;
  onSetupChange: (setup: PricingSetup) => void;
  onCalculate?: () => void;
  isCalculating?: boolean;
}

export default function SetupTab({ setup, onSetupChange, onCalculate, isCalculating }: SetupTabProps) {
  // Initialize internal state based on props, ensuring default values
  const [costMethod, setCostMethod] = useState<'simple' | 'breakdown'>(setup.useBreakdown ? 'breakdown' : 'simple');
  const [profitMethod, setProfitMethod] = useState<'fixed' | 'margin'>(setup.useMargin ? 'margin' : 'fixed');

  // Sync internal state with prop changes (e.g., when a snapshot is loaded)
  useEffect(() => {
    setCostMethod(setup.useBreakdown ? 'breakdown' : 'simple');
    setProfitMethod(setup.useMargin ? 'margin' : 'fixed');
  }, [setup.useBreakdown, setup.useMargin]);

  const handleCostMethodChange = (method: 'simple' | 'breakdown') => {
    setCostMethod(method);
    onSetupChange({
      ...setup,
      useBreakdown: method === 'breakdown'
    });
  };

  const handleProfitMethodChange = (method: 'fixed' | 'margin') => {
    setProfitMethod(method);
    onSetupChange({
      ...setup,
      useMargin: method === 'margin'
    });
  };

  const addExpense = () => {
    const newExpense: PricingExpense = {
      id: Date.now().toString(),
      label: '',
      amount: 0 // Ensure default amount is a number
    };
    onSetupChange({
      ...setup,
      expenses: [...setup.expenses, newExpense]
    });
  };

  const removeExpense = (id: string) => {
    onSetupChange({
      ...setup,
      expenses: setup.expenses.filter(exp => exp.id !== id)
    });
  };

  const updateExpense = (id: string, field: keyof PricingExpense, value: string | number) => {
    onSetupChange({
      ...setup,
      expenses: setup.expenses.map(exp =>
        exp.id === id ? { ...exp, [field]: (field === 'amount' ? (parseFloat(value as string) || 0) : value) } : exp
      )
    });
  };

  // Ensure totalCalculatedCost is always a number
  const totalCalculatedCost = setup.expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount as any) || 0), 0);

  return (
    <div className="slide-in">
      {/* Header */}
      <div className="bg-card border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-card-foreground">Setup Configuration</h2>
            <p className="text-muted-foreground mt-1">Configure your base costs and profit targets</p>
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
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Cost Configuration */}
          <Card className="pricing-form-section">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Coins className="w-5 h-5 mr-3 text-primary" />
                Cost Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={costMethod} onValueChange={handleCostMethodChange}>
                <div className="space-y-6">
                  {/* Simple Cost Input */}
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="simple" id="simple" />
                      <Label htmlFor="simple" className="font-medium">Simple Total Cost</Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 ml-6">
                      Enter your total fixed costs as a single amount
                    </p>

                    {costMethod === 'simple' && (
                      <div className="mt-4 ml-6">
                        <Label htmlFor="totalCost" className="text-sm font-medium">Total Fixed Costs</Label>
                        <div className="relative mt-2">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                            R
                          </span>
                          <Input
                            id="totalCost"
                            type="number"
                            // Ensure value is displayed correctly, defaulting to empty string for null/undefined
                            value={setup.totalCost ?? ''}
                            onChange={(e) => onSetupChange({
                              ...setup,
                              // Parse to float, default to 0 if NaN
                              totalCost: parseFloat(e.target.value) || 0
                            })}
                            className="pl-8"
                            placeholder="0.00"
                            step="0.01"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Detailed Breakdown */}
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="breakdown" id="breakdown" />
                      <Label htmlFor="breakdown" className="font-medium">Detailed Cost Breakdown</Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 ml-6">
                      Break down your costs into individual expense categories
                    </p>

                    {costMethod === 'breakdown' && (
                      <div className="mt-4 ml-6">
                        <div className="space-y-3">
                          {setup.expenses.map((expense) => (
                            <div key={expense.id} className="flex items-center space-x-3">
                              <Input
                                value={expense.label}
                                onChange={(e) => updateExpense(expense.id, 'label', e.target.value)}
                                placeholder="Expense category (e.g., Rent, Utilities)"
                                className="flex-1"
                              />
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                                  R
                                </span>
                                <Input
                                  type="number"
                                  // Ensure value is displayed correctly, defaulting to empty string for null/undefined
                                  value={expense.amount ?? ''}
                                  onChange={(e) => updateExpense(expense.id, 'amount', e.target.value)}
                                  className="w-32 pl-8"
                                  placeholder="0.00"
                                  step="0.01"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeExpense(expense.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={addExpense}
                          className="mt-3 text-primary hover:text-primary"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Expense Category
                        </Button>

                        <div className="mt-4 p-3 bg-accent/10 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Total Fixed Costs:</span>
                            <Badge variant="secondary" className="text-lg font-bold">
                              {/* Ensure totalCalculatedCost is a number before toFixed */}
                              R{(totalCalculatedCost ?? 0).toFixed(2)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Profit Target Configuration */}
          <Card className="pricing-form-section">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Target className="w-5 h-5 mr-3 text-primary" />
                Profit Target Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={profitMethod} onValueChange={handleProfitMethodChange}>
                <div className="space-y-6">
                  {/* Fixed Profit Amount */}
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="fixed" id="fixed" />
                      <Label htmlFor="fixed" className="font-medium">Fixed Profit Amount</Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 ml-6">
                      Set a specific Rand amount for your target profit
                    </p>

                    {profitMethod === 'fixed' && (
                      <div className="mt-4 ml-6">
                        <Label htmlFor="targetProfit" className="text-sm font-medium">Target Profit</Label>
                        <div className="relative mt-2">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                            R
                          </span>
                          <Input
                            id="targetProfit"
                            type="number"
                            // Ensure value is displayed correctly, defaulting to empty string for null/undefined
                            value={setup.targetProfit ?? ''}
                            onChange={(e) => onSetupChange({
                              ...setup,
                              // Parse to float, default to 0 if NaN
                              targetProfit: parseFloat(e.target.value) || 0
                            })}
                            className="pl-8"
                            placeholder="0.00"
                            step="0.01"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Profit Margin Percentage */}
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="margin" id="margin" />
                      <Label htmlFor="margin" className="font-medium">Profit Margin Percentage</Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 ml-6">
                      Set your target profit as a percentage of total revenue
                    </p>

                    {profitMethod === 'margin' && (
                      <div className="mt-4 ml-6">
                        <Label htmlFor="targetMargin" className="text-sm font-medium">Target Margin</Label>
                        <div className="relative mt-2">
                          <Input
                            id="targetMargin"
                            type="number"
                            // Ensure value is displayed correctly, defaulting to empty string for null/undefined
                            value={setup.targetMargin ?? ''}
                            onChange={(e) => onSetupChange({
                              ...setup,
                              // Parse to float, default to 0 if NaN
                              targetMargin: parseFloat(e.target.value) || 0
                            })}
                            className="pr-8"
                            placeholder="0"
                            step="0.1"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                            %
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Common margins: 20-30% for retail, 40-60% for services
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card className="pricing-summary-card">
            <CardHeader>
              <CardTitle className="text-lg">Configuration Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/50 dark:bg-white/10 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Total Fixed Costs</div>
                  <div className="text-lg font-bold">
                    {/* Ensure values are numbers before toFixed */}
                    R{(costMethod === 'breakdown' ? (totalCalculatedCost ?? 0) : (setup.totalCost ?? 0)).toFixed(2)}
                  </div>
                </div>
                <div className="bg-white/50 dark:bg-white/10 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Target Profit</div>
                  <div className="text-lg font-bold">
                    {/* Ensure values are numbers before toFixed */}
                    {profitMethod === 'fixed' ? `R${(setup.targetProfit ?? 0).toFixed(2)}` : `${(setup.targetMargin ?? 0)}%`}
                  </div>
                </div>
                <div className="bg-white/50 dark:bg-white/10 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Method</div>
                  <div className="text-lg font-bold">
                    {profitMethod === 'fixed' ? 'Fixed Amount' : 'Margin Based'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}