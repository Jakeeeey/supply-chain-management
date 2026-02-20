import type { DispatchPlan } from "../types";
import { endOfWeekExclusive, startOfWeekMonday } from "./date";

export function buildWeeklyTrendData(plans: DispatchPlan[]) {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
  const seed = labels.map((day) => ({ day, dispatches: 0 }));

  const start = startOfWeekMonday(new Date());
  const end = endOfWeekExclusive(start);

  for (const p of plans) {
    if (!p?.createdAt) continue;

    const localString = String(p.createdAt).replace(/Z$/, "");
    const dt = new Date(localString);
    if (Number.isNaN(dt.getTime())) continue;

    if (dt < start || dt >= end) continue;

    const d = dt.getDay(); // Sun=0
    const idx = (d + 6) % 7; // Mon=0..Sun=6
    seed[idx].dispatches += 1;
  }

  return seed;
}
