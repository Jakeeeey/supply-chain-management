import * as React from "react";
import type { PurchaseRequest, ReorderTriggerItem, Supplier } from "../types";
import type { Branch } from "../../stock-in/types";
import type { VehiclePart } from "../../registration/types";
import { fetchReorderTriggersAndPRs, fetchBranches, fetchParts, updatePurchaseRequestStatus } from "../provider/fetchProviders";

export function usePurchaseOrderModule() {
  const [prs, setPrs] = React.useState<PurchaseRequest[]>([]);
  const [triggers, setTriggers] = React.useState<ReorderTriggerItem[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [parts, setParts] = React.useState<VehiclePart[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [selectedBranch, setSelectedBranch] = React.useState("all");

  const loadInitialData = React.useCallback(async () => {
    try {
      const [bData, pData] = await Promise.all([fetchBranches(), fetchParts()]);
      setBranches(bData);
      setParts(pData);
    } catch {
      // ignore
    }
  }, []);

  const loadTriggersAndPrs = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchReorderTriggersAndPRs(selectedBranch);
      setPrs(res.prs);
      setTriggers(res.triggers);
      setSuppliers(res.suppliers || []);
    } catch {
      setPrs([]);
      setTriggers([]);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  React.useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  React.useEffect(() => {
    loadTriggersAndPrs();
  }, [loadTriggersAndPrs]);

  const handleStatusUpdate = async (id: number, action: "approve" | "receive" | "cancel") => {
    try {
      setActionLoading(true);
      await updatePurchaseRequestStatus(id, action);
      await loadTriggersAndPrs();
      return true;
    } catch (e: unknown) {
      const err = e as Error;
      alert(err.message || "Failed to update status");
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  // Active PRs key set (Pending, Approved, Ordered) to prevent duplicate reorders
  const activePrKeys = React.useMemo(() => {
    const keys = new Set<string>();
    const activeStatuses = new Set(["pending", "approved", "ordered"]);
    prs.forEach((p) => {
      if (!activeStatuses.has(String(p.status || "").toLowerCase().trim())) return;
      const bId = typeof p.branch_id === "object" && p.branch_id !== null ? p.branch_id.id : p.branch_id;
      const pId = typeof p.part_id === "object" && p.part_id !== null ? p.part_id.id : p.part_id;
      if (pId && bId) keys.add(`${pId}-${bId}`);
      if (pId) keys.add(`${pId}`);
    });
    return keys;
  }, [prs]);

  // Filter triggers: only include items that don't have active PRs
  const availableTriggers = React.useMemo(() => {
    return triggers.filter((t) => {
      const key = `${t.part_id}-${t.branch_id}`;
      return !activePrKeys.has(key) && !activePrKeys.has(`${t.part_id}`);
    });
  }, [triggers, activePrKeys]);

  // Filter triggers by search query
  const filteredTriggers = React.useMemo(() => {
    if (!search.trim()) return availableTriggers;
    const s = search.toLowerCase();
    return availableTriggers.filter(
      (t) =>
        t.part_code.toLowerCase().includes(s) ||
        t.part_name.toLowerCase().includes(s) ||
        t.branch_name.toLowerCase().includes(s) ||
        t.classification_name.toLowerCase().includes(s)
    );
  }, [availableTriggers, search]);

  // Filter PRs by search query
  const filteredPrs = React.useMemo(() => {
    if (!search.trim()) return prs;
    const s = search.toLowerCase();
    return prs.filter((p) => {
      const pName = typeof p.part_id === "object" && p.part_id !== null ? p.part_id.part_name : "";
      const pCode = typeof p.part_id === "object" && p.part_id !== null ? p.part_id.part_code : "";
      return (
        p.pr_no.toLowerCase().includes(s) ||
        pName.toLowerCase().includes(s) ||
        pCode.toLowerCase().includes(s) ||
        (p.notes && p.notes.toLowerCase().includes(s))
      );
    });
  }, [prs, search]);

  // KPI Metrics
  const metrics = React.useMemo(() => {
    const totalDeficitItems = availableTriggers.length;
    let criticalCount = 0;
    let estimatedReplenishmentCost = 0;

    availableTriggers.forEach((t) => {
      if (t.on_hand <= 0) criticalCount++;
      estimatedReplenishmentCost += t.suggested_quantity * t.unit_cost;
    });

    return {
      totalDeficitItems,
      criticalCount,
      estimatedReplenishmentCost,
      pendingPrsCount: prs.filter((p) => p.status === "Pending").length,
    };
  }, [availableTriggers, prs]);

  return {
    triggers: filteredTriggers,
    prs: filteredPrs,
    branches,
    parts,
    suppliers,
    loading,
    actionLoading,
    search,
    setSearch,
    selectedBranch,
    setSelectedBranch,
    metrics,
    refresh: loadTriggersAndPrs,
    onStatusUpdate: handleStatusUpdate,
  };
}
