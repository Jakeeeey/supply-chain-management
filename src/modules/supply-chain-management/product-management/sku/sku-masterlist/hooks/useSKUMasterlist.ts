"use client";

import {
  MasterData,
  SKU,
} from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { SortingState } from "@tanstack/react-table";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CellHelpers } from "../../sku-creation/utils/sku-helpers";

export function useSKUMasterlist() {
  const [data, setData] = useState<SKU[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sort = CellHelpers.getDirectusSort(sorting) || "";
      const [approvedRes, masterRes] = await Promise.all([
        fetch(
          `/api/scm/product-management/sku?type=approved&limit=${limit}&offset=${page * limit}&search=${encodeURIComponent(search)}&sort=${sort}`,
        ).then((res) => res.json()),
        fetch("/api/scm/product-management/sku?type=master").then((res) =>
          res.json(),
        ),
      ]);

      if (approvedRes.error) throw new Error(approvedRes.error);
      if (masterRes.error) throw new Error(masterRes.error);

      setData(approvedRes.data || []);
      setTotalCount(approvedRes.meta?.total_count || 0);
      setMasterData(masterRes.data || null);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [limit, page, search, sorting]);

  const toggleStatus = async (id: number | string, isActive: boolean) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/scm/product-management/sku`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], isActive }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast.success(
        `SKU ${isActive ? "activated" : "deactivated"} successfully`,
      );
      await refresh();
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message || "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const bulkUpdateStatus = async (
    ids: (number | string)[],
    isActive: boolean,
  ) => {
    if (!ids.length) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/scm/product-management/sku`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, isActive }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast.success(
        `${ids.length} SKUs ${isActive ? "activated" : "deactivated"} successfully`,
      );
      await refresh();
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message || "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

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
    sorting,
    setSorting,
    masterData,
    isLoading,
    isUpdating,
    setIsUpdating,
    error,
    refresh,
    toggleStatus,
    bulkUpdateStatus,
  };
}
