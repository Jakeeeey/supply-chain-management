"use client";

import * as React from "react";
import { toast } from "sonner";

import type { VehicleRow, DispatchPlanApiRow } from "../../types";
import { listDispatchPlansByVehicle } from "../../providers/fetchProviders";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function pickDate(p: DispatchPlanApiRow) {
  return (
    p.time_of_dispatch ||
    p.estimated_time_of_dispatch ||
    p.date_encoded ||
    p.time_of_arrival ||
    p.estimated_time_of_arrival ||
    null
  );
}

function fmtDateISO(v?: string | null) {
  const s = String(v ?? "").trim();
  if (!s) return "N/A";
  // ISO -> YYYY-MM-DD
  return s.includes("T") ? s.slice(0, 10) : s;
}

function toMs(v?: string | null) {
  if (!v) return 0;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : 0;
}

function fmtDuration(p: DispatchPlanApiRow) {
  const start =
    toMs(p.time_of_dispatch) ||
    toMs(p.estimated_time_of_dispatch);

  const end =
    toMs(p.time_of_arrival) ||
    toMs(p.estimated_time_of_arrival);

  if (!start || !end || end <= start) return "N/A";

  const diffMin = Math.round((end - start) / 60000);
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;

  if (h > 0 && m === 0) return `${h} hrs`;
  if (h > 0 && m > 0) return `${h} hrs ${m} mins`;
  return `${m} mins`;
}

function fmtDistanceKm(v?: number | null) {
  if (v == null || !Number.isFinite(Number(v))) return "N/A";
  const n = Number(v);
  // keep as integer if it is whole
  if (Math.abs(n - Math.round(n)) < 1e-9) return `${Math.round(n)} km`;
  return `${n.toFixed(1)} km`;
}

function pointLabel(v: unknown) {
  if (v == null) return null;
  if (typeof v === "string") {
    const s = v.trim();
    return s.length ? s : null;
  }
  if (typeof v === "number") return `Location #${v}`;
  const s = String(v).trim();
  return s.length ? s : null;
}

function buildRoute(p: DispatchPlanApiRow) {
  const explicit = String(p.route ?? "").trim();
  if (explicit) return explicit;

  const origin =
    String(p.origin ?? "").trim() ||
    pointLabel(p.starting_point) ||
    null;

  const dest =
    String(p.destination ?? "").trim() ||
    pointLabel(p.destination_point) ||
    pointLabel(p.ending_point) ||
    null;

  if (origin && dest) return `${origin} to ${dest}`;
  if (origin) return String(origin);
  if (dest) return String(dest);

  return "N/A";
}

function TripsSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-background p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-3 w-[60px]" />
              <Skeleton className="h-5 w-[140px]" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-[60px]" />
              <Skeleton className="h-5 w-[180px]" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-[70px]" />
              <Skeleton className="h-5 w-[110px]" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-[70px]" />
              <Skeleton className="h-5 w-[100px]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

export default function TripsTab({ vehicle }: { vehicle: VehicleRow }) {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<DispatchPlanApiRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listDispatchPlansByVehicle(vehicle.id);

      // ensure newest first (just in case)
      const sorted = [...(data || [])].sort((a, b) => {
        const am = toMs(pickDate(a) || undefined) || Number(a.id || 0);
        const bm = toMs(pickDate(b) || undefined) || Number(b.id || 0);
        return bm - am;
      });

      setRows(sorted);
    } catch (e: any) {
      const msg = String(e?.message || e);
      setError(msg);
      toast.error("Failed to load trips", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [vehicle.id]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (loading) return <TripsSkeleton />;

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-sm font-semibold">Trips</div>
          <div className="mt-2 text-sm text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!rows.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-sm font-semibold">Trips</div>
          <div className="mt-2 text-sm text-muted-foreground">
            No trips recorded yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {rows.map((p) => (
        <div key={p.id} className="rounded-lg border bg-background p-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Field label="Date" value={fmtDateISO(pickDate(p))} />
            <Field label="Route" value={buildRoute(p)} />
            <Field label="Distance" value={fmtDistanceKm(p.total_distance ?? null)} />
            <Field label="Duration" value={fmtDuration(p)} />
          </div>
        </div>
      ))}
    </div>
  );
}
