import type { EmergencyIncidentType, EmergencySeverity, EmergencyStatus } from "./types";

export const INCIDENT_TYPE_LABELS: Record<EmergencyIncidentType, string> = {
  breakdown: "Breakdown",
  accident: "Accident",
  medical: "Medical",
  fire: "Fire",
  cargo_issue: "Cargo Issue",
  road_hazard: "Road Hazard",
  other: "Other",
};

export const SEVERITY_LABELS: Record<EmergencySeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const STATUS_LABELS: Record<EmergencyStatus, string> = {
  reported: "Reported",
  acknowledged: "Acknowledged",
  responding: "Responding",
  resolved: "Resolved",
  cancelled: "Cancelled",
};

export const INCIDENT_TYPES = Object.keys(INCIDENT_TYPE_LABELS) as EmergencyIncidentType[];
export const SEVERITIES = Object.keys(SEVERITY_LABELS) as EmergencySeverity[];
export const STATUSES = Object.keys(STATUS_LABELS) as EmergencyStatus[];
