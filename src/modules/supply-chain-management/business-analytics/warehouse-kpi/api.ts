import { z } from "zod";

export type RecordData = Record<string, unknown>;
const count = z.number().int().nonnegative();
const percentage = z.number().min(0).max(100);
const scopeSchema = z.object({ branchIds: z.array(z.number().int().positive()), from: z.iso.date(), to: z.iso.date() });
const cardSchema = z.object({
  key: z.string().min(1), title: z.string().min(1), weight: z.number().nonnegative(),
  scorePercent: percentage.nullable(), included: z.boolean(),
  auditsDone: count.nullish(), auditsCounted: count.nullish(),
});
const summarySchema = scopeSchema.extend({
  overallPercent: percentage.nullable(), targetPercent: percentage, meetsTarget: z.boolean().nullable(),
  weightCovered: z.number().nonnegative(), cardsIncluded: count, cardsTotal: count, cards: z.array(cardSchema),
});
const loadingSchema = scopeSchema.extend({
  consolidations: count, timedToAudited: count, withoutAuditedTime: count, timesOutOfOrder: count,
});
const locationSchema = scopeSchema.extend({ expectedChecks: count, submittedChecks: count, missedChecks: count });
const branchesSchema = z.object({ branches: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })) });
const responseSchemas: Record<string, z.ZodType> = {
  summary: summarySchema, "loading-readiness": loadingSchema, "location-compliance": locationSchema, branches: branchesSchema,
};

export type SummaryScope = z.infer<typeof scopeSchema>;
export type SummaryCard = z.infer<typeof cardSchema>;
export type Summary = z.infer<typeof summarySchema>;
export type Branch = z.infer<typeof branchesSchema>["branches"][number];
export type LoadingReadinessCoverage = z.infer<typeof loadingSchema>;
export type LocationComplianceCoverage = z.infer<typeof locationSchema>;

let refreshing: Promise<boolean> | undefined;

export async function sessionFetch(url: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(url, options);
  if (response.status !== 401) return response;
  // API requests do not pass through the protected page's session-refresh flow.
  refreshing ??= fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" })
    .then(result => result.ok)
    .catch(() => false)
    .finally(() => { refreshing = undefined; });
  if (await refreshing) {
    options?.signal?.throwIfAborted();
    return fetch(url, options);
  }
  return response;
}

export async function warehouseRequest<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await sessionFetch(`/api/scm/warehouse-kpi/${path}`, { signal, cache: "no-store" });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    let backendMessage: string | undefined;
    const dataObj = typeof data === "object" && data !== null ? data as Record<string, unknown> : undefined;
    if (dataObj && typeof dataObj.message === "string" && dataObj.message.trim()) backendMessage = dataObj.message;
    const statusSpecific = response.status === 401 ? "Session expired or not authenticated." :
      response.status === 403 ? "Access denied." :
      response.status === 400 ? "Invalid filters. Check the date range and select a single branch." :
      response.status >= 500 ? "The warehouse service is unavailable. Please retry." :
      undefined;
    throw new Error(backendMessage ?? statusSpecific ?? `Request failed (${response.status}).`);
  }
  if (data === null) throw new Error("The service returned an invalid response.");
  const endpoint = path.split("?")[0];
  const schema = responseSchemas[endpoint];
  if (schema) {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path.join(".") || "response";
      throw new Error(`Invalid ${endpoint} response: missing or malformed ${field}.`);
    }
  }
  return data as T;
}

export function getMonthPeriod(month: number, today = new Date()) {
  return getPeriodFromSelections([month], today.getFullYear(), today);
}

export function getPeriodFromSelections(selectedMonths: number[], selectedYear: number, today = new Date()) {
  // Months are represented 1-12 (January = 1) at the API boundary.
  const months = selectedMonths.length ? selectedMonths : [today.getMonth() + 1];
  const year = selectedYear || today.getFullYear();
  const firstDays = months.map(m => new Date(year, m - 1, 1));
  const lastDays = months.map(m => {
    const zeroIndexed = m - 1;
    const last = new Date(year, zeroIndexed + 1, 0).getDate();
    const isCurrent = year === today.getFullYear() && zeroIndexed === today.getMonth();
    return new Date(year, zeroIndexed, isCurrent ? today.getDate() : last);
  });
  const from = new Date(Math.min(...firstDays.map(d => d.getTime())));
  const to = new Date(Math.max(...lastDays.map(d => d.getTime())));
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: fmt(from), to: fmt(to) };
}

export function scopeLabel(scope: SummaryScope, branches: Branch[] = []) {
  if (scope.branchIds.length === 0) return "No branches reported by the service";
  return scope.branchIds.map(id => {
    const branch = branches.find(item => item.id === String(id));
    return branch ? `${branch.name} (#${id})` : `Branch #${id}`;
  }).join(", ");
}

export function scopeWarning(scope: SummaryScope, branchIds: string[], from: string, to: string) {
  const requested = branchIds.map(Number).filter(id => Number.isFinite(id));
  if (requested.length > 0) {
    const allReported = requested.every(id => scope.branchIds.includes(id));
    const noExtra = scope.branchIds.length === requested.length;
    if (!allReported || !noExtra) {
      return "The service returned a different branch scope. These figures apply to the reported branches, not every requested filter.";
    }
  }
  if (scope.from !== from || scope.to !== to) {
    return "The service returned a different period scope. These figures apply to the reported dates, not the requested filter.";
  }
  return "";
}

export function sameScope(actual: SummaryScope, expected: SummaryScope) {
  const ids = [...actual.branchIds].sort((a, b) => a - b);
  const expectedIds = [...expected.branchIds].sort((a, b) => a - b);
  return actual.from === expected.from && actual.to === expected.to
    && ids.length === expectedIds.length && ids.every((id, index) => id === expectedIds[index]);
}

export function summarizeAuditCompletion(card: SummaryCard) {
  const { auditsDone: done, auditsCounted: counted, scorePercent: score } = card;
  if (counted === 0) return score === null ? "No data" : null;
  if (counted == null || done == null) return "Audit completion unavailable";
  if (score === null && counted > 0 && done === 0) return `Not audited, 0 of ${counted}`;
  return `Audits done: ${done} of ${counted}`;
}

export function percent(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(2)}%` : "--"; }
export function label(key: string) { return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ").replace(/^./, c => c.toUpperCase()); }
export function display(value: unknown): string {
  if (value === null || value === undefined) return "--";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString("en-PH", { maximumFractionDigits: 4 });
  if (Array.isArray(value)) return value.map(display).join(", ");
  if (typeof value === "object") return Object.entries(value as RecordData).map(([key, val]) => `${label(key)}: ${display(val)}`).join("; ");
  return String(value);
}
