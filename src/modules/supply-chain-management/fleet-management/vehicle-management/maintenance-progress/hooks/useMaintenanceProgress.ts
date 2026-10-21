"use client";

import * as React from "react";
import type { VehicleJobOrder, VehiclePartOption, IssuePartsPayload, CompleteJOPayload } from "../types";
import {
  fetchInProgressJobOrders,
  fetchProgressOptions,
  issueJobOrderParts,
  completeJobOrder,
} from "../provider/fetchProviders";

export function useMaintenanceProgress() {
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [jobOrders, setJobOrders] = React.useState<VehicleJobOrder[]>([]);
  const [parts, setParts] = React.useState<VehiclePartOption[]>([]);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [jos, opt] = await Promise.all([
        fetchInProgressJobOrders(),
        fetchProgressOptions().catch(() => ({ parts: [] })),
      ]);
      setJobOrders(jos);
      setParts(opt.parts);
    } catch (err) {
      console.error("Error loading maintenance progress data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleIssueParts = async (payload: IssuePartsPayload) => {
    setActionLoading(true);
    try {
      await issueJobOrderParts(payload);
      await loadData();
    } catch (err) {
      console.error("Error issuing parts:", err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteJO = async (payload: CompleteJOPayload) => {
    setActionLoading(true);
    try {
      await completeJobOrder(payload);
      await loadData();
    } catch (err) {
      console.error("Error completing job order:", err);
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
    parts,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    refresh: loadData,
    issueParts: handleIssueParts,
    completeJO: handleCompleteJO,
  };
}
