"use client";

import * as React from "react";
import type { VehicleJobOrder } from "./types";
import { useMaintenance } from "./hooks/useMaintenance";
import { MaintenanceToolbar } from "./components/MaintenanceToolbar";
import { JobOrdersTable } from "./components/JobOrdersTable";
import { CreateJODialog } from "./components/CreateJODialog";
import { ApproveAssignDialog } from "./components/ApproveAssignDialog";
import { IssuePartsDialog } from "./components/IssuePartsDialog";
import { CompleteJODialog } from "./components/CompleteJODialog";
import { JODetailsDialog } from "./components/JODetailsDialog";

export default function MaintenanceModule() {
  const {
    loading,
    actionLoading,
    jobOrders,
    rawJobOrders,
    vehicles,
    users,
    parts,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    refresh,
    createRequest,
    approveAssign,
    startRepair,
    issueParts,
    completeJO,
  } = useMaintenance();

  // Dialog states
  const [openCreate, setOpenCreate] = React.useState(false);
  const [openApprove, setOpenApprove] = React.useState(false);
  const [openIssueParts, setOpenIssueParts] = React.useState(false);
  const [openComplete, setOpenComplete] = React.useState(false);
  const [openDetails, setOpenDetails] = React.useState(false);

  const [selectedJO, setSelectedJO] = React.useState<VehicleJobOrder | null>(null);

  // Status counts for tabs
  const counts = React.useMemo(() => {
    return {
      all: rawJobOrders.length,
      requested: rawJobOrders.filter((j) => j.status?.toLowerCase() === "requested").length,
      approved: rawJobOrders.filter((j) => j.status?.toLowerCase() === "approved").length,
      inProgress: rawJobOrders.filter((j) => j.status?.toLowerCase() === "in progress").length,
      completed: rawJobOrders.filter((j) => j.status?.toLowerCase() === "completed").length,
    };
  }, [rawJobOrders]);

  const handleOpenApproveModal = (jo: VehicleJobOrder) => {
    setSelectedJO(jo);
    setOpenApprove(true);
  };

  const handleOpenIssueModal = (jo: VehicleJobOrder) => {
    setSelectedJO(jo);
    setOpenIssueParts(true);
  };

  const handleOpenCompleteModal = (jo: VehicleJobOrder) => {
    setSelectedJO(jo);
    setOpenComplete(true);
  };

  const handleViewDetailsModal = (jo: VehicleJobOrder) => {
    setSelectedJO(jo);
    setOpenDetails(true);
  };

  return (
    <div className="space-y-6 p-6">
      <MaintenanceToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        onOpenCreate={() => setOpenCreate(true)}
        onRefresh={refresh}
        counts={counts}
      />

      <JobOrdersTable
        jobOrders={jobOrders}
        loading={loading}
        onViewDetails={handleViewDetailsModal}
        onOpenApprove={handleOpenApproveModal}
        onOpenIssueParts={handleOpenIssueModal}
        onStartMaintenance={(jo) => startRepair(jo.id)}
        onOpenComplete={handleOpenCompleteModal}
      />

      {/* Dialogs */}
      <CreateJODialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        vehicles={vehicles}
        parts={parts}
        onSubmit={createRequest}
        loading={actionLoading}
      />

      <ApproveAssignDialog
        open={openApprove}
        onOpenChange={setOpenApprove}
        jobOrder={selectedJO}
        users={users}
        onSubmit={approveAssign}
        loading={actionLoading}
      />

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
