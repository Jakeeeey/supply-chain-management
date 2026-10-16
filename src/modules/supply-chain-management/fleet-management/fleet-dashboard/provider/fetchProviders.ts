import type { FleetDashboardResponse } from "../types";

export async function fetchFleetDashboardData(): Promise<FleetDashboardResponse> {
  const res = await fetch("/api/scm/fleet-management/fleet-dashboard", {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch fleet dashboard data");
  }

  return res.json();
}
