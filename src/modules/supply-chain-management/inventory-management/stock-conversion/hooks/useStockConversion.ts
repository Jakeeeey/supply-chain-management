"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { type StockConversionProduct, type StockConversionPayload } from "../types/stock-conversion.schema";

export function useStockConversion() {
  const [data, setData] = useState<StockConversionProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scm/inventory-management/stock-conversion");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch stock conversion data");
      setData(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const convertStockAction = async (payload: StockConversionPayload) => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/scm/inventory-management/stock-conversion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to convert stock");

      toast.success("Stock conversion complete!");
      await refresh();
      return data;
    } catch (err: any) {
      toast.error(err.message || "Failed to process conversion");
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    isLoading,
    isUpdating,
    error,
    refresh,
    convertStock: convertStockAction,
  };
}
