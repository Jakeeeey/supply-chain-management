export function formatDateTime(dateString: string | null) {
  if (!dateString) return "N/A";

  // Keep your legacy behavior (strip trailing Z)
  const localString = String(dateString).replace(/Z$/, "");
  const date = new Date(localString);

  if (Number.isNaN(date.getTime())) return "Invalid Date";

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function startOfWeekMonday(d = new Date()) {
  const dt = new Date(d);
  const jsDay = dt.getDay(); // Sun=0
  const diffToMonday = (jsDay + 6) % 7;
  dt.setDate(dt.getDate() - diffToMonday);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export function endOfWeekExclusive(startMonday: Date) {
  const dt = new Date(startMonday);
  dt.setDate(dt.getDate() + 7);
  return dt;
}
