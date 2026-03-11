"use client";

import { SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { SortingState } from "@tanstack/react-table";
import { useState } from "react";

/**
 * Pure state slice for the Approved Products table.
 * Owns pagination, sorting, and the data array.
 * Mutations and data fetching live in the useSKUs composer hook.
 */
export function useApprovedSKUs() {
  const [approvedData, setApprovedData] = useState<SKU[]>([]);
  const [approvedTotal, setApprovedTotal] = useState(0);
  const [approvedPage, setApprovedPage] = useState(0);
  const [approvedLimit, setApprovedLimit] = useState(10);
  const [approvedSorting, setApprovedSorting] = useState<SortingState>([]);

  return {
    approvedData,
    setApprovedData,
    approvedTotal,
    setApprovedTotal,
    approvedPage,
    setApprovedPage,
    approvedLimit,
    setApprovedLimit,
    approvedSorting,
    setApprovedSorting,
  };
}
