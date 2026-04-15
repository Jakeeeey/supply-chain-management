"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BundleDraft,
  Bundle,
  BundleMasterData,
  BundleDraftFormValues,
} from "@/modules/supply-chain-management/product-management/bundling/types/bundle.schema";

/**
 * Centralized hook for the Bundling module.
 * Optimizes fetching by using a single 'type=all' request for initial data.
 */
export function useBundles() {
  const [draftData, setDraftData] = useState<BundleDraft[]>([]);
  const [draftTotal, setDraftTotal] = useState(0);
  const [draftPage, setDraftPage] = useState(0);
  const [draftLimit, setDraftLimit] = useState(10);

  const [pendingData, setPendingData] = useState<BundleDraft[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingLimit, setPendingLimit] = useState(10);

  const [approvedData, setApprovedData] = useState<Bundle[]>([]);
  const [approvedTotal, setApprovedTotal] = useState(0);
  const [approvedPage, setApprovedPage] = useState(0);
  const [approvedLimit, setApprovedLimit] = useState(10);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);

  const [masterData, setMasterData] = useState<BundleMasterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const typeFilterId =
        typeFilter && typeFilter !== "all" ? parseInt(typeFilter) : undefined;
      const draftOffset = draftPage * draftLimit;
      const pendingOffset = pendingPage * pendingLimit;
      const approvedOffset = approvedPage * approvedLimit;
      const response = await fetch(
        `/api/scm/product-management/bundling?type=all` +
          `&draftLimit=${draftLimit}&draftOffset=${draftOffset}` +
          `&pendingLimit=${pendingLimit}&pendingOffset=${pendingOffset}` +
          `&approvedLimit=${approvedLimit}&approvedOffset=${approvedOffset}` +
          `&search=${encodeURIComponent(search)}` +
          `&status=${statusFilter}${typeFilterId ? `&typeId=${typeFilterId}` : ""}`,
      );
      const res = await response.json();

      if (res.error) throw new Error(res.error);

      // Map response data
      setDraftData(res.drafts?.data || []);
      setDraftTotal(res.drafts?.meta?.total_count || 0);

      setPendingData(res.pending?.data || []);
      setPendingTotal(res.pending?.meta?.total_count || 0);

      setApprovedData(res.approved?.data || []);
      setApprovedTotal(res.approved?.meta?.total_count || 0);

      setMasterData(res.master || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [
    draftPage,
    draftLimit,
    pendingPage,
    pendingLimit,
    approvedPage,
    approvedLimit,
    search,
    statusFilter,
    typeFilter,
  ]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Mutations
  const createDraft = async (values: BundleDraftFormValues) => {
    const response = await fetch("/api/scm/product-management/bundling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    await refresh();
    return result.data;
  };

  const updateDraft = async (
    id: number | string,
    values: BundleDraftFormValues,
  ) => {
    const response = await fetch(`/api/scm/product-management/bundling/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    await refresh();
    return result.data;
  };

  const deleteDraft = async (id: number | string) => {
    const response = await fetch(`/api/scm/product-management/bundling/${id}`, {
      method: "DELETE",
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    await refresh();
    return true;
  };

  const bulkDeleteDrafts = async (ids: (number | string)[]) => {
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/scm/product-management/bundling/${id}`, {
          method: "DELETE",
        }).then((r) => r.json()),
      ),
    );
    await refresh();
  };

  const submitForApproval = async (id: number | string) => {
    const response = await fetch(`/api/scm/product-management/bundling/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit" }),
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    await refresh();
  };

  const bulkSubmitForApproval = async (ids: (number | string)[]) => {
    for (const id of ids) {
      const response = await fetch(
        `/api/scm/product-management/bundling/${id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "submit" }),
        },
      );
      const result = await response.json();
      if (result.error) throw new Error(result.error);
    }
    await refresh();
  };

  const approveDraft = async (id: number | string) => {
    const response = await fetch(`/api/scm/product-management/bundling/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    await refresh();
  };

  const rejectDraft = async (id: number | string) => {
    const response = await fetch(`/api/scm/product-management/bundling/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    await refresh();
  };

  const fetchDraftDetails = async (id: number | string) => {
    const response = await fetch(
      `/api/scm/product-management/bundling/${id}?type=draft`,
    );
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result.data;
  };

  return {
    draftData,
    draftTotal,
    draftPage,
    setDraftPage,
    draftLimit,
    setDraftLimit,
    pendingData,
    pendingTotal,
    pendingPage,
    setPendingPage,
    pendingLimit,
    setPendingLimit,
    approvedData,
    approvedTotal,
    approvedPage,
    setApprovedPage,
    approvedLimit,
    setApprovedLimit,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    masterData,
    isLoading,
    error,
    search,
    setSearch,
    refresh,
    createDraft,
    updateDraft,
    deleteDraft,
    bulkDeleteDrafts,
    submitForApproval,
    bulkSubmitForApproval,
    approveDraft,
    rejectDraft,
    fetchDraftDetails,
  };
}
