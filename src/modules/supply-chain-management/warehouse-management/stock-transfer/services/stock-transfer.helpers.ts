// ─── Stock Transfer Module — Pure Helpers ───────────────────
// No I/O — only pure functions that produce values.

import type { BranchRow, OrderGroup, OrderGroupItem, StockTransferRow } from "../types/stock-transfer.types";

/**
 * Generates a unique order number: ST-YYYYMMDDHHMMSS-{src}-{tgt}
 */
export function generateOrderNo(sourceBranch: string, targetBranch: string): string {
  const now = new Date().toISOString();
  const datePart = now.replace(/[-:.TZ]/g, "").slice(0, 14);
  return `ST-${datePart}-${sourceBranch ?? "0"}-${targetBranch ?? "0"}`;
}

/**
 * Derives a display name from a branch record.
 * Tries common field names used across the Directus schema.
 */
export function getBranchLabel(branch: BranchRow): string {
  return branch.branch_name || branch.name || `Branch ${branch.id}`;
}

/**
 * Resolves a branch name from an ID using the branches array.
 */
export function resolveBranchName(
  branchId: number | null,
  branches: BranchRow[],
): string {
  if (!branchId) return "Unknown";
  const branch = branches.find((b) => b.id === branchId);
  return branch ? getBranchLabel(branch) : `Branch ${branchId}`;
}

/**
 * Groups flat stock transfer rows by `order_no` into OrderGroup objects.
 * Used by all downstream modules (approval, dispatching, receive).
 */
export function groupByOrderNo(transfers: StockTransferRow[]): OrderGroup[] {
  const groups: Record<string, OrderGroup> = {};

  transfers.forEach((st) => {
    if (!groups[st.order_no]) {
      groups[st.order_no] = {
        orderNo: st.order_no,
        sourceBranch: st.source_branch,
        targetBranch: st.target_branch,
        leadDate: st.lead_date,
        dateRequested: st.date_requested,
        dateEncoded: st.date_encoded || "",
        items: [],
        totalAmount: 0,
        status: st.status,
      };
    }

    // Cast to OrderGroupItem with defaults for enrichment fields
    const item: OrderGroupItem = {
      ...st,
      scannedQty: 0,
      receivedQty: 0,
<<<<<<< HEAD
      scannedRfids: [],
      receivedRfids: [],
=======
>>>>>>> origin/master
      qtyAvailable: 0,
      isLoosePack: false,
    };

    groups[st.order_no].items.push(item);

    // Calculate total using allocated or ordered quantity
    const qty = st.allocated_quantity ?? st.ordered_quantity ?? 0;
    const unitPrice =
      st.ordered_quantity > 0
        ? Number(st.amount || 0) / st.ordered_quantity
        : 0;
    groups[st.order_no].totalAmount += Number((qty * unitPrice).toFixed(2));
  });

  // Sort by date encoded descending (newest first)
  return Object.values(groups).sort(
    (a, b) =>
      new Date(b.dateEncoded).getTime() - new Date(a.dateEncoded).getTime(),
  );
}

/**
 * Calculates the unit price for a stock transfer line item.
 */
export function calculateUnitPrice(item: StockTransferRow): number {
  return item.ordered_quantity > 0
    ? Number(item.amount || 0) / item.ordered_quantity
    : 0;
}

/**
 * Calculates total amount for scanned items.
 */
export function calculateGrandTotal(
  items: { unitPrice: number; unitQty: number }[],
): number {
  return items.reduce(
    (sum, item) => sum + parseFloat((item.unitPrice * item.unitQty).toFixed(2)),
    0,
  );
}
