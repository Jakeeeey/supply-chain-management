"use client";

import * as React from "react";
import type { ReorderTriggerItem } from "../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Layers } from "lucide-react";

interface ReorderTriggersTableProps {
  items: ReorderTriggerItem[];
  loading: boolean;
  onRequestReorder: (item: ReorderTriggerItem) => void;
  selectedItems?: ReorderTriggerItem[];
  onSelectionChange?: (items: ReorderTriggerItem[]) => void;
  onBulkReorder?: () => void;
}

export function ReorderTriggersTable({
  items,
  loading,
  onRequestReorder,
  selectedItems = [],
  onSelectionChange,
  onBulkReorder,
}: ReorderTriggersTableProps) {
  if (loading && items.length === 0) {
    return (
      <div className="rounded-md border p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-10 text-center">
        <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
          <ShoppingCart className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-semibold">All inventory levels are healthy!</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          No parts have reached or fallen below their reorder threshold across selected branches.
        </p>
      </div>
    );
  }

  const isAllSelected = items.length > 0 && selectedItems.length === items.length;
  const isSomeSelected = selectedItems.length > 0 && selectedItems.length < items.length;

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange([...items]);
    } else {
      onSelectionChange([]);
    }
  };

  const handleToggleItem = (item: ReorderTriggerItem, checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange([...selectedItems, item]);
    } else {
      onSelectionChange(selectedItems.filter((i) => !(i.part_id === item.part_id && i.branch_id === item.branch_id)));
    }
  };

  const isItemSelected = (item: ReorderTriggerItem) => {
    return selectedItems.some((i) => i.part_id === item.part_id && i.branch_id === item.branch_id);
  };

  const selectedTotalCost = React.useMemo(() => {
    return selectedItems.reduce((acc, it) => acc + (it.suggested_quantity * it.unit_cost), 0);
  }, [selectedItems]);

  return (
    <div className="space-y-2">
      {/* Bulk Action Banner when items are selected */}
      {selectedItems.length > 0 && (
        <div className="flex items-center justify-between rounded-md bg-primary/10 border border-primary/20 px-3 py-2 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">
              {selectedItems.length} {selectedItems.length === 1 ? "part" : "parts"} selected
            </span>
            <span className="text-muted-foreground">
              (Est. Total: ₱{selectedTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSelectionChange?.([])}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Deselect All
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onBulkReorder}
              className="h-7 text-xs gap-1.5 font-medium shadow-xs"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Bulk Reorder ({selectedItems.length})
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {onSelectionChange && (
                <TableHead className="w-10 px-3">
                  <Checkbox
                    checked={isAllSelected ? true : isSomeSelected ? "indeterminate" : false}
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    aria-label="Select all parts"
                  />
                </TableHead>
              )}
              <TableHead>Part Code & Name</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className="text-right">On-Hand</TableHead>
              <TableHead className="text-right">Reorder Point</TableHead>
              <TableHead className="text-right">Deficit (Shortage)</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Suggested Order</TableHead>
              <TableHead className="text-center">Severity</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const isOutOfStock = item.on_hand <= 0;
              const lineEstimatedCost = item.suggested_quantity * item.unit_cost;
              const selected = isItemSelected(item);

              return (
                <TableRow
                  key={`${item.id}-${item.part_id}-${item.branch_id}`}
                  className={selected ? "bg-primary/5 dark:bg-primary/10" : undefined}
                >
                  {onSelectionChange && (
                    <TableCell className="w-10 px-3">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={(checked) => handleToggleItem(item, Boolean(checked))}
                        aria-label={`Select ${item.part_name}`}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="text-xs font-mono font-medium">{item.part_code}</div>
                    <div className="text-xs text-muted-foreground font-normal">{item.part_name}</div>
                  </TableCell>
                  <TableCell className="text-xs">{item.branch_name}</TableCell>
                  <TableCell className="text-right font-bold text-xs">
                    <span className={isOutOfStock ? "text-rose-600 font-extrabold" : "text-amber-600"}>
                      {item.on_hand}
                    </span>{" "}
                    <span className="text-[10px] text-muted-foreground font-normal">{item.unit}</span>
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium text-muted-foreground">
                    {item.reorder_point} {item.unit}
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold text-rose-600">
                    -{item.deficit} {item.unit}
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium">
                    ₱{item.unit_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right text-xs font-bold text-foreground">
                    {item.suggested_quantity} {item.unit}{" "}
                    <span className="text-[10px] text-muted-foreground block font-normal">
                      ≈ ₱{lineEstimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {isOutOfStock ? (
                      <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                        Critical Stockout
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 font-semibold">
                        Low Stock
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRequestReorder(item)}
                      className="h-8 text-xs gap-1 border-primary/40 hover:bg-primary/10 text-primary font-medium"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Reorder
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
