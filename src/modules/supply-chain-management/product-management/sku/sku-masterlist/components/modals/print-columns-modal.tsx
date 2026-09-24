"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AVAILABLE_PRINT_COLUMNS, DEFAULT_PRINT_COLUMNS } from "../../utils/generate-sku-masterlist-pdf";

interface PrintColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedColumns: string[]) => void;
}

export function PrintColumnsModal({ isOpen, onClose, onConfirm }: PrintColumnsModalProps) {
  const [selected, setSelected] = useState<string[]>(DEFAULT_PRINT_COLUMNS);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(DEFAULT_PRINT_COLUMNS);
    }
  }, [isOpen]);

  const toggleColumn = (id: string, checked: boolean) => {
    if (checked) {
      setSelected((prev) => [...prev, id]);
    } else {
      setSelected((prev) => prev.filter((col) => col !== id));
    }
  };

  const handleConfirm = () => {
    if (selected.length === 0) return;
    onConfirm(selected);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Print Masterlist</DialogTitle>
          <DialogDescription>
            Select the columns you want to include in the PDF report.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {AVAILABLE_PRINT_COLUMNS.map((col) => (
            <div key={col.id} className="flex items-center space-x-2">
              <Checkbox
                id={`col-${col.id}`}
                checked={selected.includes(col.id)}
                onCheckedChange={(checked) => toggleColumn(col.id, checked as boolean)}
              />
              <Label
                htmlFor={`col-${col.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {col.label}
              </Label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selected.length === 0}>
            Generate PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
