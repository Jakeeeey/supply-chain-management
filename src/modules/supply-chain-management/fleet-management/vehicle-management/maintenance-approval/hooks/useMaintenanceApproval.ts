"use client";

import * as React from "react";
import type { VehicleJobOrder, UserOption, ApproveAssignPayload } from "../types";
import {
  fetchRequestedJobOrders,
  fetchApprovalOptions,
  approveOrRejectJobOrder,
} from "../provider/fetchProviders";
import { toast } from "sonner";

export function useMaintenanceApproval() {
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [jobOrders, setJobOrders] = React.useState<VehicleJobOrder[]>([]);
  const [users, setUsers] = React.useState<UserOption[]>([]);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");

  // Pagination states
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [jos, opt] = await Promise.all([
        fetchRequestedJobOrders(),
        fetchApprovalOptions().catch(() => ({ users: [] })),
      ]);
      setJobOrders(jos);
      setUsers(opt.users);
    } catch (err) {
      console.error("Error loading maintenance approval data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter]);

  const approveAssign = async (payload: ApproveAssignPayload) => {
    setActionLoading(true);
    try {
      await approveOrRejectJobOrder(payload);
      if (payload.decision === "Approved") {
        toast.success("Job order approved and mechanic assigned successfully!");
      } else {
        toast.success("Job order request has been rejected.");
      }
      await loadData();
    } catch (err: unknown) {
      console.error("Error approving/rejecting job order:", err);
      const e = err as Error;
      toast.error(e?.message || "Failed to process job order approval.");
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const filteredJobOrders = React.useMemo(() => {
    return jobOrders.filter((jo) => {
      // Type Filter
      if (typeFilter !== "all" && jo.jo_type !== typeFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const joNo = jo.jo_no?.toLowerCase() || "";
        const desc = jo.description?.toLowerCase() || "";
        const v = typeof jo.vehicle_id === "object" && jo.vehicle_id !== null ? jo.vehicle_id : null;
        const plate = (v?.vehicle_plate || v?.plate_number || v?.name || "").toLowerCase();
        const makeModel = [v?.make, v?.model].filter(Boolean).join(" ").toLowerCase();

        return joNo.includes(q) || desc.includes(q) || plate.includes(q) || makeModel.includes(q);
      }

      return true;
    });
  }, [jobOrders, typeFilter, searchQuery]);

  // Paginated records
  const paginatedJobOrders = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredJobOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredJobOrders, currentPage, pageSize]);

  return {
    loading,
    actionLoading,
    jobOrders: paginatedJobOrders,
    rawJobOrders: jobOrders,
    totalCount: filteredJobOrders.length,
    users,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    refresh: loadData,
    approveAssign,
  };
}
