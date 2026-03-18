"use client";

// =============================================================================
// useReturnCreationData — Manages reference data + inventory for Create/Edit
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { getReferences, getInventory } from "../providers/fetchProviders";
import type {
  ReferenceData,
  InventoryRecord,
} from "../types/rts.schema";

/** Default empty reference data to prevent null checks in components. */
const EMPTY_REFS: ReferenceData = {
  suppliers: [],
  branches: [],
  products: [],
  units: [],
  lineDiscounts: [],
  connections: [],
  returnTypes: [],
};

/**
 * Hook for managing reference data and running inventory for the
 * Return-to-Supplier create/edit workflows.
 *
 * - Loads references on mount (when `isActive` is true).
 * - Exposes `loadInventory(branchId, supplierId)` to fetch stock on demand.
 * - Returns standardized `{ refs, inventory, loadInventory, isLoading, error }`.
 *
 * @param isActive - Gate flag; references are only fetched when true.
 */
export function useReturnCreationData(isActive: boolean) {
  const [refs, setRefs] = useState<ReferenceData>(EMPTY_REFS);
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch reference data when dialog opens
  useEffect(() => {
    if (!isActive) return;

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getReferences();
        if (!cancelled) setRefs(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load reference data.";
        if (!cancelled) {
          setError(msg);
          toast.error("Reference Error", { description: msg });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isActive]);

  /**
   * Fetches display-ready inventory for a specific branch + supplier.
   * The server applies the remainder cascade — data arrives floored.
   */
  const loadInventory = useCallback(
    async (branchId: number, supplierId: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getInventory(branchId, supplierId);
        setInventory(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load inventory.";
        setError(msg);
        toast.error("Inventory Error", { description: msg });
        setInventory([]);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { refs, inventory, loadInventory, isLoading, error };
}
