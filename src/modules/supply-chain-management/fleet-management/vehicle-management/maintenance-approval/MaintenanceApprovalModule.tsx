"use client";

import * as React from "react";
import type { VehicleJobOrder } from "./types";
import { useMaintenanceApproval } from "./hooks/useMaintenanceApproval";
import { MaintenanceApprovalToolbar } from "./components/MaintenanceApprovalToolbar";
import { MaintenanceApprovalTable } from "./components/MaintenanceApprovalTable";
import { ApproveAssignDialog } from "./components/ApproveAssignDialog";
import { JODetailsDialog } from "./components/JODetailsDialog";

export default function MaintenanceApprovalModule() {
  const {
    loading,
    actionLoading,
    jobOrders,
    rawJobOrders,
    users,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    refresh,
    approveAssign,
  } = useMaintenanceApproval();

  const [openApprove, setOpenApprove] = React.useState(false);
  const [openDetails, setOpenDetails] = React.useState(false);
  const [selectedJO, setSelectedJO] = React.useState<VehicleJobOrder | null>(null);

  const handleOpenApproveModal = (jo: VehicleJobOrder) => {
    setSelectedJO(jo);
    setOpenApprove(true);
  };

  const handleViewDetailsModal = (jo: VehicleJobOrder) => {
    setSelectedJO(jo);
    setOpenDetails(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Maintenance Approval</h1>
        <p className="text-xs text-muted-foreground">
          Review pending vehicle maintenance requests, approve assignments, or reject requests with remarks.
        </p>
      </div>

      <MaintenanceApprovalToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        onRefresh={refresh}
        pendingCount={rawJobOrders.length}
      />

      <MaintenanceApprovalTable
        jobOrders={jobOrders}
        loading={loading}
        onViewDetails={handleViewDetailsModal}
        onOpenApprove={handleOpenApproveModal}
      />

      {/* Dialogs */}
      <ApproveAssignDialog
        open={openApprove}
        onOpenChange={setOpenApprove}
        jobOrder={selectedJO}
        users={users}
        onSubmit={approveAssign}
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
