"use client";

import * as React from "react";
import { toast } from "sonner";

import type { DashboardData, FilterType } from "../types";
import { getDateRangeParams } from "../utils/dateRange";
import { getDeliveryStatistics } from "../providers/fetchProviders";

const EMPTY: DashboardData = {
  chartData: [],
  deliveryStatusCounts: [],
  totalSales: 0,
  avgSales: 0,
};

function toUserMessage(err: any): string {
  // Most common fetch error in Next: "Failed to fetch"
  const msg = String(err?.message || err || "").trim();
  if (!msg) return "Request failed.";

  // Improve common low-signal messages
  if (msg.toLowerCase() === "failed to fetch") return "Server is unreachable. Please try again.";
  return msg;
}

export function useStatisticsDeliveries() {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<DashboardData>(EMPTY);

  const [filterType, setFilterType] = React.useState<FilterType>("thisMonth");
  const [customStartDate, setCustomStartDate] = React.useState("");
  const [customEndDate, setCustomEndDate] = React.useState("");

  const canFetch =
    filterType !== "custom" ||
    (filterType === "custom" && !!customStartDate && !!customEndDate);

  // Prevent toast spam when filters change quickly (or rerender)
  const lastToastKeyRef = React.useRef<string>("");

  const showErrorToast = React.useCallback((message: string) => {
    const key = `${message}`; // stable key
    if (lastToastKeyRef.current === key) return;
    lastToastKeyRef.current = key;

    toast.error("Failed to load", {
      description: message,
    });

    // allow same error again after a short time
    window.setTimeout(() => {
      if (lastToastKeyRef.current === key) lastToastKeyRef.current = "";
    }, 1500);
  }, []);

  const refetch = React.useCallback(async () => {
    if (!canFetch) return;

    const { start, end, viewType } = getDateRangeParams({
      filterType,
      customStartDate,
      customEndDate,
    });

    try {
      setLoading(true);
      const result = await getDeliveryStatistics({
        startDate: start,
        endDate: end,
        viewType,
      });
      setData(result);
    } catch (e: any) {
      const msg = toUserMessage(e);
      showErrorToast(msg);
      setData(EMPTY); // keep UI stable (zeros) but no inline error
    } finally {
      setLoading(false);
    }
  }, [canFetch, filterType, customStartDate, customEndDate, showErrorToast]);

  React.useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    loading,
    data,

    filterType,
    setFilterType,

    customStartDate,
    setCustomStartDate,

    customEndDate,
    setCustomEndDate,

    refetch,
  };
}
