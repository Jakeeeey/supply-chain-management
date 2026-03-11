"use client";

import { SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { SortingState } from "@tanstack/react-table";
import { useEffect, useState } from "react";

/**
 * Pure state slice for the Pending Approval table (status: FOR_APPROVAL).
 * Also owns the `approvedIds` local cache — a Set of IDs that have been approved
 * in this session but whose backend status may not have propagated yet.
 * The cache is persisted to localStorage so it survives page refreshes.
 */
export function usePendingApprovalSKUs() {
  const [pendingApprovalData, setPendingApprovalData] = useState<SKU[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingLimit, setPendingLimit] = useState(10);
  const [pendingSorting, setPendingSorting] = useState<SortingState>([]);

  // Track locally approved IDs to filter them out even if backend status update fails.
  // Initialized from localStorage to persist across page refreshes.
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

  return {
    pendingApprovalData,
    setPendingApprovalData,
    pendingTotal,
    setPendingTotal,
    pendingPage,
    setPendingPage,
    pendingLimit,
    setPendingLimit,
    pendingSorting,
    setPendingSorting,
    approvedIds,
    setApprovedIds,
  };
}
