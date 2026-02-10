"use client";

import { useState, useEffect, useCallback } from "react";
import { SKU, MasterData } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema";

export function useSKUs() {
  const [approvedData, setApprovedData] = useState<SKU[]>([]);
  const [approvedTotal, setApprovedTotal] = useState(0);
  const [approvedPage, setApprovedPage] = useState(0);
  const [approvedLimit, setApprovedLimit] = useState(10);

  const [draftData, setDraftData] = useState<SKU[]>([]);
  const [draftsTotal, setDraftsTotal] = useState(0);
  const [draftsPage, setDraftsPage] = useState(0);
  const [draftsLimit, setDraftsLimit] = useState(10);

  const [pendingApprovalData, setPendingApprovalData] = useState<SKU[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingLimit, setPendingLimit] = useState(10);
  const [search, setSearch] = useState("");

  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [approvedRes, draftsRes, pendingRes, masterRes] = await Promise.all([
        fetch(`/api/scm/product-management/sku-creation?type=approved&limit=${approvedLimit}&offset=${approvedPage * approvedLimit}&search=${encodeURIComponent(search)}`).then(res => res.json()),
        fetch(`/api/scm/product-management/sku-creation?type=drafts&status=DRAFT&limit=-1`).then(res => res.json()),
        fetch(`/api/scm/product-management/sku-creation?type=drafts&status=FOR_APPROVAL&limit=-1`).then(res => res.json()),
        fetch("/api/scm/product-management/sku-creation?type=master").then(res => res.json())
      ]);

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
      
      setMasterData(masterRes.data || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [approvedLimit, approvedPage, draftsLimit, draftsPage, pendingLimit, pendingPage, search]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createDraft = async (sku: SKU) => {
    const response = await fetch("/api/scm/product-management/sku-creation", {
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
    const response = await fetch(`/api/scm/product-management/sku-creation/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sku),
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    await refresh();
    return result.data;
  };

  const submitForApproval = async (id: number | string) => {
    console.log(`Submitting SKU ${id} for approval...`);
    const response = await fetch(`/api/scm/product-management/sku-creation/${id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit" }),
    });
    const result = await response.json();
    console.log(`Submit response for ${id}:`, result);
    if (result.error) throw new Error(result.error);
    await refresh();
  };

  const approveSKU = async (id: number | string) => {
    const response = await fetch(`/api/scm/product-management/sku-creation/${id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    await refresh();
  };

  const rejectSKU = async (id: number | string) => {
    const response = await fetch(`/api/scm/product-management/sku-creation/${id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    await refresh();
  };

  const checkDuplicate = async (name: string) => {
    const response = await fetch(`/api/scm/product-management/sku-creation?type=duplicate-check&name=${encodeURIComponent(name)}`);
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result.isDuplicate as boolean;
  };

  const deleteDraft = async (id: number | string) => {
    const response = await fetch(`/api/scm/product-management/sku-creation/${id}`, {
      method: "DELETE",
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    await refresh();
    return true;
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

    pendingApprovalData,
    pendingTotal,
    pendingPage,
    setPendingPage,
    pendingLimit,
    setPendingLimit,
    
    search,
    setSearch,
    
    masterData,
    isLoading,
    error,
    refresh,
    createDraft,
    updateDraft,
    submitForApproval,
    approveSKU,
    deleteDraft,
    checkDuplicate,
    rejectSKU,
  };
}
