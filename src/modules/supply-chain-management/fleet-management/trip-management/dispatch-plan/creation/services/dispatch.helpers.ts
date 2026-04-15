// ─── Dispatch Creation Module — Pure Helpers ────────────────
// No I/O — only pure functions that produce values.

import type { PostDispatchStaffRow } from "../types/dispatch.types";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/+$/,
  "",
);
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

/**
 * Returns the cleaned Directus base URL (no trailing slash).
 */
export function getDirectusBaseUrl(): string {
  return DIRECTUS_BASE;
}

/**
 * Returns the standard authorization + content-type headers
 * required by all Directus API calls.
 */
export function directusHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
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
