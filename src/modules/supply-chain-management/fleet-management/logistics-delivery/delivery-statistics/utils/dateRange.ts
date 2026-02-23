import type { FilterType, ViewType } from "../types";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Formats date in local time as YYYY-MM-DD.
 * Avoids timezone shift that can happen with toISOString().
 */
export function formatDateLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

export function getDateRangeParams(input: {
  filterType: FilterType;
  customStartDate: string;
  customEndDate: string;
}): { start: string; end: string; viewType: ViewType } {
  const now = new Date();

  let start = new Date();
  let end = new Date();
  let viewType: ViewType = "day";

  if (input.filterType === "thisWeek") {
    // Monday-start week
    const day = now.getDay(); // 0=Sun..6=Sat
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    start = new Date(now.getFullYear(), now.getMonth(), diff);
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    viewType = "day";
    return { start: formatDateLocal(start), end: formatDateLocal(end), viewType };
  }

  if (input.filterType === "thisMonth") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    viewType = "day";
    return { start: formatDateLocal(start), end: formatDateLocal(end), viewType };
  }

  if (input.filterType === "thisYear") {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31);
    viewType = "month";
    return { start: formatDateLocal(start), end: formatDateLocal(end), viewType };
  }

  if (input.filterType === "custom" && input.customStartDate && input.customEndDate) {
    return { start: input.customStartDate, end: input.customEndDate, viewType: "day" };
  }

  return { start: formatDateLocal(start), end: formatDateLocal(end), viewType };
}
