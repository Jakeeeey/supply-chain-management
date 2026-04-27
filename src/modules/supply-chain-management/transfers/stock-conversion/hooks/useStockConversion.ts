"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { StockConversionProduct, StockConversionPayload } from "../types/stock-conversion.types";

export function useStockConversion(branchId?: number) {
  const [data, setData] = useState<StockConversionProduct[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [convertingId, setConvertingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [options, setOptions] = useState<{
    brands: { id: number; name: string }[];
    categories: { id: number; name: string }[];
    units: { id: number; name: string }[];
    suppliers: { id: number; name: string; shortcut: string }[];
  }>({ brands: [], categories: [], units: [], suppliers: [] });

  const loadingProductsRef = useRef<Set<number>>(new Set());

  /**
   * Fetch inventory balances for specific products
   */
  const loadProductsInventory = useCallback(async (productIds: number[]) => {
    const fetchableIds = productIds.filter(id => !loadingProductsRef.current.has(id));
    if (!fetchableIds.length) return;
    
    fetchableIds.forEach(id => loadingProductsRef.current.add(id));

    // Keep current quantities if they exist to avoid flicker
    setData(prev => prev.map(p => 
      fetchableIds.includes(p.productId) ? { ...p, inventoryLoaded: p.inventoryLoaded ?? false } : p
    ));

    try {
      const sp = new URLSearchParams({ type: "inventory", productIds: fetchableIds.join(",") });
      if (branchId !== undefined) sp.set("branchId", String(branchId));

      const res = await fetch(`/api/scm/transfers/stock-conversion?${sp.toString()}`, { cache: "no-store" });
      const invJson = await res.json();
      if (!res.ok) throw new Error(invJson.error || "Inventory load failed");

      const invMap = invJson.data || {};
      setData(prev => {
        const newData = prev.map(p => {
          if (!fetchableIds.includes(p.productId)) return p;
          const rawQty = invMap[p.productId] ?? 0;
          const finalQty = Math.floor(rawQty / (p.conversionFactor || 1));
          return {
            ...p,
            quantity: finalQty,
            totalAmount: Number((finalQty * (p.pricePerUnit || 0)).toFixed(2)),
            inventoryLoaded: true,
            inventoryError: false,
          };
        });
        return newData;
      });
    } catch (e: unknown) {
      console.warn("Inventory fetch failed:", (e as Error).message);
      setData(prev => prev.map(p => 
        fetchableIds.includes(p.productId) ? { ...p, inventoryLoaded: true, inventoryError: true } : p
      ));
    } finally {
      fetchableIds.forEach(id => loadingProductsRef.current.delete(id));
    }
  }, [branchId]);

  /**
   * Fetch paginated product list with filters
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        ...filters,
      });
      if (branchId) sp.set("branchId", String(branchId));

      const res = await fetch(`/api/scm/transfers/stock-conversion?${sp.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch stock conversion data");
      
      const newData = json.data || [];
      setData(newData);
      setTotalCount(json.totalCount || 0);
      if (json.options) setOptions(json.options);
      
      // Auto-trigger inventory load for the new page
      if (newData.length && !newData[0].inventoryLoaded) {
        loadProductsInventory(newData.map((p: StockConversionProduct) => p.productId));
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, filters, branchId, loadProductsInventory]);

  // Trigger inventory reload for ALL currently visible products when branchId changes
  useEffect(() => {
    if (data.length > 0) {
      loadProductsInventory(data.map(p => p.productId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, loadProductsInventory]);

  const convertStockAction = async (payload: StockConversionPayload) => {
    setIsUpdating(true);
    setConvertingId(payload.productId);
    try {
      const res = await fetch("/api/scm/transfers/stock-conversion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to convert stock");

      toast.success("Stock conversion complete!");
      
      // Optimistic Update: payload quantities are already in unit terms
      setData(prev => prev.map(p => {
        if (p.productId === payload.productId) {
          const newQty = Math.max(0, p.quantity - payload.quantityToConvert);
          return { ...p, quantity: newQty, totalAmount: Number((newQty * p.pricePerUnit).toFixed(2)) };
        }
        if (p.productId === payload.targetProductId) {
          const newQty = p.quantity + payload.convertedQuantity;
          return { ...p, quantity: newQty, totalAmount: Number((newQty * p.pricePerUnit).toFixed(2)) };
        }
        return p;
      }));

      return data;
    } catch (e: unknown) {
      toast.error((e as Error).message);
      throw e;
    } finally {
      setIsUpdating(false);
      setConvertingId(null);
    }
  };

  const checkProductRfids = async (productId: number, activeBranchId: number): Promise<boolean> => {
    try {
      const res = await fetch(`/api/scm/transfers/stock-conversion/validate-rfid?action=check_product_rfids&branchId=${activeBranchId}&productId=${productId}`);
      const data = await res.json();
      return !!data.hasRfids;
    } catch {
      return false;
    }
  };

  const validateDuplicateTag = async (rfid: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/scm/transfers/stock-conversion/validate-rfid?action=validate_tag&rfid=${encodeURIComponent(rfid)}`);
      const data = await res.json();
      return !!data.exists;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    totalCount,
    page,
    pageSize,
    setPage,
    setPageSize,
    options,
    isLoading,
    isUpdating,
    convertingId,
    error,
    refresh,
    loadProductsInventory,
    setFilters: (newFilters: Record<string, string>) => {
      setFilters(prev => {
        if (JSON.stringify(prev) === JSON.stringify(newFilters)) return prev;
        return newFilters;
      });
    },
    convertStock: convertStockAction,
    checkProductRfids,
    validateDuplicateTag,
  };
}
