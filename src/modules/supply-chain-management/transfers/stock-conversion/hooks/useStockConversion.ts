"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
<<<<<<< HEAD
import type { StockConversionProduct, StockConversionPayload } from "../types/stock-conversion.types";
=======
import { type StockConversionProduct, type StockConversionPayload } from "../types";
import { type InventoryFilters } from "../services/stock-conversion";

// --- IN-MEMORY CACHE FOR INSTANT NAVIGATION ---
// This safely preserves data when moving between modules without refetching.
let cachedData: StockConversionProduct[] | null = null;
let cachedTotalCount: number = 0;
let hasBeganGlobalFetch: boolean = false;
// ----------------------------------------------
>>>>>>> origin/master

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

<<<<<<< HEAD
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
=======
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
>>>>>>> origin/master

    try {
      const sp = new URLSearchParams({ type: "inventory", productIds: fetchableIds.join(",") });
      if (branchId !== undefined) sp.set("branchId", String(branchId));
<<<<<<< HEAD
=======

      if (filters) {
          if (filters.supplierShortcut && filters.supplierShortcut !== "all") sp.set("supplierShortcut", filters.supplierShortcut);
          if (filters.productCategory && filters.productCategory !== "all") sp.set("productCategory", filters.productCategory);
          if (filters.unitName && filters.unitName !== "all") sp.set("unitName", filters.unitName);
          if (filters.productBrand && filters.productBrand !== "all") sp.set("productBrand", filters.productBrand);
          if (filters.productIds && filters.productIds.length > 0) sp.set("productIds", filters.productIds.join(","));
      }
>>>>>>> origin/master

      const res = await fetch(`/api/scm/transfers/stock-conversion?${sp.toString()}`, { cache: "no-store" });
      const invJson = await res.json();
      if (!res.ok) throw new Error(invJson.error || "Inventory load failed");

      const invMap = invJson.data || {};
      setData(prev => {
<<<<<<< HEAD
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
=======
        const next = prev.map(p => {
          const qty = invMap[p.productId];
          const rawQty = qty !== undefined ? qty : 0;
          const finalQty = Math.floor(rawQty / (p.conversionFactor || 1));
          return {
              ...p,
              quantity: finalQty,
              totalAmount: Number((finalQty * (p.pricePerUnit || 0)).toFixed(2)),
              inventoryLoaded: true,
              inventoryError: false
>>>>>>> origin/master
          };
        });
        return newData;
      });
    } catch (e: unknown) {
<<<<<<< HEAD
      console.warn("Inventory fetch failed:", (e as Error).message);
=======
        const err = e as Error;
        console.warn("[Caught] Inventory fetch failed:", err.message);
        hasBeganGlobalFetch = false;
        setData(prev => prev.map(p => p.inventoryLoaded === false ? { ...p, inventoryLoaded: true, inventoryError: true } : p));
        // Surface auth errors as a critical error on the page
        if (err?.message?.includes("session") || err?.message?.includes("expired") || err?.message?.includes("401") || err?.message?.includes("403")) {
            setError(err.message);
        } else if (!err?.message?.toLowerCase().includes("aborted") && !err?.message?.toLowerCase().includes("fetch failed")) {
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
            const rawQty = qty !== undefined ? qty : 0;
            const finalQty = Math.floor(rawQty / (p.conversionFactor || 1));
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
      console.warn("[Caught] Batch inventory fetch failed:", err.message);
      // Surface auth errors as critical
      if (err?.message?.includes("session") || err?.message?.includes("expired") || err?.message?.includes("401") || err?.message?.includes("403")) {
          setError(err.message);
      }
>>>>>>> origin/master
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

  const validateDuplicateTag = async (rfid: string, mode: "source" | "target" = "target"): Promise<{ exists: boolean; reason?: string }> => {
    try {
      const res = await fetch(`/api/scm/transfers/stock-conversion/validate-rfid?action=validate_tag&rfid=${encodeURIComponent(rfid)}&mode=${mode}`);
      const data = await res.json();
      return { exists: !!data.exists, reason: data.reason };
    } catch (e) {
      console.error("Validation error:", e);
      return { exists: true, reason: "error" };
    }
  };

  useEffect(() => {
    refresh();
  }, [refresh]);

  const checkProductRfids = async (productId: number, activeBranchId: number): Promise<boolean> => {
    try {
      const res = await fetch(`/api/scm/transfers/stock-conversion/validate-rfid?action=check_product_rfids&branchId=${activeBranchId}&productId=${productId}`);
      if (!res.ok) return false;
      const data = await res.json();
      return data.hasRfids || false;
    } catch {
      return false;
    }
  };

  const validateDuplicateTag = async (rfid: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/scm/transfers/stock-conversion/validate-rfid?action=validate_tag&rfid=${encodeURIComponent(rfid)}`);
      if (!res.ok) return false;
      const data = await res.json();
      return data.exists || false;
    } catch {
      return false;
    }
  };

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
