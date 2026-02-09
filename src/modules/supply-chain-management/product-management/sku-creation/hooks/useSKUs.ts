"use client";

import { useState, useEffect, useCallback } from "react";
import { SKU, MasterData } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema";

export function useSKUs() {
  const [approvedData, setApprovedData] = useState<SKU[]>([]);
  const [draftData, setDraftData] = useState<SKU[]>([]);
  const [approvedTotal, setApprovedTotal] = useState(0);
  const [draftsTotal, setDraftsTotal] = useState(0);
  
  const [approvedPage, setApprovedPage] = useState(0);
  const [approvedLimit, setApprovedLimit] = useState(100);
  
  const [draftsPage, setDraftsPage] = useState(0);
  const [draftsLimit, setDraftsLimit] = useState(100);

  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [approvedRes, draftsRes, masterRes] = await Promise.all([
        fetch(`/api/scm/product-management/sku-creation?type=approved&limit=${approvedLimit}&offset=${approvedPage * approvedLimit}`).then(res => res.json()),
        fetch(`/api/scm/product-management/sku-creation?type=drafts&limit=${draftsLimit}&offset=${draftsPage * draftsLimit}`).then(res => res.json()),
        fetch("/api/scm/product-management/sku-creation?type=master").then(res => res.json())
      ]);

      if (approvedRes.error) throw new Error(approvedRes.error);
      if (draftsRes.error) throw new Error(draftsRes.error);
      if (masterRes.error) throw new Error(masterRes.error);

      setApprovedData(approvedRes.data || []);
      setApprovedTotal(approvedRes.meta?.total_count || 0);
      
      setDraftData(draftsRes.data || []);
      setDraftsTotal(draftsRes.meta?.total_count || 0);
      
      setMasterData(masterRes.data || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [approvedLimit, approvedPage, draftsLimit, draftsPage]);

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
    const response = await fetch(`/api/scm/product-management/sku-creation/${id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit" }),
    });
    const result = await response.json();
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
  };
}
