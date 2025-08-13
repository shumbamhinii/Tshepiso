// components/QuickAdjustModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface BudgetItem {
  id: string;
  category: string;
  budgeted: number;
  actual: number;
  notes?: string;
  period: "Monthly" | "Quarterly" | "Annually" | "One-Time";
  monthYear?: string;
}

interface QuickAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetItems: BudgetItem[];
  onApplySuggestions: (updatedItems: BudgetItem[]) => void;
}

export function QuickAdjustModal({ isOpen, onClose, budgetItems, onApplySuggestions }: QuickAdjustModalProps) {
  const [adjustedItems, setAdjustedItems] = useState<BudgetItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Calculate suggestions when modal opens
      const suggestions = budgetItems.map(item => {
        // Simple AI: Suggest 10% more than actual if actual is higher, or keep current budget
        const suggestedBudgeted = item.actual > item.budgeted
          ? parseFloat((item.actual * 1.1).toFixed(2)) // 10% buffer if over budget
          : item.budgeted; // Keep current if under or on budget

        return {
          ...item,
          suggestedBudgeted: suggestedBudgeted,
          reasoning: item.actual > item.budgeted
            ? `Actual spending was higher. Suggesting a 10% buffer over last actual ($${item.actual.toFixed(2)}).`
            : `Actual spending was within budget. No significant change suggested.`,
        };
      });
      setAdjustedItems(suggestions);
    }
  }, [isOpen, budgetItems]);

  const handleApply = () => {
    const updatedItems = adjustedItems.map(item => ({
      ...item,
      budgeted: item.suggestedBudgeted, // Apply the suggested budget
    }));
    onApplySuggestions(updatedItems);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-6">
        <DialogHeader>
          <DialogTitle>AI Quick Adjust Insights</DialogTitle>
          <p className="text-sm text-muted-foreground">Review and apply AI-powered budget suggestions.</p>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          {adjustedItems.map((item) => (
            <div key={item.id} className="border p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex-1">
                <h4 className="font-medium">{item.category} ({item.monthYear || item.period})</h4>
                <p className="text-sm text-muted-foreground">Current Budget: ${item.budgeted.toFixed(2)} | Actual: ${item.actual.toFixed(2)}</p>
                <p classNameNames="text-sm italic">{item.reasoning}</p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`suggested-${item.id}`} className="sr-only">Suggested Budget</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id={`suggested-${item.id}`}
                    type="number"
                    value={item.suggestedBudgeted}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setAdjustedItems(prev =>
                        prev.map(i => i.id === item.id ? { ...i, suggestedBudgeted: value } : i)
                      );
                    }}
                    className="pl-8 w-32"
                    step="0.01"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAdjustedItems(prev =>
                      prev.map(i => i.id === item.id ? { ...i, budgeted: item.suggestedBudgeted } : i)
                    );
                  }}
                  disabled={item.budgeted === item.suggestedBudgeted}
                >
                  Apply
                </Button>
              </div>
            </div>
          ))}
          {adjustedItems.length === 0 && <p className="text-center text-muted-foreground">No budget items to suggest adjustments for.</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
          <Button onClick={handleApply}>Apply All Suggestions</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}