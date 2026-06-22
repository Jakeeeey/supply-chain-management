import { SummaryFilters } from "../types/stock-adjustment-summary.types";

export const stockAdjustmentSummaryApi = {
  async fetchBranches() {
    const res = await fetch("/api/scm/inventory-management/stock-adjustment-summary/branches");
    if (!res.ok) throw new Error("Failed to fetch branches");
    const json = await res.json();
    return json.data || [];
  },

  async fetchSuppliers() {
    const res = await fetch("/api/scm/inventory-management/stock-adjustment-summary/suppliers");
    if (!res.ok) throw new Error("Failed to fetch suppliers");
    const json = await res.json();
    return json.data || [];
  },

  async fetchAdjustments(filters?: SummaryFilters) {
    const queryParams = new URLSearchParams();
    if (filters?.search) queryParams.set("search", filters.search);
    if (filters?.branchId) queryParams.set("branchId", String(filters.branchId));
    if (filters?.type) queryParams.set("type", filters.type);

    const res = await fetch(`/api/scm/inventory-management/stock-adjustment-summary?${queryParams.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch stock adjustments");
    const json = await res.json();
    return json.data || [];
  }
};
