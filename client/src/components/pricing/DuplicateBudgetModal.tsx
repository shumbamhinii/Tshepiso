// components/DuplicateBudgetModal.tsx
import React, { useState } from 'react';
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

interface DuplicateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDuplicate: (sourceMonthYear: string, targetMonthYear: string) => void;
  availablePeriods: string[]; // List of "YYYY-MM" strings from existing data
}

export function DuplicateBudgetModal({ isOpen, onClose, onDuplicate, availablePeriods }: DuplicateBudgetModalProps) {
  const [sourcePeriod, setSourcePeriod] = useState<string>(availablePeriods[0] || "");
  const [targetPeriod, setTargetPeriod] = useState<string>("");

  const handleSubmit = () => {
    if (sourcePeriod && targetPeriod) {
      onDuplicate(sourcePeriod, targetPeriod);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-6">
        <DialogHeader>
          <DialogTitle>Duplicate Budget Period</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="source-period" className="text-right">
              Copy From:
            </Label>
            <select
              id="source-period"
              value={sourcePeriod}
              onChange={(e) => setSourcePeriod(e.target.value)}
              className="col-span-3 border rounded px-2 py-1"
            >
              {availablePeriods.map(period => (
                <option key={period} value={period}>{period}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="target-period" className="text-right">
              To New Period:
            </Label>
            <Input
              id="target-period"
              type="month"
              value={targetPeriod}
              onChange={(e) => setTargetPeriod(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!sourcePeriod || !targetPeriod}>
            Duplicate Budget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}