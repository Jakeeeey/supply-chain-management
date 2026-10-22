"use client";

import * as React from "react";
import type { VehicleJobOrder, UserOption, ApproveAssignPayload } from "../types";
import {
  fetchRequestedJobOrders,
  fetchApprovalOptions,
  approveOrRejectJobOrder,
} from "../provider/fetchProviders";

export function useMaintenanceApproval() {
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [jobOrders, setJobOrders] = React.useState<VehicleJobOrder[]>([]);
  const [users, setUsers] = React.useState<UserOption[]>([]);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");

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

  const approveAssign = async (payload: ApproveAssignPayload) => {
    setActionLoading(true);
    try {
      await approveOrRejectJobOrder(payload);
      await loadData();
    } catch (err) {
      console.error("Error approving/rejecting job order:", err);
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

  return {
    loading,
    actionLoading,
    jobOrders: filteredJobOrders,
    rawJobOrders: jobOrders,
    users,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    refresh: loadData,
    approveAssign,
  };
}
