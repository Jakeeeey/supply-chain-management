"use client";

import { SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { SortingState } from "@tanstack/react-table";
import { useState } from "react";

/**
 * Pure state slice for the Drafts table (status: DRAFT | REJECTED).
 * Owns pagination, sorting, and the data array.
 * Mutations and data fetching live in the useSKUs composer hook.
 */
export function useDraftSKUs() {
  const [draftData, setDraftData] = useState<SKU[]>([]);
  const [draftsTotal, setDraftsTotal] = useState(0);
  const [draftsPage, setDraftsPage] = useState(0);
  const [draftsLimit, setDraftsLimit] = useState(10);
  const [draftsSorting, setDraftsSorting] = useState<SortingState>([]);

  return {
    draftData,
    setDraftData,
    draftsTotal,
    setDraftsTotal,
    draftsPage,
    setDraftsPage,
    draftsLimit,
    setDraftsLimit,
    draftsSorting,
    setDraftsSorting,
  };
}
