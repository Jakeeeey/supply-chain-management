"use client";

import * as React from "react";
import { toast } from "sonner";
import type {
  CreateReservationInput,
  PaginatedResponse,
  PartReservationRow,
  ReservationFilters,
  UpdateReservationInput,
} from "../types";
import * as api from "../providers/partsInventoryApi";

const initialFilters: ReservationFilters = {
  search: "",
  partId: "",
  branchId: "",
  vehicleId: "",
  status: "all",
  page: 1,
  limit: 25,
};

const emptyResponse: PaginatedResponse<PartReservationRow> = {
  data: [],
  meta: { page: 1, limit: 25, total: 0 },
};

export function usePartReservations() {
  const [filters, setFilters] = React.useState<ReservationFilters>(initialFilters);
  const [response, setResponse] = React.useState(emptyResponse);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setResponse(await api.fetchReservations(filters));
    } catch (error) {
      toast.error("Failed to load reservations", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const updateFilters = React.useCallback((patch: Partial<ReservationFilters>) => {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  }, []);

  const create = React.useCallback(
    async (payload: CreateReservationInput) => {
      setSaving(true);
      try {
        await api.createReservation(payload);
        toast.success("Reservation created");
        await load();
      } catch (error) {
        toast.error("Unable to create reservation", {
          description: error instanceof Error ? error.message : String(error),
        });
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  const update = React.useCallback(
    async (payload: UpdateReservationInput) => {
      setSaving(true);
      try {
        await api.updateReservation(payload);
        toast.success("Reservation updated");
        await load();
      } catch (error) {
        toast.error("Unable to update reservation", {
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
    createReservation: create,
    updateReservation: update,
  };
}
