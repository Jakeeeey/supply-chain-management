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
  const [supplierFilter, setSupplierFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [classFilter, setClassFilter] = useState<string>("");
  const [segmentFilter, setSegmentFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [brandFilter, setBrandFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [parentImages, setParentImages] = useState<Record<number, string | null>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEditIds, setPendingEditIds] = useState<Set<number>>(new Set());

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sort = CellHelpers.getDirectusSort(sorting) || "";
      const filterParams = new URLSearchParams();
      filterParams.set('type', 'approved');
      filterParams.set('limit', limit.toString());
      filterParams.set('offset', (page * limit).toString());
      filterParams.set('search', search);
      filterParams.set('sort', sort);
      if (supplierFilter) filterParams.set('supplier', supplierFilter);
      if (categoryFilter) filterParams.set('category', categoryFilter);
      if (classFilter) filterParams.set('class', classFilter);
      if (segmentFilter) filterParams.set('segment', segmentFilter);
      if (typeFilter) filterParams.set('itemType', typeFilter);
      if (brandFilter) filterParams.set('brand', brandFilter);
      if (statusFilter) filterParams.set('status', statusFilter);

      const [approvedRes, masterRes] = await Promise.all([
        fetch(
          `/api/scm/product-management/sku?${filterParams.toString()}`,
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

      // Fetch parent images for inheritance if they are not in the current page
      const parentIds = Array.from(
        new Set(
          (approvedRes.data || [])
            .map((s: SKU) => s.parent_id)
            .filter((pid: unknown): pid is number => typeof pid === "number"),
        ),
      );

      if (parentIds.length > 0) {
        // Create map from what we already have in the page
        const map: Record<number, string | null> = {};
        (approvedRes.data || []).forEach((s: SKU) => {
          const sid = s.id || s.product_id;
          if (sid) map[Number(sid) as number] = s.main_image || null;
        });

        // Identify missing parent IDs
        const missingIds = (parentIds as number[]).filter(
          (id) => map[id as number] === undefined,
        );

        if (missingIds.length > 0) {
          try {
            // Use Directus filter to fetch missing parents
            const filter = JSON.stringify({
              product_id: { _in: missingIds },
            });
            const pRes = await fetch(
              `/api/scm/product-management/sku?type=approved&limit=-1&search=&filter=${encodeURIComponent(filter)}`,
            ).then((res) => res.json());

            if (pRes.data) {
              pRes.data.forEach((p: SKU) => {
                const pid = p.id || p.product_id;
                if (pid) map[Number(pid) as number] = p.main_image || null;
              });
            }
          } catch (err) {
            console.warn("[Masterlist] Failed to fetch missing parent images", err);
          }
        }
        setParentImages(map);
      } else {
        setParentImages({});
      }

      // Fetch pending master edit IDs for this page
      const productIds = (approvedRes.data || [])
        .map((s: SKU) => s.product_id || s.id)
        .filter(Boolean);
      if (productIds.length > 0) {
        try {
          const pendingRes = await fetch(
            `/api/scm/product-management/sku?type=pending-edits&ids=${productIds.join(",")}`,
          ).then((res) => res.json());
          setPendingEditIds(new Set<number>(pendingRes.data || []));
        } catch (err) {
          console.warn("[Masterlist] Failed to fetch pending edit IDs", err);
          setPendingEditIds(new Set());
        }
      } else {
        setPendingEditIds(new Set());
      }
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [limit, page, search, sorting, supplierFilter, categoryFilter, classFilter, segmentFilter, typeFilter, brandFilter, statusFilter]);

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
    supplierFilter,
    setSupplierFilter,
    categoryFilter,
    setCategoryFilter,
    classFilter,
    setClassFilter,
    segmentFilter,
    setSegmentFilter,
    typeFilter,
    setTypeFilter,
    brandFilter,
    setBrandFilter,
    statusFilter,
    setStatusFilter,
    sorting,
    setSorting,
    masterData,
    isLoading,
    isUpdating,
    setIsUpdating,
    error,
    refresh,
    parentImages,
    pendingEditIds,
    toggleStatus,
    bulkUpdateStatus,
  };
}
