import * as React from "react";
import type { BatchStockInInput, Branch, StockMovement } from "../types";
import type { VehiclePart } from "../../registration/types";
import { createBatchStockIn, fetchBranches, fetchStockInMovements, fetchVehicleParts } from "../provider/fetchProviders";

export function useStockIn() {
  const [movements, setMovements] = React.useState<StockMovement[]>([]);
  const [parts, setParts] = React.useState<VehiclePart[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState<string>("");
  const [branchFilter, setBranchFilter] = React.useState<string>("all");

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [movementsData, partsData, branchesData] = await Promise.all([
        fetchStockInMovements({ search, branch_id: branchFilter }),
        fetchVehicleParts(),
        fetchBranches(),
      ]);
      setMovements(movementsData);
      setParts(partsData.filter((p) => p.is_active));
      setBranches(branchesData);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e?.message || "Failed to load stock in data");
    } finally {
      setLoading(false);
    }
  }, [search, branchFilter]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStockIn = async (payload: BatchStockInInput) => {
    try {
      setSaving(true);
      await createBatchStockIn(payload);
      await loadData();
      return true;
    } catch (err: unknown) {
      const e = err as Error;
      setError(e?.message || "Failed to process stock in");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    movements,
    parts,
    branches,
    loading,
    saving,
    error,
    search,
    setSearch,
    branchFilter,
    setBranchFilter,
    reload: loadData,
    recordStockIn: handleStockIn,
  };
}
