"use client";

import * as React from "react";
import type {
  VehicleJobOrder,
  VehicleOption,
  UserOption,
  VehiclePartOption,
  CreateJORequestPayload,
  ApproveAssignPayload,
  IssuePartsPayload,
  CompleteJOPayload,
} from "../types";
import {
  fetchJobOrders,
  fetchMaintenanceOptions,
  createJobOrderRequest,
  approveOrRejectJobOrder,
  startMaintenance,
  issueJobOrderParts,
  completeJobOrder,
} from "../provider/fetchProviders";

export function useMaintenance() {
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [jobOrders, setJobOrders] = React.useState<VehicleJobOrder[]>([]);
  const [vehicles, setVehicles] = React.useState<VehicleOption[]>([]);
  const [users, setUsers] = React.useState<UserOption[]>([]);
  const [parts, setParts] = React.useState<VehiclePartOption[]>([]);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [joList, opts] = await Promise.all([
        fetchJobOrders(),
        fetchMaintenanceOptions(),
      ]);
      setJobOrders(joList);
      setVehicles(opts.vehicles);
      setUsers(opts.users);
      setParts(opts.parts);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions
  const handleCreateRequest = async (payload: CreateJORequestPayload) => {
    try {
      setActionLoading(true);
      await createJobOrderRequest(payload);
      await loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveAssign = async (payload: ApproveAssignPayload) => {
    try {
      setActionLoading(true);
      await approveOrRejectJobOrder(payload);
      await loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartMaintenance = async (joId: number) => {
    try {
      setActionLoading(true);
      await startMaintenance(joId);
      await loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleIssueParts = async (payload: IssuePartsPayload) => {
    try {
      setActionLoading(true);
      await issueJobOrderParts(payload);
      await loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteJO = async (payload: CompleteJOPayload) => {
    try {
      setActionLoading(true);
      await completeJobOrder(payload);
      await loadData();
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered rows
  const filteredJobOrders = React.useMemo(() => {
    return jobOrders.filter((jo) => {
      const matchesStatus =
        statusFilter === "all" || jo.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesType =
        typeFilter === "all" || jo.jo_type.toLowerCase() === typeFilter.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesStatus && matchesType;

      const vehiclePlate =
        typeof jo.vehicle_id === "object" && jo.vehicle_id !== null
          ? jo.vehicle_id.vehicle_plate || jo.vehicle_id.plate_number || ""
          : "";
      const vehicleDesc =
        typeof jo.vehicle_id === "object" && jo.vehicle_id !== null
          ? `${jo.vehicle_id.make || ""} ${jo.vehicle_id.model || ""} ${jo.vehicle_id.name || ""}`
          : "";

      const joNo = jo.jo_no || "";
      const desc = jo.description || "";

      const matchesSearch =
        joNo.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q) ||
        vehiclePlate.toLowerCase().includes(q) ||
        vehicleDesc.toLowerCase().includes(q);

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [jobOrders, statusFilter, typeFilter, searchQuery]);

  return {
    loading,
    actionLoading,
    error,
    jobOrders: filteredJobOrders,
    rawJobOrders: jobOrders,
    vehicles,
    users,
    parts,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    refresh: loadData,
    createRequest: handleCreateRequest,
    approveAssign: handleApproveAssign,
    startRepair: handleStartMaintenance,
    issueParts: handleIssueParts,
    completeJO: handleCompleteJO,
  };
}
