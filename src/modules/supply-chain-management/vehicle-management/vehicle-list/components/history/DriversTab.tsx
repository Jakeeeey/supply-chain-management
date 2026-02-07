//src/modules/vehicle-management/vehicle-list/components/history/DriversTab.tsx
"use client";

import * as React from "react";
import { toast } from "sonner";

import type { VehicleRow, DispatchPlanApiRow, UserApiRow } from "@/modules/supply-chain-management/vehicle-management/vehicle-list/types";
import {
  listDispatchPlansByVehicle,
  listUsers,
} from "@/modules/supply-chain-management/vehicle-management/vehicle-list/providers/fetchProviders";

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

function monthYear(ms: number) {
  if (!ms) return "N/A";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
    }).format(new Date(ms));
  } catch {
    return "N/A";
  }
}

function buildUserMap(users: UserApiRow[]) {
  const map = new Map<number, string>();
  for (const u of users || []) {
    const id = Number((u as any)?.user_id ?? 0);
    if (!id) continue;

    const first = String((u as any)?.user_fname ?? "").trim();
    const last = String((u as any)?.user_lname ?? "").trim();
    const name = `${first} ${last}`.trim();

    map.set(id, name.length ? name : `User #${id}`);
  }
  return map;
}

type DriverSummary = {
  driverId: number;
  driverName: string;
  startMs: number;
  endMs: number;
  totalTrips: number;
};

function DriversSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={`drv-sk-${i}`}>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-44" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-40" />
              </div>

              <div className="space-y-2 md:text-right">
                <Skeleton className="ml-auto h-3 w-16" />
                <Skeleton className="ml-auto h-4 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function DriversTab({ vehicle }: { vehicle: VehicleRow }) {
  const vehicleId = Number(vehicle?.id ?? 0);

  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<DriverSummary[]>([]);

  const load = React.useCallback(async () => {
    if (!vehicleId) return;

    setLoading(true);
    try {
      const [plans, users] = await Promise.all([
        listDispatchPlansByVehicle(vehicleId),
        listUsers(),
      ]);

      const userMap = buildUserMap(users || []);

      const agg = new Map<number, { start: number; end: number; count: number }>();

      for (const p of plans || []) {
        const driverId = Number((p as any)?.driver_id ?? 0);
        if (!driverId) continue;

        const ms = toMs(pickPlanDate(p) || undefined);
        if (!ms) continue;

        const cur = agg.get(driverId);
        if (!cur) {
          agg.set(driverId, { start: ms, end: ms, count: 1 });
        } else {
          agg.set(driverId, {
            start: Math.min(cur.start, ms),
            end: Math.max(cur.end, ms),
            count: cur.count + 1,
          });
        }
      }

      const summarized: DriverSummary[] = Array.from(agg.entries()).map(
        ([driverId, v]) => ({
          driverId,
          driverName: userMap.get(driverId) || `User #${driverId}`,
          startMs: v.start,
          endMs: v.end,
          totalTrips: v.count,
        })
      );

      summarized.sort((a, b) => b.endMs - a.endMs);

      setRows(summarized);
    } catch (e: any) {
      toast.error("Failed to load drivers", {
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
    return <DriversSkeleton rows={2} />;
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-sm font-semibold">Drivers</div>
          <div className="mt-2 text-sm text-muted-foreground">
            No driver history yet. This will populate once dispatch plans exist.
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestDriverId = rows[0]?.driverId ?? 0;

  return (
    <div className="grid gap-4">
      {rows.map((r) => {
        const period =
          r.driverId === latestDriverId
            ? `${monthYear(r.startMs)} - Present`
            : `${monthYear(r.startMs)} - ${monthYear(r.endMs)}`;

        return (
          <Card key={String(r.driverId)}>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="grid gap-1">
                  <div className="text-xs text-muted-foreground">Driver</div>
                  <div className="text-sm font-medium">{r.driverName}</div>
                </div>

                <div className="grid gap-1">
                  <div className="text-xs text-muted-foreground">Period</div>
                  <div className="text-sm font-medium">{period}</div>
                </div>

                <div className="grid gap-1 md:text-right">
                  <div className="text-xs text-muted-foreground">Total Trips</div>
                  <div className="text-sm font-medium">{r.totalTrips}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
