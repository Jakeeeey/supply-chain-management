// No I/O — only pure functions that produce values.

import type {
  PostDispatchInvoiceRow,
  PostDispatchOtherRow,
  PostDispatchPurchaseRow,
  PostDispatchStaffRow,
} from "../types/dispatch.types";

// ─── Route Stop Processing Types ────────────────────────────

/** Shape of a single route-stop entry from the form payload. */
export interface RouteStopInput {
  invoice_id?: number;
  invoice_ids?: number[];
  sequence: number;
  remarks?: string;
  distance?: number;
  isManualStop?: boolean;
  isPoStop?: boolean;
  po_id?: number;
  status?: string;
  latitude?: number | null;
  longitude?: number | null;
}

/** Result of processing route stops into per-collection payloads. */
export interface ProcessedRouteStops {
  invoicePayloads: Omit<PostDispatchInvoiceRow, "id">[];
  othersPayloads: PostDispatchOtherRow[];
  purchasePayloads: PostDispatchPurchaseRow[];
}

/**
 * Generates a human-readable dispatch number: DP-YYYYMMDD-HHMMXXX
 * where XXX is a random 3-digit suffix to avoid collisions.
 */
export function generateDispatchNo(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr =
    now.getHours().toString().padStart(2, "0") +
    now.getMinutes().toString().padStart(2, "0");
  const randomStr = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `DP-${dateStr}-${timeStr}${randomStr}`;
}

/**
 * Builds the staff payloads (driver + helpers) for a given dispatch plan.
 * Returns an array of rows ready for batch-insert into `post_dispatch_plan_staff`.
 */
export function prepareStaffPayload(
  planId: number,
  driverId: number,
  helpers: { user_id: number }[],
): Omit<PostDispatchStaffRow, "id">[] {
  return [
    {
      post_dispatch_plan_id: planId,
      user_id: driverId,
      role: "Driver",
      is_present: false,
    },
    ...(helpers ?? []).map((h) => ({
      post_dispatch_plan_id: planId,
      user_id: h.user_id,
      role: "Helper" as const,
      is_present: false,
    })),
  ];
}

/**
 * Transforms an array of form-level route-stop entries into
 * per-collection payloads ready for batch insert.
 *
 * Handles three stop types:
 * 1. Manual Stops → `post_dispatch_plan_others`
 * 2. Invoice Stops → `post_dispatch_invoices` (expanded by invoice_ids)
 * 3. PO Stops → `post_dispatch_purchases`
 */
export function processRouteStops(
  planId: number,
  invoices: RouteStopInput[] | undefined,
): ProcessedRouteStops {
  const invoicePayloads: Omit<PostDispatchInvoiceRow, "id">[] = [];
  const othersPayloads: PostDispatchOtherRow[] = [];
  const purchasePayloads: PostDispatchPurchaseRow[] = [];

  if (!invoices || invoices.length === 0) {
    return { invoicePayloads, othersPayloads, purchasePayloads };
  }

  invoices.forEach((item) => {
    // 1. Manual stops → 'others'
    if (item.isManualStop) {
      othersPayloads.push({
        post_dispatch_plan_id: planId,
        remarks: item.remarks || "Manual Stop",
        distance: item.distance || 0,
        sequence: item.sequence,
        status: item.status || "Not Fulfilled",
        latitude: item.latitude || null,
        longitude: item.longitude || null,
      });
    }

    // 2. Real invoices → 'post_dispatch_invoices'
    // Expand invoice_ids (all non-void invoices for this SO) into individual rows
    if (!item.isManualStop && !item.isPoStop) {
      const ids = item.invoice_ids || (item.invoice_id ? [item.invoice_id] : []);
      ids.forEach((invId) => {
        invoicePayloads.push({
          post_dispatch_plan_id: planId,
          invoice_id: invId,
          sequence: item.sequence,
          status: item.status || "Not Fulfilled",
        });
      });
    }

    // 3. Purchase Orders → 'post_dispatch_purchases'
    if (item.isPoStop && item.po_id) {
      purchasePayloads.push({
        post_dispatch_plan_id: planId,
        po_id: item.po_id,
        distance: item.distance || 0,
        sequence: item.sequence,
        status: item.status || "Not Fulfilled",
      });
    }
  });

  return { invoicePayloads, othersPayloads, purchasePayloads };
}
