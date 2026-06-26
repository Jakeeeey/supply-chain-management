"use client";

import {
  MasterData,
  SKU,
} from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { SortingState } from "@tanstack/react-table";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CellHelpers } from "@/modules/supply-chain-management/product-management/sku/sku-creation/utils/sku-helpers";

const API_PATH = "/api/scm/product-management/product-registration";

/**
 * Client hook for Product Registration.
 *
 * Manages the master product list state (pagination, filters, sorting)
 * and exposes mutations for direct CRUD operations on the master table.
 */
export function useProductRegistration() {
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
  const [uomFilter, setUomFilter] = useState<string>("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [parentImages, setParentImages] = useState<Record<number, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sort = CellHelpers.getDirectusSort(sorting) || "";
      const filterParams = new URLSearchParams();
      filterParams.set("type", "products");
      filterParams.set("limit", limit.toString());
      filterParams.set("offset", (page * limit).toString());
      filterParams.set("search", search);
      filterParams.set("sort", sort);
      if (supplierFilter) filterParams.set("supplier", supplierFilter);
      if (categoryFilter) filterParams.set("category", categoryFilter);
      if (classFilter) filterParams.set("class", classFilter);
      if (segmentFilter) filterParams.set("segment", segmentFilter);
      if (typeFilter) filterParams.set("itemType", typeFilter);
      if (brandFilter) filterParams.set("brand", brandFilter);
      if (statusFilter) filterParams.set("status", statusFilter);
      if (uomFilter) filterParams.set("uom", uomFilter);

      const [productsRes, masterRes] = await Promise.all([
        fetch(`${API_PATH}?${filterParams.toString()}`).then((res) => res.json()),
        fetch(`${API_PATH}?type=master`).then((res) => res.json()),
      ]);

      if (productsRes.error) throw new Error(productsRes.error);
      if (masterRes.error) throw new Error(masterRes.error);

      setData(productsRes.data || []);
      setTotalCount(productsRes.meta?.total_count || 0);
      setMasterData(masterRes.data || null);

      // Fetch parent images for inheritance
      const parentIds = Array.from(
        new Set(
          (productsRes.data || [])
            .map((s: SKU) => s.parent_id)
            .filter((pid: unknown): pid is number => typeof pid === "number"),
        ),
      );

      if (parentIds.length > 0) {
        const map: Record<number, string | null> = {};
        (productsRes.data || []).forEach((s: SKU) => {
          const sid = s.id || s.product_id;
          if (sid) map[Number(sid)] = s.main_image || null;
        });

        const missingIds = (parentIds as number[]).filter(
          (id) => map[id] === undefined,
        );

        if (missingIds.length > 0) {
          try {
            const filter = JSON.stringify({ product_id: { _in: missingIds } });
            const pRes = await fetch(
              `${API_PATH}?type=products&limit=-1&search=&filter=${encodeURIComponent(filter)}`,
            ).then((res) => res.json());

            if (pRes.data) {
              pRes.data.forEach((p: SKU) => {
                const pid = p.id || p.product_id;
                if (pid) map[Number(pid)] = p.main_image || null;
              });
            }
          } catch (err) {
            console.warn("[Product Registration] Failed to fetch missing parent images", err);
          }
        }
        setParentImages(map);
      } else {
        setParentImages({});
      }
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [limit, page, search, sorting, supplierFilter, categoryFilter, classFilter, segmentFilter, typeFilter, brandFilter, statusFilter, uomFilter]);

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const createProduct = async (sku: SKU): Promise<SKU> => {
    const response = await fetch(API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sku),
    });
    const result = await response.json();
    if (result.error) {
      console.error("Create Product Error:", result);
      throw new Error(result.error);
    }
    await refresh();
    return result.data as SKU;
  };

  const updateProduct = async (id: number | string, productData: Partial<SKU>): Promise<void> => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_PATH}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update record");

      toast.success("Product Updated", {
        description: "The product has been updated successfully.",
      });
      await refresh();
    } catch (err: unknown) {
      toast.error("Update Failed", {
        description: err instanceof Error ? err.message : "Could not update the record.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const updateImage = async (id: number | string, imageId: string | null): Promise<void> => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_PATH}/${id}?type=image`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ main_image: imageId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update image");

      toast.success("Image Updated", {
        description: "The product image has been successfully updated.",
      });
      await refresh();
    } catch (err: unknown) {
      toast.error("Update Failed", {
        description: err instanceof Error ? err.message : "Could not update the image.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleStatus = async (id: number | string, isActive: boolean): Promise<void> => {
    setIsUpdating(true);
    try {
      const res = await fetch(API_PATH, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], isActive }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      toast.success(
        `Product ${isActive ? "activated" : "deactivated"} successfully`,
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
  ): Promise<void> => {
    if (!ids.length) return;
    setIsUpdating(true);
    try {
      const res = await fetch(API_PATH, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, isActive }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      toast.success(
        `${ids.length} products ${isActive ? "activated" : "deactivated"} successfully`,
      );
      await refresh();
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message || "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const checkDuplicate = async (name: string, excludeId?: number | string): Promise<boolean> => {
    let url = `${API_PATH}?type=duplicate-check&name=${encodeURIComponent(name)}`;
    if (excludeId) url += `&excludeId=${excludeId}`;
    const response = await fetch(url);
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result.isDuplicate as boolean;
  };

  // ─── Auto-fetch on mount and when dependencies change ──────────────────────

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
    uomFilter,
    setUomFilter,
    sorting,
    setSorting,
    masterData,
    parentImages,
    isLoading,
    isUpdating,
    setIsUpdating,
    error,
    refresh,
    createProduct,
    updateProduct,
    updateImage,
    toggleStatus,
    bulkUpdateStatus,
    checkDuplicate,
  };
}
