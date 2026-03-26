"use client";

import { createContext, ReactNode, useContext, useState } from "react";

interface PDPFilterContextType {
  clusterId: number | null;
  setClusterId: (id: number | null) => void;
  status: string | null;
  setStatus: (status: string | null) => void;
  search: string;
  setSearch: (search: string) => void;
  branchId: number | null;
  setBranchId: (id: number | null) => void;
  dispatchDate: string | null;
  setDispatchDate: (date: string | null) => void;
  resetFilters: () => void;
}

const PDPFilterContext = createContext<PDPFilterContextType | undefined>(
  undefined,
);

export function PDPFilterProvider({ children }: { children: ReactNode }) {
  const [clusterId, setClusterId] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState<number | null>(null);
  const [dispatchDate, setDispatchDate] = useState<string | null>(null);

  const resetFilters = () => {
    setClusterId(null);
    setStatus(null);
    setSearch("");
    setBranchId(null);
    setDispatchDate(null);
  };

  return (
    <PDPFilterContext.Provider
      value={{
        clusterId,
        setClusterId,
        status,
        setStatus,
        search,
        setSearch,
        branchId,
        setBranchId,
        dispatchDate,
        setDispatchDate,
        resetFilters,
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
