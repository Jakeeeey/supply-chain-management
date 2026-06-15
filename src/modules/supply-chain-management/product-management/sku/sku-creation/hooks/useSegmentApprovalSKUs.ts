"use client";

import { SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { SortingState } from "@tanstack/react-table";
import { useEffect, useState } from "react";

/**
 * Pure state slice for the Segment Approval table (products with null segment fields).
 * Also owns the `segmentApprovedIds` local cache — a Set of IDs that have been approved/rejected
 * in this session but whose backend status may not have propagated yet.
 * The cache is persisted to localStorage so it survives page refreshes.
 */
export function useSegmentApprovalSKUs() {
  const [segmentApprovalData, setSegmentApprovalData] = useState<SKU[]>([]);
  const [segmentTotal, setSegmentTotal] = useState(0);
  const [segmentPage, setSegmentPage] = useState(0);
  const [segmentLimit, setSegmentLimit] = useState(10);
  const [segmentSorting, setSegmentSorting] = useState<SortingState>([]);

  // Track locally approved/rejected IDs to filter them out even if backend status update fails.
  const [segmentApprovedIds, setSegmentApprovedIds] = useState<Set<number | string>>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sku_segment_approved_ids");
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

  // Persist segmentApprovedIds to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "sku_segment_approved_ids",
        JSON.stringify(Array.from(segmentApprovedIds)),
      );
    }
  }, [segmentApprovedIds]);

  return {
    segmentApprovalData,
    setSegmentApprovalData,
    segmentTotal,
    setSegmentTotal,
    segmentPage,
    setSegmentPage,
    segmentLimit,
    setSegmentLimit,
    segmentSorting,
    setSegmentSorting,
    segmentApprovedIds,
    setSegmentApprovedIds,
  };
}
