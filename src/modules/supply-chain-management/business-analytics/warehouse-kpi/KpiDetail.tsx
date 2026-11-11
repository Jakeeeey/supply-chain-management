"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { display, label, percent, RecordData } from "./api";
import { useWarehouseResource } from "./useWarehouseResource";

const routes: Record<string, { endpoint: string; list: string; id?: string }> = {
  "inventory-accuracy": { endpoint: "inventory-accuracy", list: "counts", id: "countId" },
  "picking-accuracy": { endpoint: "picking-accuracy", list: "consolidations", id: "consolidationId" },
  "stocking-level": { endpoint: "stocking-level-accuracy", list: "orders", id: "orderId" },
  "stocking-level-accuracy": { endpoint: "stocking-level-accuracy", list: "orders", id: "orderId" },
  "receiving-accuracy": { endpoint: "receiving-accuracy", list: "purchase-orders", id: "purchaseOrderId" },
  "loading-readiness": { endpoint: "loading-readiness", list: "consolidations" },
  "location-compliance": { endpoint: "location-compliance", list: "checks", id: "checkId" },
  "stock-damage-loss": { endpoint: "damage-loss", list: "bad-orders" },
  "damage-loss": { endpoint: "damage-loss", list: "bad-orders" },
  housekeeping: { endpoint: "housekeeping", list: "" },
  "sop-safety": { endpoint: "sop-safety", list: "" },
};

export default function KpiDetail({ cardKey, query, onClose }: { cardKey: string; query: string; onClose: () => void }) {
  const config = routes[cardKey];
  const [retry, setRetry] = useState(0);
  const { data: detail, error } = useWarehouseResource<RecordData>(config ? `${config.endpoint}?${query}` : null, retry);
  if (!config) return <p role="alert">No detail route is configured for {cardKey}.</p>;
  const days = Array.isArray(detail?.days) ? detail.days as RecordData[] : [];
  return <section aria-label="KPI detail" className="space-y-4 rounded-xl border bg-card p-4 md:p-6">
    <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">{label(cardKey)}</h2><Button variant="ghost" onClick={onClose}>Close detail</Button></div>
    {error ? <div role="alert">{error}<Button variant="outline" onClick={() => setRetry(n => n + 1)}>Retry</Button></div> : !detail ? <p role="status">Loading KPI detail...</p> : <>
      {config.endpoint === "damage-loss" && <p className="text-sm text-muted-foreground">Loss rates below are lower-is-better. The dashboard performance score is higher-is-better. Amounts retain four decimals until display.</p>}
      {config.endpoint === "loading-readiness" && <p className="text-sm text-muted-foreground">Excellent is included within On time. Untimed and invalid records are shown separately, not treated as late.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(detail).filter(([, value]) => value === null || ["number", "string", "boolean"].includes(typeof value)).map(([key, value]) => <Card key={key}><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{label(key)}</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{key.toLowerCase().includes("percent") ? percent(value) : display(value)}</CardContent></Card>)}</div>
      {days.length > 0 && <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={days}><XAxis dataKey="date" /><YAxis domain={[0, 100]} unit="%" /><Tooltip /><Legend /><Line dataKey="dayPercent" name="Daily %" stroke="var(--color-primary)" connectNulls={false} /><Line dataKey="cumulativePercent" name="Cumulative %" stroke="#b7791f" connectNulls={false} /></LineChart></ResponsiveContainer></div>}
      {["sections", "weeks"].map(key => Array.isArray(detail[key]) && <div key={key}><h3 className="mb-2 font-medium">{label(key)}</h3><RecordTable rows={detail[key] as RecordData[]} /></div>)}
    </>}
    {config.list && <DocumentList endpoint={config.endpoint} list={config.list} idField={config.id} query={query} />}
  </section>;
}

