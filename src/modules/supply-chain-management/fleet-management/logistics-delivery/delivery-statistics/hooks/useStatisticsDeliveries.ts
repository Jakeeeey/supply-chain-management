"use client";

import * as React from "react";
import type { DashboardData, FilterType } from "../types";
import { getDateRangeParams } from "../utils/dateRange";
import { getDeliveryStatistics } from "../providers/fetchProviders";

const EMPTY: DashboardData = {
  chartData: [],
  deliveryStatusCounts: [],
  totalSales: 0,
  avgSales: 0,
};

export function useStatisticsDeliveries() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<DashboardData>(EMPTY);

  const [filterType, setFilterType] = React.useState<FilterType>("thisMonth");
  const [customStartDate, setCustomStartDate] = React.useState("");
  const [customEndDate, setCustomEndDate] = React.useState("");

  const canFetch =
    filterType !== "custom" ||
    (filterType === "custom" && !!customStartDate && !!customEndDate);

  const refetch = React.useCallback(async () => {
    if (!canFetch) return;

    const { start, end, viewType } = getDateRangeParams({
      filterType,
      customStartDate,
      customEndDate,
    });

    try {
      setError(null);
      setLoading(true);
      const result = await getDeliveryStatistics({
        startDate: start,
        endDate: end,
        viewType,
      });
      setData(result);
    } catch (e: any) {
      setError(e?.message || "Failed to fetch delivery statistics");
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [canFetch, filterType, customStartDate, customEndDate]);

  React.useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    loading,
    error,
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
