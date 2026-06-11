"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { stockAdjustmentSummaryApi } from "../api/stock-adjustment-summary-api";
import { stockAdjustmentSummaryService } from "../services/stock-adjustment-summary-service";
import {
  SummaryKPIs,
  TrendItem,
  BranchItem,
  ProductItem,
  SupplierItem,
  BranchLookup,
  SupplierLookup
} from "../types/stock-adjustment-summary.types";
import { StockAdjustmentHeader } from "../../stock-adjustment/types/stock-adjustment.schema";

interface StockAdjustmentSummaryContextType {
  // States
  isLoading: boolean;
  error: string | null;
  branches: BranchLookup[];
  suppliers: SupplierLookup[];
  rawData: StockAdjustmentHeader[];
  filteredData: StockAdjustmentHeader[];

  // Action
  refresh: () => Promise<void>;

  // Filters
  search: string;
  setSearch: (s: string) => void;
  branchId: number | undefined;
  setBranchId: (id: number | undefined) => void;
  supplierId: number | undefined;
  setSupplierId: (id: number | undefined) => void;
  type: "IN" | "OUT" | undefined;
  setType: (t: "IN" | "OUT" | undefined) => void;
  status: "Posted" | "Unposted" | undefined;
  setStatus: (s: "Posted" | "Unposted" | undefined) => void;
  fromDate: string | undefined;
  setFromDate: (d: string | undefined) => void;
  toDate: string | undefined;
  setToDate: (d: string | undefined) => void;
  resetFilters: () => void;

  // Computations
  kpis: SummaryKPIs;
  trendData: TrendItem[];
  branchData: BranchItem[];
  productData: ProductItem[];
  supplierData: SupplierItem[];
}

const StockAdjustmentSummaryContext = createContext<StockAdjustmentSummaryContextType | undefined>(undefined);

export function StockAdjustmentSummaryProvider({ children }: { children: React.ReactNode }) {
  const [rawData, setRawData] = useState<StockAdjustmentHeader[]>([]);
  const [branches, setBranches] = useState<BranchLookup[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierLookup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState<number | undefined>();
  const [supplierId, setSupplierId] = useState<number | undefined>();
  const [type, setType] = useState<"IN" | "OUT" | undefined>();
  const [status, setStatus] = useState<"Posted" | "Unposted" | undefined>();
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();

  const resetFilters = () => {
    setSearch("");
    setBranchId(undefined);
    setSupplierId(undefined);
    setType(undefined);
    setStatus(undefined);
    setFromDate(undefined);
    setToDate(undefined);
  };

  // Fetch branches and suppliers once
  useEffect(() => {
    async function loadData() {
      try {
        const [branchData, supplierData] = await Promise.all([
          stockAdjustmentSummaryApi.fetchBranches(),
          stockAdjustmentSummaryApi.fetchSuppliers()
        ]);
        setBranches(branchData);
        setSuppliers(supplierData);
      } catch (err) {
        console.error("Failed to load initial lookups in provider:", err);
      }
    }
    loadData();
  }, []);

  // Refresh adjustments list based on API-level filters
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await stockAdjustmentSummaryApi.fetchAdjustments({
        search,
        branchId,
        type
      });
      setRawData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load summary details");
      toast.error("Failed to load summary details");
    } finally {
      setIsLoading(false);
    }
  }, [search, branchId, type]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Client-side filtered data calculation (for Status, Supplier and Date Range)
  const filteredData = useMemo(() => {
    return stockAdjustmentSummaryService.filterData(rawData, {
      search,
      branchId,
      supplierId,
      type,
      status,
      fromDate,
      toDate
    });
  }, [rawData, search, branchId, supplierId, type, status, fromDate, toDate]);

  // Calculations
  const kpis = useMemo(() => stockAdjustmentSummaryService.computeKPIs(filteredData), [filteredData]);
  const trendData = useMemo(() => stockAdjustmentSummaryService.computeTrendData(filteredData), [filteredData]);
  const branchData = useMemo(() => stockAdjustmentSummaryService.computeBranchData(filteredData), [filteredData]);
  const productData = useMemo(() => stockAdjustmentSummaryService.computeProductData(filteredData), [filteredData]);
  const supplierData = useMemo(() => stockAdjustmentSummaryService.computeSupplierData(filteredData), [filteredData]);

  const value = {
    isLoading,
    error,
    branches,
    suppliers,
    rawData,
    filteredData,
    refresh,
    search,
    setSearch,
    branchId,
    setBranchId,
    supplierId,
    setSupplierId,
    type,
    setType,
    status,
    setStatus,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    resetFilters,
    kpis,
    trendData,
    branchData,
    productData,
    supplierData
  };

  return (
    <StockAdjustmentSummaryContext.Provider value={value}>
      {children}
    </StockAdjustmentSummaryContext.Provider>
  );
}

export function useStockAdjustmentSummaryContext() {
  const context = useContext(StockAdjustmentSummaryContext);
  if (context === undefined) {
    throw new Error("useStockAdjustmentSummaryContext must be used within a StockAdjustmentSummaryProvider");
  }
  return context;
}
