import type { DispatchSummaryResponse, DispatchPlan } from "../types";

function toQuery(params: Record<string, string | number | boolean | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function fetchDispatchSummary(args?: { limit?: number }) {
  const limit = args?.limit ?? -1;

  const res = await fetch(
    `/api/scm/fleet-management/trip-management/dispatch-summary${toQuery({ limit })}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Failed to fetch dispatch summary");
  }

  const json = (await res.json()) as DispatchSummaryResponse;
  return (json?.data ?? []) as DispatchPlan[];
}
