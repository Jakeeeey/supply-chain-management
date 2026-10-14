import * as React from "react";
import type { IssuePartsInput, JobOrderPart, JobOrderRef } from "../types";
import type { VehiclePart } from "../../registration/types";
import type { Branch } from "../../stock-in/types";
import {
  fetchBranches,
  fetchIssuedPartsHistory,
  fetchJobOrders,
  fetchVehicleParts,
  issuePartsToJobOrder,
} from "../provider/fetchProviders";

export function useReserveModule() {
  const [issuedParts, setIssuedParts] = React.useState<JobOrderPart[]>([]);
  const [jobOrders, setJobOrders] = React.useState<JobOrderRef[]>([]);
  const [parts, setParts] = React.useState<VehiclePart[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [selectedJoFilter, setSelectedJoFilter] = React.useState<string>("all");

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [historyData, josData, partsData, branchesData] = await Promise.all([
        fetchIssuedPartsHistory(selectedJoFilter !== "all" ? Number(selectedJoFilter) : undefined),
        fetchJobOrders(),
        fetchVehicleParts(),
        fetchBranches(),
      ]);
      setIssuedParts(historyData);
      setJobOrders(josData);
      setParts(partsData.filter((p) => p.is_active));
      setBranches(branchesData);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e?.message || "Failed to load Job Order parts data");
    } finally {
      setLoading(false);
    }
  }, [selectedJoFilter]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleIssueParts = async (payload: IssuePartsInput) => {
    try {
      setSaving(true);
      await issuePartsToJobOrder(payload);
      await loadData();
      return true;
    } catch (err: unknown) {
      const e = err as Error;
      setError(e?.message || "Failed to issue parts");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const filteredHistory = React.useMemo(() => {
    if (!search.trim()) return issuedParts;
    const q = search.toLowerCase();
    return issuedParts.filter((item) => {
      const jo = typeof item.job_order_id === "object" && item.job_order_id !== null ? item.job_order_id : null;
      const joNo = jo?.jo_no || String(item.job_order_id || "");
      const part = typeof item.part_id === "object" && item.part_id !== null ? item.part_id : null;
      const partCode = part?.part_code || "";
      const partName = part?.part_name || "";
      const remarks = item.remarks || "";

      return (
        joNo.toLowerCase().includes(q) ||
        partCode.toLowerCase().includes(q) ||
        partName.toLowerCase().includes(q) ||
        remarks.toLowerCase().includes(q)
      );
    });
  }, [issuedParts, search]);

  return {
    issuedParts: filteredHistory,
    jobOrders,
    parts,
    branches,
    loading,
    saving,
    error,
    search,
    setSearch,
    selectedJoFilter,
    setSelectedJoFilter,
    reload: loadData,
    issueParts: handleIssueParts,
  };
}
