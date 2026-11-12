"use client";

import * as React from "react";
import type { VehicleJobOrder, IssuePartsPayload } from "./types";
import { useMaintenanceStart } from "./hooks/useMaintenanceStart";
import { MaintenanceStartToolbar } from "./components/MaintenanceStartToolbar";
import { MaintenanceStartTable } from "./components/MaintenanceStartTable";
import { IssuePartsDialog } from "./components/IssuePartsDialog";
import { JODetailsDialog } from "./components/JODetailsDialog";

export default function MaintenanceStartModule() {
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
    startMaintenance,
    issueParts,
  } = useMaintenanceStart();

  const [openIssueParts, setOpenIssueParts] = React.useState(false);
  const [openDetails, setOpenDetails] = React.useState(false);
  const [selectedJO, setSelectedJO] = React.useState<VehicleJobOrder | null>(null);

  const handleStartMaintenanceClick = async (jo: VehicleJobOrder) => {
    setSelectedJO(jo);
    const branchId =
      typeof jo.branch_id === "object" && jo.branch_id !== null
        ? jo.branch_id.id
        : jo.branch_id;
    if (branchId) {
      await loadPartsForBranch(branchId);
    }
    setOpenIssueParts(true);
  };

  const handleViewDetails = (jo: VehicleJobOrder) => {
    setSelectedJO(jo);
    setOpenDetails(true);
  };

  const handleModalSubmit = async ({
    issuePayload,
    startMaintenance: shouldStart,
  }: {
    issuePayload?: IssuePartsPayload;
    startMaintenance: boolean;
  }) => {
    if (!selectedJO?.id) return;
    try {
      if (issuePayload && issuePayload.items.length > 0) {
        await issueParts(issuePayload);
      }
      if (shouldStart) {
        await startMaintenance(selectedJO.id);
      }
    } catch (err) {
      console.error("Error in maintenance start and part allocation flow:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Maintenance Start</h1>
        <p className="text-xs text-muted-foreground">
          View approved vehicle maintenance job orders, allocate required parts, and initiate maintenance repair operations.
        </p>
      </div>

      <MaintenanceStartToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        onRefresh={refresh}
        approvedCount={rawJobOrders.length}
      />

      <MaintenanceStartTable
        jobOrders={jobOrders}
        loading={loading}
        onViewDetails={handleViewDetails}
        onStartMaintenance={handleStartMaintenanceClick}
        currentPage={currentPage}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* Mandatory Part Allocation & Start Maintenance Dialog */}
      <IssuePartsDialog
        open={openIssueParts}
        onOpenChange={setOpenIssueParts}
        jobOrder={selectedJO}
        parts={parts}
        onSubmit={handleModalSubmit}
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
