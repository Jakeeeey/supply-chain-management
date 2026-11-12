"use client";

import * as React from "react";
import type {
  VehicleJobOrder,
  VehicleOption,
  UserOption,
  VehiclePartOption,
  BranchOption,
  VehicleJOTypeOption,
  CreateJORequestPayload,
  UpdateJORequestPayload,
  ApproveAssignPayload,
  IssuePartsPayload,
  CompleteJOPayload,
} from "../types";
import {
  fetchJobOrders,
  fetchMaintenanceOptions,
  createJobOrderRequest,
  updateJobOrderRequest,
  approveOrRejectJobOrder,
  startMaintenance,
  issueJobOrderParts,
  completeJobOrder,
} from "../provider/fetchProviders";
import { toast } from "sonner";

export function useMaintenance() {
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [jobOrders, setJobOrders] = React.useState<VehicleJobOrder[]>([]);
  const [vehicles, setVehicles] = React.useState<VehicleOption[]>([]);
  const [users, setUsers] = React.useState<UserOption[]>([]);
  const [parts, setParts] = React.useState<VehiclePartOption[]>([]);
  const [branches, setBranches] = React.useState<BranchOption[]>([]);
  const [joTypes, setJoTypes] = React.useState<VehicleJOTypeOption[]>([]);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");

  // Pagination states
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const loadData = React.useCallback(async (selectedBranchId?: number | string) => {
    try {
      setLoading(true);
      setError(null);
      const [joList, opts] = await Promise.all([
        fetchJobOrders(),
        fetchMaintenanceOptions(selectedBranchId),
      ]);
      setJobOrders(joList);
      setVehicles(opts.vehicles);
      setUsers(opts.users);
      setParts(opts.parts);
      if (opts.branches && opts.branches.length > 0) {
        setBranches(opts.branches);
      }
      if (opts.jo_types && opts.jo_types.length > 0) {
        setJoTypes(opts.jo_types);
      }
    } catch (e: unknown) {
      const err = e as Error;
      setError(err?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPartsForBranch = React.useCallback(async (branchId: number | string) => {
    try {
      const opts = await fetchMaintenanceOptions(branchId);
      setParts(opts.parts);
      return opts.parts;
    } catch {
      return [];
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter]);

  // Actions
  const handleCreateRequest = async (payload: CreateJORequestPayload) => {
    try {
      setActionLoading(true);
      await createJobOrderRequest(payload);
      toast.success("Job order request submitted successfully!");
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit JO request.");
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRequest = async (payload: UpdateJORequestPayload) => {
    try {
      setActionLoading(true);
      await updateJobOrderRequest(payload);
      toast.success("Job order request updated successfully!");
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update JO request.");
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveAssign = async (payload: ApproveAssignPayload) => {
    try {
      setActionLoading(true);
      await approveOrRejectJobOrder(payload);
      if (payload.decision === "Approved") {
        toast.success("Job order approved and mechanic assigned successfully!");
      } else {
        toast.success("Job order request has been rejected.");
      }
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to process approval.");
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartMaintenance = async (joId: number) => {
    try {
      setActionLoading(true);
      await startMaintenance(joId);
      toast.success("Maintenance started successfully!");
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to start maintenance.");
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleIssueParts = async (payload: IssuePartsPayload) => {
    try {
      setActionLoading(true);
      await issueJobOrderParts(payload);
      toast.success("Parts issued and stock deducted successfully!");
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to issue parts.");
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteJO = async (payload: CompleteJOPayload) => {
    try {
      setActionLoading(true);
      await completeJobOrder(payload);
      toast.success("Job order completed successfully!");
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete job order.");
      throw err;
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

  // Paginated rows
  const paginatedJobOrders = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredJobOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredJobOrders, currentPage, pageSize]);

  return {
    loading,
    actionLoading,
    error,
    jobOrders: paginatedJobOrders,
    totalCount: filteredJobOrders.length,
    rawJobOrders: jobOrders,
    vehicles,
    users,
    parts,
    branches,
    joTypes,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    refresh: loadData,
    loadPartsForBranch,
    createRequest: handleCreateRequest,
    updateRequest: handleUpdateRequest,
    approveAssign: handleApproveAssign,
    startRepair: handleStartMaintenance,
    issueParts: handleIssueParts,
    completeJO: handleCompleteJO,
  };
}
