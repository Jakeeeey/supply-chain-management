"use client";

import * as React from "react";
import type { VehicleJobOrder } from "./types";
import { useMaintenanceProgress } from "./hooks/useMaintenanceProgress";
import { MaintenanceProgressToolbar } from "./components/MaintenanceProgressToolbar";
import { MaintenanceProgressTable } from "./components/MaintenanceProgressTable";
import { CompleteJODialog } from "./components/CompleteJODialog";
import { JODetailsDialog } from "./components/JODetailsDialog";

export default function MaintenanceProgressModule() {
  const {
    loading,
    actionLoading,
    jobOrders,
    rawJobOrders,
    totalCount,
    parts,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    refresh,
    loadPartsForBranch,
    completeJO,
  } = useMaintenanceProgress();

  const [openComplete, setOpenComplete] = React.useState(false);
  const [openDetails, setOpenDetails] = React.useState(false);
  const [selectedJO, setSelectedJO] = React.useState<VehicleJobOrder | null>(null);

  const handleOpenComplete = async (jo: VehicleJobOrder) => {
    setSelectedJO(jo);
    const branchId =
      typeof jo.branch_id === "object" && jo.branch_id !== null
        ? jo.branch_id.id
        : jo.branch_id;
    if (branchId) {
      await loadPartsForBranch(branchId);
    }
    setOpenComplete(true);
  };

  const handleViewDetails = (jo: VehicleJobOrder) => {
    setSelectedJO(jo);
    setOpenDetails(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Maintenance Progress</h1>
        <p className="text-xs text-muted-foreground">
          Track ongoing vehicle repairs, review allocated parts or log additional parts used, and record completion details.
        </p>
      </div>

      <MaintenanceProgressToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        onRefresh={refresh}
        inProgressCount={rawJobOrders.length}
      />

      <MaintenanceProgressTable
        jobOrders={jobOrders}
        loading={loading}
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        onViewDetails={handleViewDetails}
        onOpenComplete={handleOpenComplete}
      />

      {/* Unified Complete JO Modal with Part Allocation Review & Difference Calculation */}
      <CompleteJODialog
        open={openComplete}
        onOpenChange={setOpenComplete}
        jobOrder={selectedJO}
        parts={parts}
        onSubmit={completeJO}
        loading={actionLoading}
      />

      <JODetailsDialog
        open={openDetails}
        onOpenChange={setOpenDetails}
        jobOrder={selectedJO}
      />
    </div>
  );
}
