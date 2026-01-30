"use client";

import * as React from "react";
import { toast } from "sonner";

import type { VehicleRow, DispatchPlanApiRow } from "../../types";
import { listDispatchPlansByVehicle } from "../../providers/fetchProviders";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function toMs(v?: string | null) {
  if (!v) return 0;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : 0;
}

function pickPlanDate(p: DispatchPlanApiRow) {
  return (
    p.time_of_dispatch ||
    p.estimated_time_of_dispatch ||
    p.date_encoded ||
    p.time_of_arrival ||
    p.estimated_time_of_arrival ||
    null
  );
}

function fmtDate(v?: string | null) {
  const s = String(v ?? "").trim();
  if (!s) return "N/A";
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function toNumberSafe(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtDistanceKm(v: unknown) {
  const n = toNumberSafe(v);
  if (!n) return "N/A";
  return `${n} km`;
}

function fmtDuration(dispatchIso?: string | null, arrivalIso?: string | null) {
  const a = toMs(dispatchIso || undefined);
  const b = toMs(arrivalIso || undefined);
  if (!a || !b || b < a) return "N/A";

  const mins = Math.round((b - a) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;

  if (h <= 0) return `${m} mins`;
  if (m === 0) return `${h} hrs`;
  return `${h} hrs ${m} mins`;
}

function TripsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={`trip-sk-${i}`}>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-32" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-52" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function TripsTab({ vehicle }: { vehicle: VehicleRow }) {
  const vehicleId = Number(vehicle?.id ?? 0);

  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<DispatchPlanApiRow[]>([]);

  const load = React.useCallback(async () => {
    if (!vehicleId) return;

    setLoading(true);
    try {
      const data = await listDispatchPlansByVehicle(vehicleId);

      const sorted = [...(data || [])].sort((a, b) => {
        const am = toMs(pickPlanDate(a) || undefined);
        const bm = toMs(pickPlanDate(b) || undefined);
        return bm - am;
      });

      setRows(sorted);
    } catch (e: any) {
      toast.error("Failed to load trips", {
        description: String(e?.message || e),
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (!vehicleId) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground">
            No vehicle selected.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <TripsSkeleton rows={3} />;
  }

  if (rows.length === 0) {
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
      {rows.map((p) => {
        const date = fmtDate(pickPlanDate(p));
        const route = "N/A"; // leave blank until you have location joins
        const distance = fmtDistanceKm((p as any)?.total_distance);
        const duration = fmtDuration(
          (p as any)?.estimated_time_of_dispatch || (p as any)?.time_of_dispatch,
          (p as any)?.estimated_time_of_arrival || (p as any)?.time_of_arrival
        );

        return (
          <Card key={String((p as any)?.id ?? `${date}-${Math.random()}`)}>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-1">
                  <div className="text-xs text-muted-foreground">Date</div>
                  <div className="text-sm font-medium">{date}</div>
                </div>

                <div className="grid gap-1">
                  <div className="text-xs text-muted-foreground">Route</div>
                  <div className="text-sm font-medium">{route}</div>
                </div>

                <div className="grid gap-1">
                  <div className="text-xs text-muted-foreground">Distance</div>
                  <div className="text-sm font-medium">{distance}</div>
                </div>

                <div className="grid gap-1">
                  <div className="text-xs text-muted-foreground">Duration</div>
                  <div className="text-sm font-medium">{duration}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
