"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { type StockConversionProduct, type StockConversionPayload } from "../types";

export function useStockConversion(branchId?: number) {
  const [data, setData] = useState<StockConversionProduct[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Safeguard to prevent multiple concurrent requests for the same product
  const loadingProductsRef = useRef<Set<number>>(new Set());

  // 1. Initial Load: Fetch paginated products
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("limit", String(pageSize));

      const res = await fetch(`/api/scm/transfers/stock-conversion?${sp.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch stock conversion data");
      
      const products: StockConversionProduct[] = json.data || [];
      const total = json.totalCount || 0;
      
      setData(products);
      setTotalCount(total);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  }, [page, pageSize]);

  // 2. Targeted Inventory Fetch: Triggered by UI/Filters
  const loadInventory = useCallback(async (filters?: any) => {
    console.log("[useStockConversion] Triggering inventory fetch. Filters:", filters);
    
    // Set loading state for products matching these filters
    // If we have filters, we might not know which products match yet locally,
    // so we set all to loading if it's a "big refresh" or just the specific ones if known.
    setData(prev => prev.map(p => ({ ...p, inventoryLoaded: false })));

    try {
      const sp = new URLSearchParams();
      sp.set("type", "inventory");
      if (branchId !== undefined) sp.set("branchId", String(branchId));
      
      if (filters) {
        if (filters.supplierShortcut && filters.supplierShortcut !== "all") sp.set("supplierShortcut", filters.supplierShortcut);
        if (filters.productCategory && filters.productCategory !== "all") sp.set("productCategory", filters.productCategory);
        if (filters.unitName && filters.unitName !== "all") sp.set("unitName", filters.unitName);
        if (filters.productBrand && filters.productBrand !== "all") sp.set("productBrand", filters.productBrand);
        if (filters.productIds && filters.productIds.length > 0) sp.set("productIds", filters.productIds.join(","));
      }

      const invUrl = `/api/scm/transfers/stock-conversion?${sp.toString()}`;
      const res = await fetch(invUrl);
      const invJson = await res.json();
      
      if (!res.ok) throw new Error(invJson.error || "Inventory load failed");

      const invMap = invJson.data || {};
      setData(prev => prev.map(p => {
          const qty = invMap[p.productId];
          if (qty !== undefined) {
            return {
                ...p,
                quantity: qty,
                totalAmount: Number((qty * (p.pricePerUnit || 0)).toFixed(2)),
                inventoryLoaded: true
            };
          }
          // If we were filtering by something else, we don't necessarily want to set everything to 0
          // but if it was a broad fetch, we might. For now, only update if present in map.
          return p;
      }));
    } catch (err: any) {
        console.error("Inventory fetch failed:", err);
        setData(prev => prev.map(p => ({ ...p, inventoryLoaded: true })));
        // Surface auth errors as a critical error on the page
        if (err?.message?.includes("session") || err?.message?.includes("expired") || err?.message?.includes("401") || err?.message?.includes("403")) {
            setError(err.message);
        } else {
            toast.error(`Inventory failed: ${err.message}`);
        }
    }
  }, [branchId]);

  const loadProductsInventory = useCallback(async (productIds: number[]) => {
    if (!productIds.length) return;
    
    // Filter out products that are already being fetched
    const fetchableIds = productIds.filter(id => !loadingProductsRef.current.has(id));
    if (!fetchableIds.length) return;
    
    // Mark as currently fetching
    fetchableIds.forEach(id => loadingProductsRef.current.add(id));

    // Mark these specific products as loading (only if not already loading)
    setData(prev => {
      let changed = false;
      const next = prev.map(p => {
        if (fetchableIds.includes(p.productId) && p.inventoryLoaded !== false) {
           changed = true;
           return { ...p, inventoryLoaded: false };
        }
        return p;
      });
      return changed ? next : prev;
    });

    try {
      const sp = new URLSearchParams();
      sp.set("type", "inventory");
      if (branchId !== undefined) sp.set("branchId", String(branchId));
      sp.set("productIds", fetchableIds.join(","));

      const res = await fetch(`/api/scm/transfers/stock-conversion?${sp.toString()}`);
      const invJson = await res.json();
      if (!res.ok) throw new Error(invJson.error || "Batch inventory load failed");

      const invMap = invJson.data || {};
      setData(prev => {
        return prev.map(p => {
          if (fetchableIds.includes(p.productId)) {
            const qty = invMap[p.productId];
            const finalQty = qty !== undefined ? qty : 0;
            return {
              ...p,
              quantity: finalQty,
              totalAmount: Number((finalQty * (p.pricePerUnit || 0)).toFixed(2)),
              inventoryLoaded: true
            };
          }
          return p;
        });
      });
    } catch (err: any) {
      console.error("Batch inventory fetch failed:", err);
      // Surface auth errors as critical
      if (err?.message?.includes("session") || err?.message?.includes("expired") || err?.message?.includes("401") || err?.message?.includes("403")) {
          setError(err.message);
      } else {
          toast.error(`Batch Inventory failed: ${err.message}`);
      }
      setData(prev => prev.map(p => 
        fetchableIds.includes(p.productId) ? { ...p, inventoryLoaded: true } : p
      ));
    } finally {
      // Remove from tracking ref
      fetchableIds.forEach(id => loadingProductsRef.current.delete(id));
    }
  }, [branchId]);

  const convertStockAction = async (payload: StockConversionPayload) => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/scm/transfers/stock-conversion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to convert stock");

      toast.success("Stock conversion complete!");
      
      // Perform local state update for immediate feedback instead of slow refetch
      setData(prev => prev.map(p => {
        // Source Product Update
        if (p.productId === payload.productId) {
          const newQty = Math.max(0, p.quantity - payload.quantityToConvert);
          return {
            ...p,
            quantity: newQty,
            totalAmount: Number((newQty * (p.pricePerUnit || 0)).toFixed(2))
          };
        }
        // Target Product Update
        if (p.productId === payload.targetProductId) {
          const newQty = p.quantity + payload.convertedQuantity;
          return {
            ...p,
            quantity: newQty,
            totalAmount: Number((newQty * (p.pricePerUnit || 0)).toFixed(2))
          };
        }
        return p;
      }));

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
    totalCount,
    page,
    pageSize,
    setPage,
    setPageSize,
    isLoading,
    isUpdating,
    error,
    refresh,
    loadInventory,
    loadProductsInventory,
    convertStock: convertStockAction,
  };
}
