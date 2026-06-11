"use client";

import React from "react";
import { useStockAdjustmentSummary } from "../hooks/useStockAdjustmentSummary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Warehouse,
  Boxes,
  FileCheck2,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

export function OverviewKPIs() {
  const { kpis, branchData } = useStockAdjustmentSummary();
  const {
    postedCount,
    unpostedCount,
    postingRate,
    totalStockInValue,
    totalStockOutValue,
    netImpact,
    grossValue,
    totalItemsCount
  } = kpis;

  return (
    <div className="flex flex-col gap-4">
      {/* 4 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Gross Adjusted Value */}
        <Card className="border border-border/40 shadow-sm rounded-xl overflow-hidden relative group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-indigo-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gross Adjusted Value</CardTitle>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              ₱{grossValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">
              Total cumulative adjustments value
            </p>
          </CardContent>
        </Card>

        {/* Stock In Value */}
        <Card className="border border-border/40 shadow-sm rounded-xl overflow-hidden relative group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Stock In (+)</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-500">
              ₱{totalStockInValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">
              Sum of positive correction values
            </p>
          </CardContent>
        </Card>

        {/* Stock Out Value */}
        <Card className="border border-border/40 shadow-sm rounded-xl overflow-hidden relative group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-rose-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Stock Out (-)</CardTitle>
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-500">
              ₱{totalStockOutValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">
              Sum of negative correction values
            </p>
          </CardContent>
        </Card>

        {/* Posting Rate */}
        <Card className="border border-border/40 shadow-sm rounded-xl overflow-hidden relative group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Posting Rate</CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {postingRate.toFixed(1)}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">
              <span className="text-amber-500 font-bold">{postedCount}</span> posted / <span className="font-bold">{unpostedCount}</span> draft
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid for Extra Mini-Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Items Adjusted */}
        <div className="bg-card/45 border border-border/40 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Items Adjusted</span>
            <span className="text-lg font-extrabold text-foreground">{totalItemsCount.toLocaleString()} units</span>
          </div>
        </div>

        {/* Branches Active */}
        <div className="bg-card/45 border border-border/40 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl">
            <Warehouse className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Branches Active</span>
            <span className="text-lg font-extrabold text-foreground">{branchData.length} locations</span>
          </div>
        </div>

        {/* Net Stock Impact */}
        <div className="bg-card/45 border border-border/40 p-4 rounded-xl flex items-center gap-4">
          <div className={`${netImpact >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"} p-3 rounded-xl`}>
            {netImpact >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Net Stock Impact</span>
            <span className={`text-lg font-extrabold ${netImpact >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {netImpact >= 0 ? "+" : ""}₱{netImpact.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
