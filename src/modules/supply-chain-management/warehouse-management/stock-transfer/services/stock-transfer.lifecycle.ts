import type { 
  CreateTransferPayload, 
  UpdateTransferPayload,
  StockTransferListResponse,
  RfidLookupResponse,
  ProductListResponse
} from "../types/stock-transfer.types";

/**
 * Service for client-side API interaction.
 * These methods are called by React hooks to communicate with /api/ handlers.
 */

export const stockTransferLifecycleService = {
  /**
   * Fetches transfers filtered by status(es) through the Next.js API proxy.
   */
  async fetchTransfers(status?: string): Promise<StockTransferListResponse> {
    const url = `/api/scm/warehouse-management/stock-transfer${status ? `?status=${status}` : ""}`;
    const res = await fetch(url, { cache: "no-store" });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch transfers (${res.status})`);
    }
    
    return res.json();
  },

  /**
   * Performs an RFID lookup (calling the Spring Boot API through the proxy).
   */
  async lookupRfid(rfid: string, branchId?: number): Promise<RfidLookupResponse> {
    const params = new URLSearchParams({
      action: "lookup_rfid",
      rfid,
      ...(branchId ? { branch_id: String(branchId) } : {}),
    });
    
    const res = await fetch(`/api/scm/warehouse-management/stock-transfer?${params.toString()}`);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `RFID lookup failed (${res.status})`);
    }
    
    return res.json();
  },

  /**
   * Fetches products with inventory quantities for a branch.
   */
  async fetchProducts(branchId: number, search?: string): Promise<ProductListResponse> {
    const params = new URLSearchParams({
      action: "products",
      branch_id: String(branchId),
      ...(search ? { search } : {}),
    });
    
    const res = await fetch(`/api/scm/warehouse-management/stock-transfer?${params.toString()}`);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch products (${res.status})`);
    }
    
    return res.json();
  },

  /**
   * Submits a new stock transfer request.
   */
  async submitTransferRequest(payload: CreateTransferPayload): Promise<{ orderNo: string }> {
    const res = await fetch("/api/scm/warehouse-management/stock-transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to create transfer (${res.status})`);
    }
    
    return res.json();
  },

  /**
   * Updates transfer status and records RFID scans.
   */
  async submitStatusUpdate(payload: UpdateTransferPayload): Promise<{ success: boolean }> {
    const res = await fetch("/api/scm/warehouse-management/stock-transfer", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update status (${res.status})`);
    }
    
    return res.json();
  },

  /**
   * Simplified PATCH for manual dispatching.
   */
  async submitManualDispatch(ids: number[], status: string): Promise<{ success: boolean }> {
    const res = await fetch("/api/scm/warehouse-management/stock-transfer/dispatching-manual", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, status }),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Manual dispatch failed (${res.status})`);
    }
    
    return res.json();
  },

  /**
   * Simplified PATCH for manual receiving.
   */
  async submitManualReceive(ids: number[], status: string): Promise<{ success: boolean }> {
    const res = await fetch("/api/scm/warehouse-management/stock-transfer/receive-manual", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, status }),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Manual receive failed (${res.status})`);
    }
    
    return res.json();
  },
};
