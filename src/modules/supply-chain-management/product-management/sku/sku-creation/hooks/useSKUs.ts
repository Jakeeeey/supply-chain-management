"use client";

import { useState, useEffect, useCallback } from "react";
import {
  SKU,
  MasterData,
} from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { SortingState } from "@tanstack/react-table";
import { CellHelpers } from "../utils/sku-helpers";

export function useSKUs() {
  const [approvedData, setApprovedData] = useState<SKU[]>([]);
  const [approvedTotal, setApprovedTotal] = useState(0);
  const [approvedPage, setApprovedPage] = useState(0);
  const [approvedLimit, setApprovedLimit] = useState(10);

  const [draftData, setDraftData] = useState<SKU[]>([]);
  const [draftsTotal, setDraftsTotal] = useState(0);
  const [draftsPage, setDraftsPage] = useState(0);
  const [draftsLimit, setDraftsLimit] = useState(10);
  const [draftsSorting, setDraftsSorting] = useState<SortingState>([]);
  const [approvedSorting, setApprovedSorting] = useState<SortingState>([]);

  const [pendingApprovalData, setPendingApprovalData] = useState<SKU[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingLimit, setPendingLimit] = useState(10);
  const [pendingSorting, setPendingSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");

  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track locally approved IDs to filter them out even if backend status update fails
  // Initialize from localStorage to persist across page refreshes
  const [approvedIds, setApprovedIds] = useState<Set<number | string>>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sku_approved_ids");
      if (stored) {
        try {
          return new Set(JSON.parse(stored));
        } catch {
          return new Set();
        }
      }
    }
    return new Set();
  });

  // Persist approvedIds to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "sku_approved_ids",
        JSON.stringify(Array.from(approvedIds)),
      );
    }
  }, [approvedIds]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const aSort = CellHelpers.getDirectusSort(approvedSorting) || "";
      const dSort = CellHelpers.getDirectusSort(draftsSorting) || "";
      const pSort = CellHelpers.getDirectusSort(pendingSorting) || "";

      const [approvedRes, draftsRes, pendingRes, masterRes] = await Promise.all(
        [
          fetch(
            `/api/scm/product-management/sku?type=approved&limit=${approvedLimit}&offset=${approvedPage * approvedLimit}&search=${encodeURIComponent(search)}&sort=${aSort}`,
          ).then((res) => res.json()),
          fetch(
            `/api/scm/product-management/sku?type=drafts&status=DRAFT&limit=${draftsLimit}&offset=${draftsPage * draftsLimit}&search=${encodeURIComponent(search)}&sort=${dSort}`,
          ).then((res) => res.json()),
          fetch(
            `/api/scm/product-management/sku?type=drafts&status=FOR_APPROVAL&limit=${pendingLimit}&offset=${pendingPage * pendingLimit}&search=${encodeURIComponent(search)}&sort=${pSort}`,
          ).then((res) => res.json()),
          fetch("/api/scm/product-management/sku?type=master").then(
            (res) => res.json(),
          ),
        ],
      );

      if (approvedRes.error) throw new Error(approvedRes.error);
      if (draftsRes.error) throw new Error(draftsRes.error);
      if (pendingRes.error) throw new Error(pendingRes.error);
      if (masterRes.error) throw new Error(masterRes.error);

      setApprovedData(approvedRes.data || []);
      setApprovedTotal(approvedRes.meta?.total_count || 0);

      setDraftData(draftsRes.data || []);
      setDraftsTotal(draftsRes.meta?.total_count || 0);

      setPendingApprovalData(pendingRes.data || []);
      setPendingTotal(pendingRes.meta?.total_count || 0);

      if (approvedIds.size > 0) {
        const filteredPending = (pendingRes.data || []).filter((item: SKU) => {
          const itemId = item.id || item.product_id;
          return !approvedIds.has(String(itemId));
        });
        setPendingApprovalData(filteredPending);
        setPendingTotal(filteredPending.length);

        const pendingIds = new Set(
          (pendingRes.data || []).map((item: SKU) =>
            String(item.id || item.product_id),
          ),
        );
        const idsToRemove: (number | string)[] = [];
        approvedIds.forEach((id) => {
          if (!pendingIds.has(String(id))) {
            idsToRemove.push(id);
          }
        });

        if (idsToRemove.length > 0) {
          setApprovedIds((prev) => {
            const newSet = new Set(prev);
            idsToRemove.forEach((id) => newSet.delete(id));
            return newSet;
          });
        }
      }

      setMasterData(masterRes.data || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [
    approvedLimit,
    approvedPage,
    approvedSorting,
    draftsLimit,
    draftsPage,
    draftsSorting,
    pendingLimit,
    pendingPage,
    pendingSorting,
    search,
    approvedIds,
  ]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createDraft = async (sku: SKU) => {
    const response = await fetch("/api/scm/product-management/sku", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sku),
    });
    const result = await response.json();
    if (result.error) {
      console.error("Create Draft Error Result:", result);
      throw new Error(result.error);
    }
    await refresh();
    return result.data;
  };

  const updateDraft = async (id: number | string, sku: Partial<SKU>) => {
    const response = await fetch(
      `/api/scm/product-management/sku/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sku),
      },
    );
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    await refresh();
    return result.data;
  };

  const submitForApproval = async (
    id: number | string,
    skipRefresh = false,
  ) => {
    const response = await fetch(
      `/api/scm/product-management/sku/${id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      },
    );
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    if (!skipRefresh) await refresh();
  };

  const bulkSubmitForApproval = async (ids: (number | string)[]) => {
    await Promise.all(ids.map((id) => submitForApproval(id, true)));
    await refresh();
  };

  const approveSKU = async (id: number | string, skipRefresh = false) => {
    const response = await fetch(
      `/api/scm/product-management/sku/${id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      },
    );
    const result = await response.json();

    if (result.error) throw new Error(result.error);

    // Add to locally approved IDs cache
    setApprovedIds((prev) => new Set(prev).add(String(id)));

    // Optimistic update: immediately remove from pending queue
    setPendingApprovalData((prev) => {
      const filtered = prev.filter((item) => {
        const itemId = item.id || item.product_id;
        const match = String(itemId) === String(id);
        return !match;
      });
      return filtered;
    });
    setPendingTotal((prev) => Math.max(0, prev - 1));

    if (!skipRefresh) await refresh();
  };

  const bulkApproveSKUs = async (ids: (number | string)[]) => {
    // 1. Sort IDs: Parents first, then children to ensure linking works
    const sortedIds = [...ids].sort((a, b) => {
      const skuA = pendingApprovalData.find(
        (s) => String(s.id || s.product_id) === String(a),
      );
      const skuB = pendingApprovalData.find(
        (s) => String(s.id || s.product_id) === String(b),
      );

      const aIsChild = !!skuA?.parent_id;
      const bIsChild = !!skuB?.parent_id;

      if (!aIsChild && bIsChild) return -1;
      if (aIsChild && !bIsChild) return 1;
      return 0;
    });

    // 2. Process sequentially to avoid race conditions in parent-linking
    for (const id of sortedIds) {
      await approveSKU(id, true);
    }
    await refresh();
  };

  const rejectSKU = async (
    id: number | string,
    remarks?: string,
    skipRefresh = false,
  ) => {
    const response = await fetch(
      `/api/scm/product-management/sku/${id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", remarks }),
      },
    );
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    if (!skipRefresh) await refresh();
  };

  const bulkRejectSKUs = async (
    rejections: { id: number | string; remarks: string }[],
  ) => {
    await Promise.all(rejections.map((r) => rejectSKU(r.id, r.remarks, true)));
    await refresh();
  };

  const checkDuplicate = async (name: string) => {
    const response = await fetch(
      `/api/scm/product-management/sku?type=duplicate-check&name=${encodeURIComponent(name)}`,
    );
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result.isDuplicate as boolean;
  };

  const deleteDraft = async (id: number | string, skipRefresh = false) => {
    const response = await fetch(
      `/api/scm/product-management/sku/${id}`,
      {
        method: "DELETE",
      },
    );
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    if (!skipRefresh) await refresh();
    return true;
  };

  const bulkDeleteDrafts = async (ids: (number | string)[]) => {
    await Promise.all(ids.map((id) => deleteDraft(id, true)));
    await refresh();
  };

  return {
    approvedData,
    approvedTotal,
    approvedPage,
    setApprovedPage,
    approvedLimit,
    setApprovedLimit,

    draftData,
    draftsTotal,
    draftsPage,
    setDraftsPage,
    draftsLimit,
    setDraftsLimit,
    draftsSorting,
    setDraftsSorting,
    approvedSorting,
    setApprovedSorting,

    pendingApprovalData,
    pendingTotal,
    pendingPage,
    setPendingPage,
    pendingLimit,
    setPendingLimit,
    pendingSorting,
    setPendingSorting,

    search,
    setSearch,

    masterData,
    isLoading,
    error,
    refresh,
    createDraft,
    updateDraft,
    submitForApproval,
    bulkSubmitForApproval,
    approveSKU,
    bulkApproveSKUs,
    bulkRejectSKUs,
    deleteDraft,
    bulkDeleteDrafts,
    checkDuplicate,
    rejectSKU,
  };
}
