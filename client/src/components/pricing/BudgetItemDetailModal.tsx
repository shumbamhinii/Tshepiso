// components/BudgetItemDetailModal.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter, // Make sure this is still here!
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface BudgetItem {
  id: string;
  category: string;
  budgeted: number;
  actual: number;
  notes?: string;
  period: "Monthly" | "Quarterly" | "Annually" | "One-Time";
  monthYear?: string;
  paymentFrequency?: "Weekly" | "Bi-Weekly" | "Monthly" | "Quarterly" | "Annually" | "One-Time";
  dueDate?: string;
}

interface BudgetItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: BudgetItem | null;
  historicalData: { monthYear: string; budgeted: number; actual: number }[];
  // NEW: Add props for snapshot totals
  currentSnapshotTotalMonthlyCost?: number;
  currentSnapshotTotalProductsCost?: number;
  currentSnapshotName?: string; // Optional: to show which snapshot these totals are from
}

export function BudgetItemDetailModal({
  isOpen,
  onClose,
  item,
  historicalData,
  currentSnapshotTotalMonthlyCost, // Destructure new prop
  currentSnapshotTotalProductsCost, // Destructure new prop
  currentSnapshotName, // Destructure new prop
}: BudgetItemDetailModalProps) {
  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-6">
        <DialogHeader>
          <DialogTitle>{item.category} Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Existing item details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Budgeted Amount</Label>
              <p className="font-bold text-lg">${item.budgeted.toFixed(2)}</p>
            </div>
            <div>
              <Label>Actual Amount</Label>
              <p className="font-bold text-lg">${item.actual.toFixed(2)}</p>
            </div>
            <div>
              <Label>Period</Label>
              <p>{item.period}</p>
            </div>
            {item.monthYear && (
              <div>
                <Label>Month/Year</Label>
                <p>{item.monthYear}</p>
              </div>
            )}
            {item.period === "One-Time" && item.dueDate && (
              <div>
                <Label>Due Date</Label>
                <p>{new Date(item.dueDate).toLocaleDateString()}</p>
              </div>
            )}
            {item.period !== "One-Time" && item.paymentFrequency && (
              <div>
                <Label>Payment Frequency</Label>
                <p>{item.paymentFrequency}</p>
              </div>
            )}
          </div>
          {item.notes && (
            <div>
              <Label>Notes</Label>
              <p className="text-sm text-muted-foreground">{item.notes}</p>
            </div>
          )}

          {/* NEW: Display Snapshot Totals */}
          {(currentSnapshotTotalMonthlyCost !== undefined || currentSnapshotTotalProductsCost !== undefined) && (
            <Card className="mt-4">
              <CardContent className="p-4">
                <h5 className="font-medium mb-2">
                  Overall Snapshot Totals {currentSnapshotName && `(${currentSnapshotName})`}
                </h5>
                {currentSnapshotTotalMonthlyCost !== undefined && (
                  <div>
                    <Label>Total Monthly Cost (Snapshot)</Label>
                    <p className="font-bold text-lg">${currentSnapshotTotalMonthlyCost.toFixed(2)}</p>
                  </div>
                )}
                {currentSnapshotTotalProductsCost !== undefined && (
                  <div>
                    <Label>Total Products Cost (Snapshot)</Label>
                    <p className="font-bold text-lg">${currentSnapshotTotalProductsCost.toFixed(2)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Existing Historical Performance */}
          <Card className="mt-4">
            <CardContent className="p-4">
              <h5 className="font-medium mb-2">Historical Performance ({item.category})</h5>
              {historicalData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={historicalData}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="monthYear" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                    <Line type="monotone" dataKey="budgeted" stroke="#8884d8" name="Budgeted" />
                    <Line type="monotone" dataKey="actual" stroke="#82ca9d" name="Actual" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">No historical data available for this item.</p>
              )}
            </CardContent>
          </Card>

          {/* ... optional linked transactions card ... */}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}