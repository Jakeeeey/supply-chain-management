import * as React from "react";
import type { OutboundMovement } from "../types";
import type { Branch } from "../../stock-in/types";
import { fetchOutboundMovements, fetchBranches } from "../provider/fetchProviders";

export function useStockOutModule() {
  const [movements, setMovements] = React.useState<OutboundMovement[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selectedBranch, setSelectedBranch] = React.useState("all");
  const [selectedType, setSelectedType] = React.useState("all");

  const loadBranches = React.useCallback(async () => {
    try {
      const data = await fetchBranches();
      setBranches(data);
    } catch {
      // ignore
    }
  }, []);

  const loadMovements = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOutboundMovements({
        search,
        branch_id: selectedBranch,
        movement_type: selectedType,
      });
      setMovements(data);
    } catch {
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, [search, selectedBranch, selectedType]);

  React.useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadMovements();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadMovements]);

  // Compute KPI metrics
  const metrics = React.useMemo(() => {
    const totalTransactions = movements.length;
    let totalQty = 0;
    let totalValuation = 0;
    let issueCount = 0;
    let scrapDisposalCount = 0;

    for (const m of movements) {
      const q = Number(m.quantity) || 0;
      const c = Number(m.unit_cost) || 0;
      totalQty += q;
      totalValuation += q * c;

      if (m.movement_type === "Issue") {
        issueCount++;
      } else {
        scrapDisposalCount++;
      }
    }

    return {
      totalTransactions,
      totalQty,
      totalValuation,
      issueCount,
      scrapDisposalCount,
    };
  }, [movements]);

  return {
    movements,
    branches,
    loading,
    search,
    setSearch,
    selectedBranch,
    setSelectedBranch,
    selectedType,
    setSelectedType,
    metrics,
    refresh: loadMovements,
  };
}
