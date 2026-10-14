"use client";

import * as React from "react";
import type { StockMonitoringKpis } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertTriangle, XCircle, DollarSign } from "lucide-react";

interface StockMonitoringKpiCardsProps {
  kpis: StockMonitoringKpis;
}

export function StockMonitoringKpiCards({ kpis }: StockMonitoringKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border border-border/60 shadow-xs">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Total Catalog SKUs</p>
            <p className="text-2xl font-bold tracking-tight">{kpis.totalSkus}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Package className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 shadow-xs">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Total Valuation</p>
            <p className="text-2xl font-bold tracking-tight">
              ₱{kpis.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <DollarSign className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 shadow-xs">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-amber-600">Low Stock Alerts</p>
            <p className="text-2xl font-bold tracking-tight text-amber-600">{kpis.lowStockCount}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 shadow-xs">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-destructive">Out of Stock</p>
            <p className="text-2xl font-bold tracking-tight text-destructive">{kpis.outOfStockCount}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
            <XCircle className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
