import { dispatchCreationLifecycleService } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/services";
import {
  DispatchCreationFormValues,
  DispatchCreationMasterData,
} from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/types/schema";
import { useCallback, useEffect, useState } from "react";

export function useDispatchCreation() {
  const [masterData, setMasterData] =
    useState<DispatchCreationMasterData | null>(null);
  const [isLoadingMasterData, setIsLoadingMasterData] = useState(true);
  const [errorMasterData, setErrorMasterData] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchMasterData = useCallback(async () => {
    setIsLoadingMasterData(true);
    setErrorMasterData(null);
    try {
      const res = await fetch(
        "/api/scm/fleet-management/trip-management/dispatch-creation?type=master",
      );
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setMasterData(result.data);
    } catch (err: any) {
      setErrorMasterData(err.message || "Failed to load master data");
    } finally {
      setIsLoadingMasterData(false);
    }
  }, []);

  const [dispatchSummary, setDispatchSummary] = useState<any[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const fetchSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const res = await fetch(
        "/api/scm/fleet-management/trip-management/dispatch-summary",
      );
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setDispatchSummary(result.data || []);
    } catch (err: any) {
      console.error("Failed to load dispatch summary:", err.message);
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    fetchMasterData();
    fetchSummary();
  }, [fetchMasterData, fetchSummary]);

  const createTrip = async (values: DispatchCreationFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response =
        await dispatchCreationLifecycleService.createTrip(values);
      fetchSummary(); // Refresh summary after creation
      return response;
    } catch (err: any) {
      setSubmitError(
        err.message || "An unexpected error occurred during trip creation.",
      );
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    masterData,
    isLoadingMasterData,
    errorMasterData,

    dispatchSummary,
    isLoadingSummary,
    refreshSummary: fetchSummary,

    createTrip,
    isSubmitting,
    submitError,

    refreshMasterData: fetchMasterData,
  };
}
