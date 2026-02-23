import type { DispatchStatusCategory } from "../types";

export function getStatusCategory(apiStatus: string): DispatchStatusCategory {
  if (!apiStatus) return "Other";

  switch (apiStatus) {
    case "Approved":
    case "For Dispatch":
      return "For Dispatch";

    case "For Inbound":
    case "Dispatched":
    case "Inbound":
    case "In Transit":
      return "For Inbound";

    case "Arrived":
    case "For Clearance":
      return "For Clearance";

    case "Posted":
      return "For Approval";

    case "Cleared":
    case "Completed":
      return "Completed";

    default:
      return "Other";
  }
}

export function badgeClassesByCategory(category: DispatchStatusCategory) {
  // Match your screenshot colors (blue / purple / pink)
  const map: Record<DispatchStatusCategory, string> = {
    "For Approval": "bg-yellow-50 text-yellow-700 border-yellow-200",
    "For Dispatch": "bg-blue-50 text-blue-700 border-blue-200",
    "For Inbound": "bg-purple-50 text-purple-700 border-purple-200",
    "For Clearance": "bg-pink-50 text-pink-700 border-pink-200",
    Completed: "bg-green-50 text-green-700 border-green-200",
    Other: "bg-muted text-foreground border-border",
  };
  return map[category] ?? map.Other;
}
