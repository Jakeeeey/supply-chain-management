import type {
  EmergencyLookups,
  EmergencyReport,
  EmergencyReportPayload,
  EmergencyStatus,
} from "../types";

export type EmergencyReportFilters = {
  search?: string;
  status?: string;
  severity?: string;
  incidentType?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function fetchEmergencyLookups(): Promise<EmergencyLookups> {
  const res = await fetch("/api/scm/fleet-management/emergency-management/lookups");
  if (!res.ok) throw new Error("Failed to load emergency lookups");
  return res.json();
}

export async function fetchEmergencyReports(filters: EmergencyReportFilters = {}): Promise<EmergencyReport[]> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.severity && filters.severity !== "all") params.set("severity", filters.severity);
  if (filters.incidentType && filters.incidentType !== "all") params.set("incident_type", filters.incidentType);
  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);

  const query = params.toString();
  const res = await fetch(`/api/scm/fleet-management/emergency-management/reports${query ? `?${query}` : ""}`);
  if (!res.ok) throw new Error("Failed to load emergency reports");
  const data = await res.json();
  return data.reports || [];
}

export async function createEmergencyReport(payload: EmergencyReportPayload): Promise<EmergencyReport> {
  const res = await fetch("/api/scm/fleet-management/emergency-management/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to report emergency");
  return data.report;
}

export async function updateEmergencyReportStatus(
  id: number,
  payload: {
    status: EmergencyStatus;
    assigned_to?: number | null;
    resolution_notes?: string | null;
    cancelled_reason?: string | null;
  }
): Promise<EmergencyReport> {
  const res = await fetch(`/api/scm/fleet-management/emergency-management/reports/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to update emergency report");
  return data.report;
}
