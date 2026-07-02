"use client";

import * as React from "react";
import { toast } from "sonner";
import type { CreateMovementInput, MovementFilters, PaginatedResponse, PartMovementRow } from "../types";
import * as api from "../providers/partsInventoryApi";

const initialFilters: MovementFilters = {
  search: "",
  partId: "",
  branchId: "",
  vehicleId: "",
  movementType: "all",
  dateFrom: "",
  dateTo: "",
  page: 1,
  limit: 25,
};

const emptyResponse: PaginatedResponse<PartMovementRow> = {
  data: [],
  meta: { page: 1, limit: 25, total: 0 },
};

export function usePartMovements() {
  const [filters, setFilters] = React.useState<MovementFilters>(initialFilters);
  const [response, setResponse] = React.useState(emptyResponse);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setResponse(await api.fetchMovements(filters));
    } catch (error) {
      toast.error("Failed to load part movements", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const updateFilters = React.useCallback((patch: Partial<MovementFilters>) => {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  }, []);

  const saveMovement = React.useCallback(
    async (payload: CreateMovementInput) => {
      setSaving(true);
      try {
        await api.createMovement(payload);
        toast.success("Movement recorded");
        await load();
      } catch (error) {
        toast.error("Unable to record movement", {
          description: error instanceof Error ? error.message : String(error),
        });
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  return {
    filters,
    setFilters: updateFilters,
    response,
    loading,
    saving,
    refresh: load,
    saveMovement,
  };
}
