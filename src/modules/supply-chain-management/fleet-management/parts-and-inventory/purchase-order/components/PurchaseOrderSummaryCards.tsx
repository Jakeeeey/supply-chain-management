"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, DollarSign, FileCheck } from "lucide-react";

interface PurchaseOrderSummaryCardsProps {
  totalDeficitItems: number;
  criticalCount: number;
  estimatedReplenishmentCost: number;
  pendingPrsCount: number;
}

export function PurchaseOrderSummaryCards({
  totalDeficitItems,
  criticalCount,
  estimatedReplenishmentCost,
  pendingPrsCount,
}: PurchaseOrderSummaryCardsProps) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <Card className="shadow-none">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Items Below Reorder Point</p>
            <p className="text-2xl font-bold tracking-tight">{totalDeficitItems}</p>
          </div>
          <div className="h-9 w-9 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Critical Stockouts (0 On-Hand)</p>
            <p className="text-2xl font-bold tracking-tight text-rose-600">{criticalCount}</p>
          </div>
          <div className="h-9 w-9 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Est. Replenishment Cost</p>
            <p className="text-2xl font-bold tracking-tight">
              ₱{estimatedReplenishmentCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="h-9 w-9 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Pending Purchase Requests</p>
            <p className="text-2xl font-bold tracking-tight">{pendingPrsCount}</p>
          </div>
          <div className="h-9 w-9 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileCheck className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
