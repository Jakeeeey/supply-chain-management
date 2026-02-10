"use client";

import { useState, useEffect, useCallback } from "react";
import { SKU, MasterData } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema";

export function useSKUMasterlist() {
  const [data, setData] = useState<SKU[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [approvedRes, masterRes] = await Promise.all([
        fetch(`/api/scm/product-management/sku-creation?type=approved&limit=${limit}&offset=${page * limit}&search=${encodeURIComponent(search)}`).then(res => res.json()),
        fetch("/api/scm/product-management/sku-creation?type=master").then(res => res.json())
      ]);

      if (approvedRes.error) throw new Error(approvedRes.error);
      if (masterRes.error) throw new Error(masterRes.error);

      setData(approvedRes.data || []);
      setTotalCount(approvedRes.meta?.total_count || 0);
      setMasterData(masterRes.data || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [limit, page, search]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    totalCount,
    page,
    setPage,
    limit,
    setLimit,
    search,
    setSearch,
    masterData,
    isLoading,
    error,
    refresh,
  };
}
