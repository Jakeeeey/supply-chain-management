"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BundleDraft,
  Bundle,
  BundleMasterData,
  BundleDraftFormValues,
} from "@/modules/supply-chain-management/product-management/bundling/types/bundle.schema";

/**
 * Central hook for the Bundling module.
 * Manages all data slices (drafts, pending approval, approved) and
 * exposes mutation methods for CRUD and status transitions.
 * @returns State and actions for the bundling module
 */
export function useBundles() {
  // ─── Draft State ─────────────────────────────
  const [draftData, setDraftData] = useState<BundleDraft[]>([]);
  const [draftTotal, setDraftTotal] = useState(0);
  const [draftPage, setDraftPage] = useState(0);
  const [draftLimit, setDraftLimit] = useState(10);

  // ─── Pending Approval State ──────────────────
  const [pendingData, setPendingData] = useState<BundleDraft[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingLimit, setPendingLimit] = useState(10);

  // ─── Approved State ──────────────────────────
  const [approvedData, setApprovedData] = useState<Bundle[]>([]);
  const [approvedTotal, setApprovedTotal] = useState(0);
  const [approvedPage, setApprovedPage] = useState(0);
  const [approvedLimit, setApprovedLimit] = useState(10);

  // ─── Shared State ────────────────────────────
  const [masterData, setMasterData] = useState<BundleMasterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // ─── Fetch All Data ──────────────────────────
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [draftRes, pendingRes, approvedRes, masterRes] = await Promise.all([
        fetch(
          `/api/scm/product-management/bundling?type=drafts&status=Draft&limit=${draftLimit}&offset=${draftPage * draftLimit}&search=${encodeURIComponent(search)}`,
        ).then((r) => r.json()),
        fetch(
          `/api/scm/product-management/bundling?type=for_approval&status=For approval&limit=${pendingLimit}&offset=${pendingPage * pendingLimit}&search=${encodeURIComponent(search)}`,
        ).then((r) => r.json()),
        fetch(
          `/api/scm/product-management/bundling?type=approved&limit=${approvedLimit}&offset=${approvedPage * approvedLimit}&search=${encodeURIComponent(search)}`,
        ).then((r) => r.json()),
        fetch("/api/scm/product-management/bundling?type=master").then((r) =>
          r.json(),
        ),
      ]);

      if (draftRes.error) throw new Error(draftRes.error);
      if (pendingRes.error) throw new Error(pendingRes.error);
      if (approvedRes.error) throw new Error(approvedRes.error);
      if (masterRes.error) throw new Error(masterRes.error);

      setDraftData(draftRes.data || []);
      setDraftTotal(draftRes.meta?.total_count || 0);

      setPendingData(pendingRes.data || []);
      setPendingTotal(pendingRes.meta?.total_count || 0);

      setApprovedData(approvedRes.data || []);
      setApprovedTotal(approvedRes.meta?.total_count || 0);

      setMasterData(masterRes.data || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [
    draftLimit,
    draftPage,
    pendingLimit,
    pendingPage,
    approvedLimit,
    approvedPage,
    search,
  ]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ─── Mutations ─────────────────────────────────

  /**
   * Creates a new bundle draft from validated form data.
   */
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

  /**
   * Deletes a draft bundle by ID.
   */
  const deleteDraft = async (id: number | string) => {
    const response = await fetch(`/api/scm/product-management/bundling/${id}`, {
      method: "DELETE",
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    await refresh();
    return true;
  };

  /**
   * Bulk-deletes multiple draft bundles.
   */
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

  /**
   * Submits a single draft for approval.
   */
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

  /**
   * Bulk-submits multiple drafts for approval.
   */
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

  /**
   * Approves a single draft bundle, creating a master record.
   */
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

  /**
   * Rejects a draft bundle, returning it to DRAFT status.
   */
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

  /**
   * Fetches a single draft's full details (including items).
   */
  const fetchDraftDetails = async (id: number | string) => {
    const response = await fetch(
      `/api/scm/product-management/bundling/${id}?type=draft`,
    );
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result.data;
  };

  return {
    // Draft
    draftData,
    draftTotal,
    draftPage,
    setDraftPage,
    draftLimit,
    setDraftLimit,

    // Pending
    pendingData,
    pendingTotal,
    pendingPage,
    setPendingPage,
    pendingLimit,
    setPendingLimit,

    // Approved
    approvedData,
    approvedTotal,
    approvedPage,
    setApprovedPage,
    approvedLimit,
    setApprovedLimit,

    // Shared
    masterData,
    isLoading,
    error,
    search,
    setSearch,
    refresh,

    // Mutations
    createDraft,
    deleteDraft,
    bulkDeleteDrafts,
    submitForApproval,
    bulkSubmitForApproval,
    approveDraft,
    rejectDraft,
    fetchDraftDetails,
  };
}
