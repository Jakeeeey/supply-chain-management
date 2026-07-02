"use client";

import * as React from "react";
import { toast } from "sonner";
import type {
  CreatePartInput,
  PartsInventoryFilters,
  PartsInventoryListResponse,
  PartsLookupData,
  UpdatePartInput,
} from "../types";
import * as api from "../providers/partsInventoryApi";

const initialFilters: PartsInventoryFilters = {
  search: "",
  categoryId: "",
  vehicleTypeId: "",
  branchId: "",
  stockStatus: "all",
  active: "true",
  page: 1,
  limit: 25,
};

const emptyResponse: PartsInventoryListResponse = {
  data: [],
  meta: { page: 1, limit: 25, total: 0 },
  summary: {
    totalParts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalAvailableQuantity: 0,
  },
};

const emptyLookups: PartsLookupData = {
  categories: [],
  vehicleTypes: [],
  branches: [],
  vehicles: [],
};

export function usePartsInventory() {
  const [filters, setFilters] = React.useState<PartsInventoryFilters>(initialFilters);
  const [response, setResponse] = React.useState<PartsInventoryListResponse>(emptyResponse);
  const [lookups, setLookups] = React.useState<PartsLookupData>(emptyLookups);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const loadLookups = React.useCallback(async () => {
    setLookups(await api.fetchLookups());
  }, []);

  const loadParts = React.useCallback(async () => {
    setLoading(true);
    try {
      setResponse(await api.fetchParts(filters));
    } catch (error) {
      toast.error("Failed to load parts inventory", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  React.useEffect(() => {
    loadLookups().catch((error) => {
      toast.error("Failed to load parts lookups", {
        description: error instanceof Error ? error.message : String(error),
      });
    });
  }, [loadLookups]);

  React.useEffect(() => {
    void loadParts();
  }, [loadParts]);

  const updateFilters = React.useCallback((patch: Partial<PartsInventoryFilters>) => {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  }, []);

  const savePart = React.useCallback(
    async (payload: CreatePartInput | UpdatePartInput, partId?: number) => {
      setSaving(true);
      try {
        if (partId) {
          await api.updatePart(partId, payload);
          toast.success("Part updated");
        } else {
          await api.createPart(payload as CreatePartInput);
          toast.success("Part created");
        }
        await Promise.all([loadParts(), loadLookups()]);
      } catch (error) {
        toast.error("Unable to save part", {
          description: error instanceof Error ? error.message : String(error),
        });
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [loadLookups, loadParts],
  );

  return {
    filters,
    setFilters: updateFilters,
    response,
    lookups,
    loading,
    saving,
    refresh: loadParts,
    savePart,
  };
}
