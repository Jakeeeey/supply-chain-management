"use client";

import * as React from "react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Plus, TrendingDown, CheckCircle2 } from "lucide-react";

import { useDispatchSummary } from "./hooks/useDispatchSummary";
import { ChartsPanel, DispatchTable, PrintDialog, StatCard } from "./components";

function StatValueSkeleton() {
  return <Skeleton className="h-9 w-14 rounded-md" />;
}

export default function DispatchSummaryModule() {
  const s = useDispatchSummary();

  if (s.error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive">
        🚨 Error: {s.error}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">🚚 Dispatch Summary Dashboard (Active)</h1>
          <p className="text-muted-foreground">For Dispatch, In Transit, and For Clearance.</p>
        </div>
      </div>

      <Separator className="my-6" />

      {/* KPI Cards — ALWAYS 1 ROW */}
      <div className="flex gap-4 min-w-0">
        <div className="flex-1 min-w-0">
          <StatCard
            title="Total Visible"
            value={s.loading ? <StatValueSkeleton /> : s.stats.total}
            icon={Clock}
            iconBgClassName="bg-blue-100"
            iconClassName="text-blue-600"
          />
        </div>

        <div className="flex-1 min-w-0">
          <StatCard
            title="For Dispatch"
            value={s.loading ? <StatValueSkeleton /> : s.stats.forDispatch}
            icon={Plus}
            iconBgClassName="bg-blue-100"
            iconClassName="text-blue-600"
          />
        </div>

        <div className="flex-1 min-w-0">
          <StatCard
            title="For Inbound"
            value={s.loading ? <StatValueSkeleton /> : s.stats.forInbound}
            icon={TrendingDown}
            iconBgClassName="bg-purple-100"
            iconClassName="text-purple-600"
          />
        </div>

        <div className="flex-1 min-w-0">
          <StatCard
            title="For Clearance"
            value={s.loading ? <StatValueSkeleton /> : s.stats.forClearance}
            icon={CheckCircle2}
            iconBgClassName="bg-pink-100"
            iconClassName="text-pink-600"
          />
        </div>
      </div>

      <Separator className="my-6" />

      {/* Charts */}
      <ChartsPanel loading={s.loading} statusChartData={s.statusChartData} weeklyTrendData={s.weeklyTrendData} />

      <Separator className="my-6" />

      {/* Table */}
      <DispatchTable
        loading={s.loading}
        rows={s.currentTableData}
        statusFilter={s.statusFilter}
        setStatusFilter={s.setStatusFilter}
        dateFilter={s.dateFilter}
        setDateFilter={s.setDateFilter}
        customStartDate={s.customStartDate}
        setCustomStartDate={s.setCustomStartDate}
        customEndDate={s.customEndDate}
        setCustomEndDate={s.setCustomEndDate}
        onOpenPrint={() => s.setIsPrintOpen(true)}
        currentPage={s.currentPage}
        setCurrentPage={s.setCurrentPage}
        totalPages={s.totalPages}
        indexOfFirstItem={s.indexOfFirstItem}
        indexOfLastItem={s.indexOfLastItem}
        totalCount={s.filteredTableData.length}
      />

      {/* Print dialog */}
      <PrintDialog
        open={s.isPrintOpen}
        onOpenChange={s.setIsPrintOpen}
        visibleTablePlans={s.visibleTablePlans}
        uniqueDrivers={s.uniqueDrivers}
        uniqueSalesmen={s.uniqueSalesmen}
        uniqueVehicles={s.uniqueVehicles}
        uniqueStatuses={s.uniqueStatuses}
        printDriver={s.printDriver}
        setPrintDriver={s.setPrintDriver}
        printSalesman={s.printSalesman}
        setPrintSalesman={s.setPrintSalesman}
        printVehicle={s.printVehicle}
        setPrintVehicle={s.setPrintVehicle}
        printStatus={s.printStatus}
        setPrintStatus={s.setPrintStatus}
        printDateRange={s.printDateRange}
        setPrintDateRange={s.setPrintDateRange}
        printCustomStart={s.printCustomStart}
        setPrintCustomStart={s.setPrintCustomStart}
        printCustomEnd={s.printCustomEnd}
        setPrintCustomEnd={s.setPrintCustomEnd}
      />
    </div>
  );
}
