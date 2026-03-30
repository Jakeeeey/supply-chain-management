"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { type StockConversionProduct, type StockConversionPayload } from "../types";
import { type InventoryFilters } from "../services/stock-conversion";

// --- IN-MEMORY CACHE FOR INSTANT NAVIGATION ---
// This safely preserves data when moving between modules without refetching.
let cachedData: StockConversionProduct[] | null = null;
let cachedTotalCount: number = 0;
let hasBeganGlobalFetch: boolean = false;
// ----------------------------------------------

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

  // 1. Initial Load: Fetch paginated products (now fetches ALL, caches in memory)
  const refresh = useCallback(async (forceRefresh = false) => {
    // Return cache instantly if available!
    if (!forceRefresh && cachedData !== null) {
      console.log("[useStockConversion] Serving instantly from memory cache!");
      setData(cachedData);
      setTotalCount(cachedTotalCount);
      setIsLoading(false);
      if (!hasBeganGlobalFetch) {
        hasBeganGlobalFetch = true;
        loadInventory();
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams();
      // Ask API to return every single product so frontend can paginate
      sp.set("limit", "-1");

      const res = await fetch(`/api/scm/transfers/stock-conversion?${sp.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch stock conversion data");
      
      const products: StockConversionProduct[] = json.data || [];
      const total = json.totalCount || products.length;
      
      // Save this page's results to cache
      cachedData = products;
      cachedTotalCount = total;
      
      setData(products);
      setTotalCount(total);
      setIsLoading(false);

      if (!hasBeganGlobalFetch || forceRefresh) {
        hasBeganGlobalFetch = true;
        loadInventory();
      }
    } catch (e: unknown) {
      const err = e as Error;
      setError(err?.message ?? "An error occurred");
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Targeted Inventory Fetch: Triggered by UI/Filters
  const loadInventory = useCallback(async (filters?: InventoryFilters) => {
    console.log("[useStockConversion] Triggering targeted background inventory fetch...", filters);
    
    // Set loading state for products matching these filters
    setData(prev => prev.map(p => p.inventoryLoaded !== true ? { ...p, inventoryLoaded: false } : p));

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
      setData(prev => {
        const next = prev.map(p => {
          const qty = invMap[p.productId];
          const finalQty = qty !== undefined ? qty : 0;
          return {
              ...p,
              quantity: finalQty,
              totalAmount: Number((finalQty * (p.pricePerUnit || 0)).toFixed(2)),
              inventoryLoaded: true,
              inventoryError: false
          };
        });
        
        cachedData = next; // sync cache
        return next;
      });
    } catch (e: unknown) {
        const err = e as Error;
        console.error("Inventory fetch failed:", err);
        hasBeganGlobalFetch = false;
        setData(prev => prev.map(p => p.inventoryLoaded === false ? { ...p, inventoryLoaded: true, inventoryError: true } : p));
        // Surface auth errors as a critical error on the page
        if (err?.message?.includes("session") || err?.message?.includes("expired") || err?.message?.includes("401") || err?.message?.includes("403")) {
            setError(err.message);
        } else if (!err?.message?.toLowerCase().includes("aborted")) {
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
           return { ...p, inventoryLoaded: false, inventoryError: false };
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
        const next = prev.map(p => {
          if (fetchableIds.includes(p.productId)) {
            const qty = invMap[p.productId];
            const finalQty = qty !== undefined ? qty : 0;
            return {
              ...p,
              quantity: finalQty,
              totalAmount: Number((finalQty * (p.pricePerUnit || 0)).toFixed(2)),
              inventoryLoaded: true,
              inventoryError: false
            };
          }
          return p;
        });

        cachedData = next; // sync cache
        return next;
      });
    } catch (e: unknown) {
      const err = e as Error;
      console.error("Batch inventory fetch failed:", err);
      // Surface auth errors as critical
      if (err?.message?.includes("session") || err?.message?.includes("expired") || err?.message?.includes("401") || err?.message?.includes("403")) {
          setError(err.message);
      }
      setData(prev => prev.map(p => 
        fetchableIds.includes(p.productId) ? { ...p, inventoryLoaded: true, inventoryError: true } : p
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
      setData(prev => {
        const next = prev.map(p => {
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
        });
        
        cachedData = next; // sync cache
        return next;
      });

      return data;
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message || "Failed to process conversion");
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (hasBeganGlobalFetch && branchId !== undefined) {
      loadInventory();
    }
  }, [branchId, loadInventory]);

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
