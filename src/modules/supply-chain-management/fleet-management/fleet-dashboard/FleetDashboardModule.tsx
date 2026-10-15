"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFleetDashboard } from "./hooks/useFleetDashboard";
import { FleetDashboardCards } from "./components/FleetDashboardCards";
import { FleetDashboardToolbar } from "./components/FleetDashboardToolbar";
import { FleetDashboardTable } from "./components/FleetDashboardTable";

export default function FleetDashboardModule() {
  const {
    data,
    loading,
    error,
    activeCard,
    setActiveCard,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    paginatedList,
    refresh,
  } = useFleetDashboard();

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Module Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Fleet Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Overview and aggregated metrics across Fleet Management operations.
        </p>
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overview Metric Cards */}
      <FleetDashboardCards
        summary={data?.summary}
        loading={loading}
        activeCard={activeCard}
        onSelectCard={setActiveCard}
      />

      {/* Detailed Section */}
      <div className="space-y-4 pt-4 border-t">
        <FleetDashboardToolbar
          activeCard={activeCard}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onRefresh={refresh}
          loading={loading}
          totalCount={totalItems}
        />

        <FleetDashboardTable
          activeCard={activeCard}
          rows={paginatedList}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
