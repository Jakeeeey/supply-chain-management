// src/modules/vehicle-management/vehicle-list/components/history/TripsTab.tsx
"use client";

import * as React from "react";
import { toast } from "sonner";

import type { VehicleRow, DispatchPlanApiRow } from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/types";
import { listDispatchPlansByVehicle } from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/providers/fetchProviders";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Navigation, Route } from "lucide-react";

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

function tripStatusVariant(status?: string | null) {
  const s = String(status || "").toLowerCase();
  if (s.includes("completed") || s.includes("delivered")) return "default";
  if (s.includes("progress") || s.includes("transit") || s.includes("dispatched")) return "secondary";
  if (s.includes("cancelled")) return "destructive";
  return "outline";
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
    } catch (e) {
      toast.error("Failed to load trips", {
        description: String(e instanceof Error ? e.message : e),
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

  // Summary statistics
  const totalTrips = rows.length;
  const completedTrips = rows.filter((r) =>
    String(r.status || "").toLowerCase().includes("completed")
  ).length;
  const inTransitTrips = rows.filter((r) => {
    const s = String(r.status || "").toLowerCase();
    return s.includes("transit") || s.includes("dispatched") || s.includes("progress");
  }).length;
  const totalDist = rows.reduce((acc, r) => acc + toNumberSafe(r.total_distance), 0);

  return (
    <div className="space-y-4">
      {/* Trip & Dispatch Summary Card */}
      <Card>
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Trip Summary & Dispatch Integration</div>
            <div className="text-xs text-muted-foreground">
              Real-time summary of trips executed and dispatched for this vehicle.
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={load}
            className="h-8 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Trips</div>
            <div className="text-xl font-bold mt-1">{totalTrips}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Active Dispatch</div>
            <div className="text-xl font-bold mt-1 text-primary">{inTransitTrips}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Completed</div>
            <div className="text-xl font-bold mt-1 text-green-600 dark:text-green-400">
              {completedTrips}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Distance</div>
            <div className="text-xl font-bold mt-1">{totalDist.toLocaleString()} km</div>
          </CardContent>
        </Card>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Navigation className="h-10 w-10 text-muted-foreground/60 mx-auto mb-2" />
            <div className="text-sm font-semibold">No dispatch trips recorded yet</div>
            <div className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              When this vehicle is assigned to delivery dispatch plans, completed and ongoing trip summaries will appear here automatically.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((p) => {
            const date = fmtDate(pickPlanDate(p));
            const routeStr = p.route || (p.origin && p.destination ? `${p.origin} → ${p.destination}` : "Standard Route");
            const distance = fmtDistanceKm(p.total_distance);
            const duration = fmtDuration(
              p.estimated_time_of_dispatch || p.time_of_dispatch,
              p.estimated_time_of_arrival || p.time_of_arrival
            );

            return (
              <Card key={String(p.id ?? `${date}-${Math.random()}`)} className="hover:border-primary/40 transition">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4 text-primary shrink-0" />
                      <div className="text-sm font-semibold">{p.doc_no || `Trip #${p.id}`}</div>
                    </div>
                    <Badge variant={tripStatusVariant(p.status)} className="px-2.5">
                      {p.status || "Completed"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4 pt-3">
                    <div className="grid gap-1">
                      <div className="text-xs text-muted-foreground">Date</div>
                      <div className="text-sm font-medium">{date}</div>
                    </div>

                    <div className="grid gap-1">
                      <div className="text-xs text-muted-foreground">Route</div>
                      <div className="text-sm font-medium truncate">{routeStr}</div>
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

                  {p.remarks && (
                    <div className="text-xs text-muted-foreground mt-2 border-t pt-2">
                      Remarks: {p.remarks}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
