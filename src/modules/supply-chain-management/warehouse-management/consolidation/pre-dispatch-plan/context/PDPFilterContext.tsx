"use client";

import { createContext, ReactNode, useContext, useState } from "react";

interface PDPFilterContextType {
  clusterId: number | null;
  setClusterId: (id: number | null) => void;
  status: string | null;
  setStatus: (status: string | null) => void;
  search: string;
  setSearch: (search: string) => void;
  resetFilters: () => void;
}

const PDPFilterContext = createContext<PDPFilterContextType | undefined>(
  undefined,
);

export function PDPFilterProvider({ children }: { children: ReactNode }) {
  const [clusterId, setClusterId] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const resetFilters = () => {
    setClusterId(null);
    setStatus(null);
    setSearch("");
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
