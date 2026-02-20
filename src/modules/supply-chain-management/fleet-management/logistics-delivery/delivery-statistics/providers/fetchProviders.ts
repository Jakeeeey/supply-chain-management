import type { DashboardData, StatisticsParams } from "../types";

const NEXT_PUBLIC_API_BASE_UR = "/api/scm/fleet-management/logistics-delivery/delivery-statistics";

export async function getDeliveryStatistics(params: StatisticsParams): Promise<DashboardData> {
  const sp = new URLSearchParams();
  sp.set("startDate", params.startDate);
  sp.set("endDate", params.endDate);
  sp.set("viewType", params.viewType);

  const res = await fetch(`${NEXT_PUBLIC_API_BASE_UR}?${sp.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as DashboardData;
}
