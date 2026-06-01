"use client";

import {
  MasterData,
  SKU,
} from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { useCallback, useEffect, useState } from "react";
import { CellHelpers } from "../utils/sku-helpers";
import { useApprovedSKUs } from "./useApprovedSKUs";
import { useDraftSKUs } from "./useDraftSKUs";
import { usePendingApprovalSKUs } from "./usePendingApprovalSKUs";
import { useSegmentApprovalSKUs } from "./useSegmentApprovalSKUs";

/**
 * Composer hook — assembles the three state slices and orchestrates all
 * data fetching and mutations. Returns the exact same API as before the
 * refactor so all consumers (SKUCreationPage, SKUApprovalPage, etc.) are
 * completely unaffected.
 *
 * State ownership:
 *   useDraftSKUs           — draft list pagination/sorting/data
 *   usePendingApprovalSKUs — pending list + approvedIds localStorage cache
 *   useApprovedSKUs        — approved list pagination/sorting/data
 *
 * This hook owns: refresh (single Promise.all), masterData, search, isLoading,
 * error, and all CRUD/approval mutations.
 */
export function useSKUs() {
  const drafts = useDraftSKUs();
  const pending = usePendingApprovalSKUs();
  const segment = useSegmentApprovalSKUs();
  const approved = useApprovedSKUs();

  const [search, setSearch] = useState("");
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const aSort = CellHelpers.getDirectusSort(approved.approvedSorting) || "";
      const dSort = CellHelpers.getDirectusSort(drafts.draftsSorting) || "";
      const pSort = CellHelpers.getDirectusSort(pending.pendingSorting) || "";
      const sSort = CellHelpers.getDirectusSort(segment.segmentSorting) || "";

      const [approvedRes, draftsRes, pendingRes, segmentRes, masterRes] = await Promise.all(
        [
          fetch(
            `/api/scm/product-management/sku?type=approved&limit=${approved.approvedLimit}&offset=${approved.approvedPage * approved.approvedLimit}&search=${encodeURIComponent(search)}&sort=${aSort}`,
          ).then((res) => res.json()),
          fetch(
            `/api/scm/product-management/sku?type=drafts&status=DRAFT&limit=${drafts.draftsLimit}&offset=${drafts.draftsPage * drafts.draftsLimit}&search=${encodeURIComponent(search)}&sort=${dSort}`,
          ).then((res) => res.json()),
          fetch(
            `/api/scm/product-management/sku?type=drafts&status=FOR_APPROVAL&limit=${pending.pendingLimit}&offset=${pending.pendingPage * pending.pendingLimit}&search=${encodeURIComponent(search)}&sort=${pSort}`,
          ).then((res) => res.json()),
          fetch(
            `/api/scm/product-management/sku?type=segment-approval&limit=${segment.segmentLimit}&offset=${segment.segmentPage * segment.segmentLimit}&search=${encodeURIComponent(search)}&sort=${sSort}`,
          ).then((res) => res.json()),
          fetch("/api/scm/product-management/sku?type=master").then((res) =>
            res.json(),
          ),
        ],
      );

      if (approvedRes.error) throw new Error(approvedRes.error);
      if (draftsRes.error) throw new Error(draftsRes.error);
      if (pendingRes.error) throw new Error(pendingRes.error);
      if (segmentRes.error) throw new Error(segmentRes.error);
      if (masterRes.error) throw new Error(masterRes.error);

      approved.setApprovedData(approvedRes.data || []);
      approved.setApprovedTotal(approvedRes.meta?.total_count || 0);

      drafts.setDraftData(draftsRes.data || []);
      drafts.setDraftsTotal(draftsRes.meta?.total_count || 0);

      pending.setPendingApprovalData(pendingRes.data || []);
      pending.setPendingTotal(pendingRes.meta?.total_count || 0);

      segment.setSegmentApprovalData(segmentRes.data || []);
      segment.setSegmentTotal(segmentRes.meta?.total_count || 0);

      // Apply local approvedIds cache: filter out items already approved this session
      // whose backend status hasn't updated via Directus yet
      if (pending.approvedIds.size > 0) {
        const filteredPending = (pendingRes.data || []).filter((item: SKU) => {
          const itemId = item.id || item.product_id;
          return !pending.approvedIds.has(String(itemId));
        });
        pending.setPendingApprovalData(filteredPending);
        pending.setPendingTotal(filteredPending.length);

        // Prune IDs from the cache that are no longer in the pending list at all
        const pendingIds = new Set(
          (pendingRes.data || []).map((item: SKU) =>
            String(item.id || item.product_id),
          ),
        );
        const idsToRemove: (number | string)[] = [];
        pending.approvedIds.forEach((id) => {
          if (!pendingIds.has(String(id))) {
            idsToRemove.push(id);
          }
        });

        if (idsToRemove.length > 0) {
          pending.setApprovedIds((prev) => {
            const newSet = new Set(prev);
            idsToRemove.forEach((id) => newSet.delete(id));
            return newSet;
          });
        }
      }

      // Apply local segmentApprovedIds cache
      if (segment.segmentApprovedIds.size > 0) {
        const filteredSegment = (segmentRes.data || []).filter((item: SKU) => {
          const itemId = item.id || item.product_id;
          return !segment.segmentApprovedIds.has(String(itemId));
        });
        segment.setSegmentApprovalData(filteredSegment);
        segment.setSegmentTotal(filteredSegment.length);

        const segmentIds = new Set(
          (segmentRes.data || []).map((item: SKU) =>
            String(item.id || item.product_id),
          ),
        );
        const segmentIdsToRemove: (number | string)[] = [];
        segment.segmentApprovedIds.forEach((id) => {
          if (!segmentIds.has(String(id))) {
            segmentIdsToRemove.push(id);
          }
        });

        if (segmentIdsToRemove.length > 0) {
          segment.setSegmentApprovedIds((prev) => {
            const newSet = new Set(prev);
            segmentIdsToRemove.forEach((id) => newSet.delete(id));
            return newSet;
          });
        }
      }

      setMasterData(masterRes.data || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    approved.approvedLimit,
    approved.approvedPage,
    approved.approvedSorting,
    drafts.draftsLimit,
    drafts.draftsPage,
    drafts.draftsSorting,
    pending.pendingLimit,
    pending.pendingPage,
    pending.pendingSorting,
    segment.segmentLimit,
    segment.segmentPage,
    segment.segmentSorting,
    search,
    pending.approvedIds,
    segment.segmentApprovedIds,
  ]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ─── Draft Mutations ───────────────────────────────────────────────────────

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
    const response = await fetch(`/api/scm/product-management/sku/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sku),
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    await refresh();
    return result.data;
  };

  const submitForApproval = async (
    id: number | string,
    skipRefresh = false,
  ) => {
    const response = await fetch(`/api/scm/product-management/sku/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit" }),
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    if (!skipRefresh) await refresh();
  };

  const bulkSubmitForApproval = async (ids: (number | string)[]) => {
    await Promise.all(ids.map((id) => submitForApproval(id, true)));
    await refresh();
  };

  const deleteDraft = async (id: number | string, skipRefresh = false) => {
    const response = await fetch(`/api/scm/product-management/sku/${id}`, {
      method: "DELETE",
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    if (!skipRefresh) await refresh();
    return true;
  };

  const bulkDeleteDrafts = async (ids: (number | string)[]) => {
    await Promise.all(ids.map((id) => deleteDraft(id, true)));
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

  // ─── Approval / Rejection Mutations ───────────────────────────────────────

  const approveSKU = async (id: number | string, skipRefresh = false) => {
    const response = await fetch(`/api/scm/product-management/sku/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);

    // Add to locally approved IDs cache
    pending.setApprovedIds((prev) => new Set(prev).add(String(id)));

    // Optimistic update: immediately remove from the pending queue UI
    pending.setPendingApprovalData((prev) =>
      prev.filter((item) => {
        const itemId = item.id || item.product_id;
        return String(itemId) !== String(id);
      }),
    );
    pending.setPendingTotal((prev) => Math.max(0, prev - 1));

    if (!skipRefresh) await refresh();
  };

  const bulkApproveSKUs = async (ids: (number | string)[]) => {
    // Sort parents before children to avoid race conditions during parent-linking
    const sortedIds = [...ids].sort((a, b) => {
      const skuA = pending.pendingApprovalData.find(
        (s) => String(s.id || s.product_id) === String(a),
      );
      const skuB = pending.pendingApprovalData.find(
        (s) => String(s.id || s.product_id) === String(b),
      );
      const aIsChild = !!skuA?.parent_id;
      const bIsChild = !!skuB?.parent_id;
      if (!aIsChild && bIsChild) return -1;
      if (aIsChild && !bIsChild) return 1;
      return 0;
    });

    // Sequential to avoid race conditions in parent-child linking
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
    const response = await fetch(`/api/scm/product-management/sku/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", remarks }),
    });
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

  // ─── Segment Approval Mutations ───────────────────────────────────────────

  const approveSegment = async (
    id: number | string,
    product_class: number,
    product_segment: number,
    product_section: number,
    skipRefresh = false,
  ) => {
    const response = await fetch(`/api/scm/product-management/sku/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve-segment", product_class, product_segment, product_section }),
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);

    segment.setSegmentApprovedIds((prev) => new Set(prev).add(String(id)));
    segment.setSegmentApprovalData((prev) =>
      prev.filter((item) => String(item.id || item.product_id) !== String(id))
    );
    segment.setSegmentTotal((prev) => Math.max(0, prev - 1));

    if (!skipRefresh) await refresh();
  };

  const rejectSegment = async (id: number | string, skipRefresh = false) => {
    const response = await fetch(`/api/scm/product-management/sku/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject-segment" }),
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);

    segment.setSegmentApprovedIds((prev) => new Set(prev).add(String(id)));
    segment.setSegmentApprovalData((prev) =>
      prev.filter((item) => String(item.id || item.product_id) !== String(id))
    );
    segment.setSegmentTotal((prev) => Math.max(0, prev - 1));

    if (!skipRefresh) await refresh();
  };

  const bulkApproveSegments = async (skus: SKU[]) => {
    for (const sku of skus) {
      const id = sku.id || sku.product_id;
      const proposed = sku as SKU & {
        _proposed_class?: number;
        _proposed_segment?: number;
        _proposed_section?: number;
      };
      await approveSegment(
        id!,
        proposed._proposed_class || 1,
        proposed._proposed_segment || 1,
        proposed._proposed_section || 1,
        true,
      );
    }
    await refresh();
  };

  const bulkRejectSegments = async (ids: (number | string)[]) => {
    for (const id of ids) {
      await rejectSegment(id, true);
    }
    await refresh();
  };

  // ─── Return (identical shape to original useSKUs) ─────────────────────────

  return {
    // Approved
    approvedData: approved.approvedData,
    approvedTotal: approved.approvedTotal,
    approvedPage: approved.approvedPage,
    setApprovedPage: approved.setApprovedPage,
    approvedLimit: approved.approvedLimit,
    setApprovedLimit: approved.setApprovedLimit,
    approvedSorting: approved.approvedSorting,
    setApprovedSorting: approved.setApprovedSorting,

    // Drafts
    draftData: drafts.draftData,
    draftsTotal: drafts.draftsTotal,
    draftsPage: drafts.draftsPage,
    setDraftsPage: drafts.setDraftsPage,
    draftsLimit: drafts.draftsLimit,
    setDraftsLimit: drafts.setDraftsLimit,
    draftsSorting: drafts.draftsSorting,
    setDraftsSorting: drafts.setDraftsSorting,

    // Pending Approval
    pendingApprovalData: pending.pendingApprovalData,
    pendingTotal: pending.pendingTotal,
    pendingPage: pending.pendingPage,
    setPendingPage: pending.setPendingPage,
    pendingLimit: pending.pendingLimit,
    setPendingLimit: pending.setPendingLimit,
    pendingSorting: pending.pendingSorting,
    setPendingSorting: pending.setPendingSorting,

    // Segment Approval
    segmentApprovalData: segment.segmentApprovalData,
    segmentTotal: segment.segmentTotal,
    segmentPage: segment.segmentPage,
    setSegmentPage: segment.setSegmentPage,
    segmentLimit: segment.segmentLimit,
    setSegmentLimit: segment.setSegmentLimit,
    segmentSorting: segment.segmentSorting,
    setSegmentSorting: segment.setSegmentSorting,

    // Shared
    search,
    setSearch,
    masterData,
    isLoading,
    error,
    refresh,

    // Mutations
    createDraft,
    updateDraft,
    submitForApproval,
    bulkSubmitForApproval,
    approveSKU,
    bulkApproveSKUs,
    rejectSKU,
    bulkRejectSKUs,
    approveSegment,
    rejectSegment,
    bulkApproveSegments,
    bulkRejectSegments,
    deleteDraft,
    bulkDeleteDrafts,
    checkDuplicate,
  };
}
