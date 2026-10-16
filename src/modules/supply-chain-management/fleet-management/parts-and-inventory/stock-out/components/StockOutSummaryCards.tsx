"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, DollarSign, Layers, Trash2 } from "lucide-react";

interface StockOutSummaryCardsProps {
  totalTransactions: number;
  totalQty: number;
  totalValuation: number;
  issueCount: number;
  scrapDisposalCount: number;
}

export function StockOutSummaryCards({
  totalTransactions,
  totalQty,
  totalValuation,
  issueCount,
  scrapDisposalCount,
}: StockOutSummaryCardsProps) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <Card className="shadow-none">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Total Outbound Events</p>
            <p className="text-2xl font-bold tracking-tight">{totalTransactions}</p>
          </div>
          <div className="h-9 w-9 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Layers className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Total Units Discharged</p>
            <p className="text-2xl font-bold tracking-tight">{totalQty.toLocaleString()}</p>
          </div>
          <div className="h-9 w-9 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Outbound Valuation</p>
            <p className="text-2xl font-bold tracking-tight">
              ₱{totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            <p className="text-xs font-medium text-muted-foreground">Maintenance vs Waste/Scrap</p>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-sm font-bold text-foreground">{issueCount} JOs</span>
              <span className="text-xs text-muted-foreground">/</span>
              <span className="text-sm font-semibold text-rose-600">{scrapDisposalCount} Scrap</span>
            </div>
          </div>
          <div className="h-9 w-9 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Trash2 className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
