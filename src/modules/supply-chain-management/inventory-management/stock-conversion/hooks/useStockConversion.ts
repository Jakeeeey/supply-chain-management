"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { type StockConversionProduct, type StockConversionPayload } from "../types/stock-conversion.schema";

export function useStockConversion(branchId?: number) {
  const [data, setData] = useState<StockConversionProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch Products (Instant)
      const res = await fetch("/api/scm/inventory-management/stock-conversion");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch stock conversion data");
      
      const products: StockConversionProduct[] = json.data || [];
      setData(products);
      setIsLoading(false); // First load done

      // 2. Fetch Inventory (Slow, 10s)
      console.log("[useStockConversion] Triggering background inventory fetch...");
      const invUrl = `/api/scm/inventory-management/stock-conversion?type=inventory${branchId ? `&branchId=${branchId}` : ""}`;
      fetch(invUrl)
        .then(res => res.json())
        .then(invJson => {
            console.log("[useStockConversion] Background inventory data received");
            const invMap = invJson.data || {};
            setData(prev => prev.map(p => {
                const qty = invMap[p.productId] || 0;
                return {
                    ...p,
                    quantity: qty,
                    totalAmount: Number((qty * (p.pricePerUnit || 0)).toFixed(2)),
                    inventoryLoaded: true
                };
            }));
        })
        .catch(err => {
            console.error("Async inventory load failed:", err);
            // Optionally update state to show failure
            setData(prev => prev.map(p => ({ ...p, inventoryLoaded: false })));
            toast.error("Inventory data unavailable at the moment.");
        });

    } catch (err: any) {
      setError(err.message);
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
