"use client";

import type { EnrichedApprovedPlan, EnrichedPlanDetail, ReadinessFilter } from "../types/dispatch.types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { DispatchCreationFormValues } from "../types/dispatch.schema";
import { toast } from "sonner";

// ─── Hook Configuration ─────────────────────────────────────

interface UseDispatchFormStateOptions {
  /** The react-hook-form instance for the dispatch form. */
  form: UseFormReturn<DispatchCreationFormValues>;
  /** When set, the hook operates in "edit" mode and includes trip context. */
  tripId?: number | null;
  /** Master-data vehicles list for capacity lookup. */
  vehicles?: { vehicle_id: number; maximum_weight?: number | string }[];
}

// ─── Hook Return Shape ──────────────────────────────────────

interface UseDispatchFormStateReturn {
  approvedPlans: EnrichedApprovedPlan[];
  filteredPlans: EnrichedApprovedPlan[];
  readinessFilter: ReadinessFilter;
  setReadinessFilter: (filter: ReadinessFilter) => void;
  isLoadingPlans: boolean;
  planDetails: EnrichedPlanDetail[];
  isLoadingDetails: boolean;
  searchQuery: string;
  page: number;
  hasMore: boolean;

  /** Loads approved PDPs for the given branch. */
  loadApprovedPlans: (
    branchId: number,
    currentPage: number,
    currentSearch: string,
    isLoadMore?: boolean,
    currentPdpIds?: number[],
  ) => Promise<void>;

  /** Handles PDP checkbox toggle — fetches details and preserves sequence. */
  handlePlanSelect: (pdpIdStr: string) => Promise<void>;

  /** Updates the search query and resets pagination. */
  onSearchChange: (val: string) => void;

  /** Advances pagination. */
  onLoadMore: () => void;

  /** Directly sets plan details (for drag-reorder and initial load). */
  setPlanDetails: React.Dispatch<React.SetStateAction<EnrichedPlanDetail[]>>;

  /** Directly sets approved plans (for initial edit load). */
  setApprovedPlans: React.Dispatch<React.SetStateAction<EnrichedApprovedPlan[]>>;

  /** Sets loading state for plans (for external orchestration). */
  setIsLoadingPlans: React.Dispatch<React.SetStateAction<boolean>>;

  /** Total weight of all items in planDetails. */
  totalWeight: number;

  /** Maximum weight capacity of the selected vehicle. */
  vehicleCapacity: number;
}

// ─── Hook Implementation ────────────────────────────────────

/**
 * Shared state and logic for the PDP sidebar, invoice sidebar,
 * and plan-selection flow used by both Create and Edit modals.
 */
