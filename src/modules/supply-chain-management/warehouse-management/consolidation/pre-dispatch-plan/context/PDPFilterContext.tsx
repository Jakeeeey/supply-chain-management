"use client";

import { createContext, ReactNode, useContext, useState } from "react";
import { DateRange } from "react-day-picker";

interface PDPFilterContextType {
  // Applied filters (used by hooks to fetch data)
  clusterId: number | null;
  branchId: number | null;
  dateRange: DateRange | undefined;
  status: string | null;
  search: string;

  // Staged filters (used by UI inputs)
  stagedClusterId: number | null;
  stagedBranchId: number | null;
  stagedDateRange: DateRange | undefined;
  stagedStatus: string | null;

  // Setters for staged filters
  setStagedClusterId: (id: number | null) => void;
  setStagedBranchId: (id: number | null) => void;
  setStagedDateRange: (range: DateRange | undefined) => void;
  setStagedStatus: (status: string | null) => void;
  setSearch: (search: string) => void;

  // Actions
  applyFilters: () => void;
  resetFilters: () => void;
  isDirty: boolean;
}

const PDPFilterContext = createContext<PDPFilterContextType | undefined>(
  undefined,
);

export function PDPFilterProvider({ children }: { children: ReactNode }) {
  // Applied state
  const [clusterId, setClusterId] = useState<number | null>(null);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [status, setStatus] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Staged state
  const [stagedClusterId, setStagedClusterId] = useState<number | null>(null);
  const [stagedBranchId, setStagedBranchId] = useState<number | null>(null);
  const [stagedDateRange, setStagedDateRange] = useState<DateRange | undefined>(
    undefined,
  );
  const [stagedStatus, setStagedStatus] = useState<string | null>(null);

  const applyFilters = () => {
    setClusterId(stagedClusterId);
    setBranchId(stagedBranchId);
    setDateRange(stagedDateRange);
    setStatus(stagedStatus);
  };

  const resetFilters = () => {
    setStagedClusterId(null);
    setStagedBranchId(null);
    setStagedDateRange(undefined);
    setStagedStatus(null);
    setSearch("");

    setClusterId(null);
    setBranchId(null);
    setDateRange(undefined);
    setStatus(null);
  };

  const isDirty =
    stagedClusterId !== clusterId ||
    stagedBranchId !== branchId ||
    stagedDateRange !== dateRange ||
    stagedStatus !== status;

  return (
    <PDPFilterContext.Provider
      value={{
        clusterId,
        branchId,
        dateRange,
        status,
        search,

        stagedClusterId,
        stagedBranchId,
        stagedDateRange,
        stagedStatus,

        setStagedClusterId,
        setStagedBranchId,
        setStagedDateRange,
        setStagedStatus,
        setSearch,

        applyFilters,
        resetFilters,
        isDirty,
      }}
    >
      {children}
    </PDPFilterContext.Provider>
  );
}

export function usePDPFilter() {
  const context = useContext(PDPFilterContext);
  if (context === undefined) {
    throw new Error("usePDPFilter must be used within a PDPFilterProvider");
  }
  return context;
}
