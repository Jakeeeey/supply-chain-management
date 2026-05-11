"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  StockAdjustmentManualDetail,
  StockAdjustmentManualFormValues,
  StockAdjustmentManualProduct,
  SelectionBranch,
  SelectionSupplier
} from "../types/stock-adjustment-manual.schema";

/**
 * Dedicated hook for the Stock Adjustment Form.
 *
 * This hook only fetches data the form actually needs (products, branches,
 * RFID status) and avoids re-fetching the adjustment list, which is
 * only relevant to the list view.
 */
export function useStockAdjustmentManualForm() {
  const [branches, setBranches] = useState<SelectionBranch[]>([]);
  const [suppliers, setSuppliers] = useState<SelectionSupplier[]>([]);
  const [products, setProducts] = useState<StockAdjustmentManualProduct[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [isSuppliersLoading, setIsSuppliersLoading] = useState(false);
  const [isInventoryLoading, setIsInventoryLoading] = useState(false);
  const [inventoryMap, setInventoryMap] = useState<Map<number, number>>(new Map());

  // Track whether initial product + branch fetch has completed
  const hasFetchedInitialData = useRef(false);

  // ── Branches (fetch once) ──────────────────────────────────────────
  const fetchBranches = useCallback(async () => {
    try {
      const response = await fetch("/api/scm/inventory-management/stock-adjustment-manual/branches");
      const result = await response.json();
      if (result.data) setBranches(result.data);
    } catch (err) {
      console.error("Failed to fetch branches:", err);
    }
  }, []);

  // ── Products (lazy, debounce-ready) ────────────────────────────────
  const fetchProducts = useCallback(async (search?: string) => {
    setIsProductsLoading(true);
    try {
      const response = await fetch(
        `/api/scm/inventory-management/stock-adjustment-manual/products${search ? `?search=${search}` : ""}`
      );
      const result = await response.json();
      setProducts(result.data || []);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setIsProductsLoading(false);
    }
  }, []);

  // ── Suppliers (fetch once) ────────────────────────────────────────
  const fetchSuppliers = useCallback(async () => {
    setIsSuppliersLoading(true);
    try {
      const response = await fetch("/api/scm/inventory-management/stock-adjustment-manual/suppliers");
      const result = await response.json();
      if (result.data) setSuppliers(result.data);
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
    } finally {
      setIsSuppliersLoading(false);
    }
  }, []);

  // ── Products by supplier (replaces the old fetchProducts on mount) ──
  const fetchProductsBySupplier = useCallback(async (supplierId: number, search?: string) => {
    setIsProductsLoading(true);
    setProducts([]); // Clear previous supplier's products
    try {
      const params = new URLSearchParams();
      params.set("supplierId", String(supplierId));
      if (search) params.set("search", search);
      const response = await fetch(
        `/api/scm/inventory-management/stock-adjustment-manual/products?${params.toString()}`
      );
      const result = await response.json();
      setProducts(result.data || []);
    } catch (err) {
      console.error("Failed to fetch products by supplier:", err);
    } finally {
      setIsProductsLoading(false);
    }
  }, []);


  // ── Branch inventory (pre-fetch once per branch) ──────────────────
  const fetchBranchInventory = useCallback(async (branchId: number) => {
    setIsInventoryLoading(true);
    try {
      const response = await fetch(
        `/api/scm/inventory-management/stock-adjustment-manual/branch-inventory?branchId=${branchId}`
      );
      if (!response.ok) return;
      const result = await response.json();
      const map = new Map<number, number>();
      (result.inventory || []).forEach((item: { product_id: number; running_inventory?: number }) => {
        map.set(Number(item.product_id), Number(item.running_inventory || 0));
      });
      setInventoryMap(map);
    } catch (err) {
      console.error("Failed to fetch branch inventory:", err);
    } finally {
      setIsInventoryLoading(false);
    }
  }, []);

  // ── Fetch a single adjustment for edit mode ───────────────────────
  const fetchById = useCallback(async (id: number): Promise<StockAdjustmentManualDetail> => {
    const response = await fetch(`/api/scm/inventory-management/stock-adjustment-manual/${id}`);
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result.data;
  }, []);

  // ── Per-product helpers (called on product select) ────────────────
  const fetchInventory = useCallback(async (productId: number, branchId: number): Promise<number> => {
    try {
      const response = await fetch(
        `/api/scm/inventory-management/stock-adjustment-manual/inventory?productId=${productId}&branchId=${branchId}`
      );
      if (!response.ok) return 0;
      const result = await response.json();
      return result.currentStock || 0;
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
      return 0;
    }
  }, []);


  const fetchNextDocNo = useCallback(async (type: "IN" | "OUT"): Promise<string> => {
    try {
      const response = await fetch(`/api/scm/inventory-management/stock-adjustment-manual/next-doc-no?type=${type}`);
      const result = await response.json();
      return result.doc_no;
    } catch (err) {
      console.error("Failed to fetch next doc no:", err);
      // Fallback
      return `SA${type}-${new Date().getFullYear()}-001`;
    }
  }, []);

  // ── Create / Update ───────────────────────────────────────────────
  const createAdjustment = useCallback(async (values: StockAdjustmentManualFormValues) => {
    const response = await fetch("/api/scm/inventory-management/stock-adjustment-manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        header: {
          doc_no: values.doc_no,
          branch_id: values.branch_id,
          type: values.type,
          remarks: values.remarks,
          supplier_id: values.supplier_id,
          amount: values.items.reduce(
            (acc, item) => acc + item.quantity * (item.cost_per_unit || 0),
            0
          ),
        },
        items: values.items,
      }),
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result.data;
  }, []);

  const updateAdjustment = useCallback(async (id: number, values: StockAdjustmentManualFormValues) => {
    const response = await fetch(`/api/scm/inventory-management/stock-adjustment-manual/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        header: {
          doc_no: values.doc_no,
          branch_id: values.branch_id,
          type: values.type,
          remarks: values.remarks,
          supplier_id: values.supplier_id,
          amount: values.items.reduce(
            (acc, item) => acc + item.quantity * (item.cost_per_unit || 0),
            0
          ),
        },
        items: values.items,
      }),
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result.data;
  }, []);

  const postAdjustment = useCallback(async (id: number) => {
    const response = await fetch(`/api/scm/inventory-management/stock-adjustment-manual/${id}/post`, {
      method: "POST",
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result.data;
  }, []);

  // ── Initial data fetch (branches + suppliers, once) ────────────────
  useEffect(() => {
    if (!hasFetchedInitialData.current) {
      hasFetchedInitialData.current = true;
      fetchBranches();
      fetchSuppliers();
    }
  }, [fetchBranches, fetchSuppliers]);

  return {
    branches,
    suppliers,
    products,
    isProductsLoading,
    isSuppliersLoading,
    isInventoryLoading,
    inventoryMap,
    fetchById,
    fetchProducts,
    fetchProductsBySupplier,
    fetchBranchInventory,
    fetchInventory,
    fetchNextDocNo,
    createAdjustment,
    updateAdjustment,
    postAdjustment,
  };
}
