"use client";

import * as React from "react";
import type { VehicleJobOrder } from "./types";
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
    parts,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    refresh,
    startMaintenance,
    issueParts,
  } = useMaintenanceStart();

  const [openIssueParts, setOpenIssueParts] = React.useState(false);
  const [openDetails, setOpenDetails] = React.useState(false);
  const [selectedJO, setSelectedJO] = React.useState<VehicleJobOrder | null>(null);

  const handleOpenIssueParts = (jo: VehicleJobOrder) => {
    setSelectedJO(jo);
    setOpenIssueParts(true);
  };

  const handleViewDetails = (jo: VehicleJobOrder) => {
    setSelectedJO(jo);
    setOpenDetails(true);
  };

  const handleStartMaintenance = async (jo: VehicleJobOrder) => {
    if (!jo?.id) return;
    try {
      await startMaintenance(jo.id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Maintenance Start</h1>
        <p className="text-xs text-muted-foreground">
          View approved vehicle maintenance job orders, issue required parts, and initiate maintenance repair operations.
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
        onOpenIssueParts={handleOpenIssueParts}
        onStartMaintenance={handleStartMaintenance}
      />

      {/* Dialogs */}
      <IssuePartsDialog
        open={openIssueParts}
        onOpenChange={setOpenIssueParts}
        jobOrder={selectedJO}
        parts={parts}
        onSubmit={issueParts}
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