export function RecordTable({ rows, onOpen }: { rows: RecordData[]; onOpen?: (row: RecordData) => void }) {
  if (!rows.length) return <p className="rounded-lg border p-6 text-sm text-muted-foreground">No records for these filters.</p>;
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  return <div className="max-h-[32rem] overflow-auto rounded-lg border"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-muted"><tr>{columns.map(key => <th key={key} className="whitespace-nowrap p-3 font-medium">{label(key)}</th>)}{onOpen && <th className="p-3">Details</th>}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t">{columns.map(key => <td key={key} className="max-w-sm p-3">{key.toLowerCase().includes("percent") ? percent(row[key]) : display(row[key])}</td>)}{onOpen && <td className="p-3"><Button size="sm" variant="outline" onClick={() => onOpen(row)}>SKU lines</Button></td>}</tr>)}</tbody></table></div>;
}

function DocumentList({ endpoint, list, idField, query }: { endpoint: string; list: string; idField?: string; query: string }) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState(endpoint === "loading-readiness" || endpoint === "damage-loss" ? "all" : "misses");
  const [source, setSource] = useState(list);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState("");
  const [retry, setRetry] = useState(0);
  const param = endpoint === "loading-readiness" ? "timing" : endpoint === "damage-loss" ? "reason" : "outcome";
  const options = param === "timing" ? ["all", "late", "no-time", "times-wrong"] : param === "reason" ? ["all", "damage"] : ["misses", "all"];
  const params = new URLSearchParams(query);
    params.set("page", String(page)); params.set("pageSize", "25");
    if (endpoint !== "damage-loss" || source === "returns") params.set(param, filter);
    if (documentId && idField) params.set(idField, documentId);
  const { data, error: requestError, loading } = useWarehouseResource<RecordData>(`${endpoint}/${documentId ? "sku-lines" : source}?${params}`, retry);
  const items = data?.items ?? data?.rows ?? data?.data;
  const malformed = data && (!Array.isArray(items) || typeof data.total !== "number");
  const error = requestError || selectionError || (malformed ? "Unexpected list response: expected rows and total. Confirm the backend list contract." : "");
  const rows = Array.isArray(items) ? items as RecordData[] : [];
  const total = typeof data?.total === "number" ? data.total : 0;
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-3"><h3 className="font-medium">{documentId ? `SKU lines: ${documentId}` : label(source)}</h3>
      {documentId && <Button variant="outline" onClick={() => { setDocumentId(null); setPage(1); }}>Back to documents</Button>}
      {endpoint === "damage-loss" && <select aria-label="Loss source" className="rounded border bg-background p-2" value={source} onChange={e => { setSource(e.target.value); setFilter("all"); setPage(1); }}><option value="bad-orders">Bad orders</option><option value="returns">Supplier returns</option></select>}
      {(endpoint !== "damage-loss" || source === "returns") && <label className="text-sm">{label(param)} <select className="rounded border bg-background p-2" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>{options.map(option => <option key={option} value={option}>{label(option)}</option>)}</select></label>}
    </div>
    {loading ? <p role="status">Loading records...</p> : error ? <div role="alert">{error}<Button variant="outline" onClick={() => { setSelectionError(""); setRetry(n => n + 1); }}>Retry</Button></div> : <>
      <RecordTable rows={rows} onOpen={!documentId && idField ? row => { const id = row[idField] ?? row.id; if (typeof id !== "number" && typeof id !== "string") { setSelectionError(`Document response is missing ${idField}.`); return; } setDocumentId(String(id)); setPage(1); } : undefined} />
      <div className="flex items-center justify-between gap-2 text-sm"><span>{total.toLocaleString()} {documentId ? "SKU lines" : "records"} · Page {page} of {Math.max(1, Math.ceil(total / 25))}</span><div className="flex gap-2"><Button variant="outline" disabled={page === 1} onClick={() => setPage(n => n - 1)}>Previous</Button><Button variant="outline" disabled={page * 25 >= total} onClick={() => setPage(n => n + 1)}>Next</Button></div></div>
    </>}
  </div>;
}