export function useDispatchFormState({
  form,
  tripId,
  vehicles,
}: UseDispatchFormStateOptions): UseDispatchFormStateReturn {
  const [approvedPlans, setApprovedPlans] = useState<EnrichedApprovedPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [planDetails, setPlanDetails] = useState<EnrichedPlanDetail[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [readinessFilter, setReadinessFilter] = useState<ReadinessFilter>("all");

  // ── Debounce search ───────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ── Derived: total weight ─────────────────────────────────
  const totalWeight = useMemo(
    () => planDetails.reduce((sum, d) => sum + (d.weight || 0), 0),
    [planDetails],
  );

  // ── Derived: vehicle capacity ─────────────────────────────
  const selectedVehicleId = form.watch("vehicle_id");
  const vehicleCapacity = useMemo(() => {
    if (!vehicles || !selectedVehicleId) return 0;
    const v = vehicles.find((v) => v.vehicle_id === selectedVehicleId);
    return Number(v?.maximum_weight || 0);
  }, [vehicles, selectedVehicleId]);

  // ── Sync form amount with planDetails ─────────────────────
  useEffect(() => {
    const total = planDetails.reduce((sum, d) => sum + (d.amount || 0), 0);
    form.setValue("amount", total);
  }, [planDetails, form]);


  // ── Load approved plans from API ──────────────────────────
  const loadApprovedPlans = useCallback(
    async (
      branchId: number,
      currentPage: number,
      currentSearch: string,
      isLoadMore = false,
      currentPdpIds?: number[],
    ) => {
      setIsLoadingPlans(true);
      if (!isLoadMore) setApprovedPlans([]);
      try {
        const url = new URL(
          "/api/scm/fleet-management/trip-management/dispatch-plan/creation",
          window.location.origin,
        );
        url.searchParams.append("type", "approved_plans");
        url.searchParams.append("branch_id", String(branchId));
        url.searchParams.append("limit", "25");
        url.searchParams.append("offset", String((currentPage - 1) * 25));
        if (currentSearch) {
          url.searchParams.append("search", currentSearch);
        }
        if (currentPdpIds && currentPdpIds.length > 0) {
          url.searchParams.append("current_plan_id", currentPdpIds.join(","));
        }

        const res = await fetch(url.toString(), { cache: "no-store" });
        const result = await res.json();
        if (result.error) throw new Error(result.error);

        const newPlans: EnrichedApprovedPlan[] = result.data || [];
        setHasMore(newPlans.length >= 25);
        setApprovedPlans((prev) => (isLoadMore ? [...prev, ...newPlans] : newPlans));
      } catch {
        toast.error("Failed to load approved pre-dispatch plans");
      } finally {
        setIsLoadingPlans(false);
      }
    },
    [],
  );

  // ── Auto-reload when branch/search/page changes ───────────
  const selectedBranch = form.watch("starting_point");
  const [prevBranch, setPrevBranch] = useState(selectedBranch);
  
  useEffect(() => {
    let currentPage = page;
    let isLoadMore = page > 1;

    if (selectedBranch !== prevBranch) {
      setPage(1);
      currentPage = 1;
      isLoadMore = false;
      setPrevBranch(selectedBranch);
    }

    if (selectedBranch && selectedBranch > 0) {
      loadApprovedPlans(
        selectedBranch,
        currentPage,
        debouncedSearch,
        isLoadMore,
        form.getValues("pre_dispatch_plan_ids")
      );
    }
  }, [selectedBranch, page, debouncedSearch, loadApprovedPlans, form, prevBranch]);

  // ── Derived: filtered plans ───────────────────────────────
  const filteredPlans = useMemo(() => {
    if (readinessFilter === "all") return approvedPlans;
    if (readinessFilter === "ready") return approvedPlans.filter(p => p.is_selectable);
    return approvedPlans.filter(p => p.readiness_reason === readinessFilter);
  }, [approvedPlans, readinessFilter]);
  // ── Handle PDP selection toggle ───────────────────────────
  const handlePlanSelect = useCallback(
    async (pdpIdStr: string) => {
      const selectedPdpId = Number(pdpIdStr);
      const pdp = approvedPlans.find((p) => p.dispatch_id === selectedPdpId);
      if (!pdp) return;

      const currentIds = form.getValues("pre_dispatch_plan_ids") || [];
      const isSelected = currentIds.includes(selectedPdpId);
      const newIds = isSelected
        ? currentIds.filter((id) => id !== selectedPdpId)
        : [...currentIds, selectedPdpId];

      form.setValue("pre_dispatch_plan_ids", newIds, { shouldValidate: true });

      // Inherit driver/vehicle/branch from the first selected PDP
      if (newIds.length > 0) {
        const firstPlan = approvedPlans.find((p) => p.dispatch_id === newIds[0]);
        if (firstPlan && newIds.length === 1) {
          if (firstPlan.driver_id && !form.getValues("driver_id"))
            form.setValue("driver_id", Number(firstPlan.driver_id));
          if (firstPlan.vehicle_id && !form.getValues("vehicle_id"))
            form.setValue("vehicle_id", Number(firstPlan.vehicle_id));
          if (firstPlan.branch_id && !form.getValues("starting_point"))
            form.setValue("starting_point", Number(firstPlan.branch_id));
        }
      }

      // Preserve current sequence for manual/PO stops
      const currentSeqMap = new Map<string | number, number>();
      planDetails.forEach((d, idx) => {
        if (d.order_no) currentSeqMap.set(d.order_no, idx);
        if (d.isManualStop && d.detail_id) currentSeqMap.set(d.detail_id, idx);
        if (d.isPoStop && d.detail_id) currentSeqMap.set(d.detail_id, idx);
      });

      const retainedStops = planDetails.filter((d) => d.isManualStop || d.isPoStop);

      if (newIds.length === 0) {
        setPlanDetails(retainedStops);
        return;
      }

      // Fetch plan details (sales orders) for all combined plans
      setIsLoadingDetails(true);
      try {
        const detailUrl = new URL(
          "/api/scm/fleet-management/trip-management/dispatch-plan/creation",
          window.location.origin,
        );
        detailUrl.searchParams.append("type", "plan_details");
        detailUrl.searchParams.append("plan_ids", newIds.join(","));
        if (tripId) {
          detailUrl.searchParams.append("trip_id", String(tripId));
        }

        const res = await fetch(detailUrl.toString(), { cache: "no-store" });
        const result = await res.json();
        if (result.error) throw new Error(result.error);

        const fetchedItems: EnrichedPlanDetail[] = result.data || [];
        // In edit mode, filter out manual/PO stops from API (we keep local ones)
        const fetchedInvoices = tripId
          ? fetchedItems.filter((i) => !i.isManualStop && !i.isPoStop)
          : fetchedItems;

        const combined = [...fetchedInvoices, ...retainedStops];

        // Restore sequence for existing items
        combined.sort((a, b) => {
          const keyA = a.isManualStop || a.isPoStop ? a.detail_id : a.order_no;
          const keyB = b.isManualStop || b.isPoStop ? b.detail_id : b.order_no;
          const seqA = keyA !== undefined && currentSeqMap.has(keyA) ? currentSeqMap.get(keyA)! : 9999;
          const seqB = keyB !== undefined && currentSeqMap.has(keyB) ? currentSeqMap.get(keyB)! : 9999;
          return seqA - seqB;
        });

        setPlanDetails(combined);
      } catch {
        toast.error("Failed to load plan details");
      } finally {
        setIsLoadingDetails(false);
      }
    },
    [approvedPlans, form, planDetails, tripId],
  );

  // ── Public setters for search/pagination ──────────────────
  const onSearchChange = useCallback((val: string) => {
    setSearchQuery(val);
    setPage(1);
  }, []);

  const onLoadMore = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  return {
    approvedPlans,
    filteredPlans,
    readinessFilter,
    setReadinessFilter,
    isLoadingPlans,
    planDetails,
    isLoadingDetails,
    searchQuery,
    page,
    hasMore,
    loadApprovedPlans,
    handlePlanSelect,
    onSearchChange,
    onLoadMore,
    setPlanDetails,
    setApprovedPlans,
    setIsLoadingPlans,
    totalWeight,
    vehicleCapacity,
  };
}
