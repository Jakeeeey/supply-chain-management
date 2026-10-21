"use client";

import * as React from "react";
import type { VehicleJobOrder } from "./types";
import { useMaintenanceProgress } from "./hooks/useMaintenanceProgress";
import { MaintenanceProgressToolbar } from "./components/MaintenanceProgressToolbar";
import { MaintenanceProgressTable } from "./components/MaintenanceProgressTable";
import { IssuePartsDialog } from "./components/IssuePartsDialog";
import { CompleteJODialog } from "./components/CompleteJODialog";
import { JODetailsDialog } from "./components/JODetailsDialog";

export default function MaintenanceProgressModule() {
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
    issueParts,
    completeJO,
  } = useMaintenanceProgress();

  const [openIssueParts, setOpenIssueParts] = React.useState(false);
  const [openComplete, setOpenComplete] = React.useState(false);
  const [openDetails, setOpenDetails] = React.useState(false);
  const [selectedJO, setSelectedJO] = React.useState<VehicleJobOrder | null>(null);

  const handleOpenIssueParts = (jo: VehicleJobOrder) => {
    setSelectedJO(jo);
    setOpenIssueParts(true);
  };

  const handleOpenComplete = (jo: VehicleJobOrder) => {
    setSelectedJO(jo);
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
          Track ongoing vehicle repairs, issue additional replacement parts, and record completion details.
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
        onViewDetails={handleViewDetails}
        onOpenIssueParts={handleOpenIssueParts}
        onOpenComplete={handleOpenComplete}
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

      <CompleteJODialog
        open={openComplete}
        onOpenChange={setOpenComplete}
        jobOrder={selectedJO}
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
