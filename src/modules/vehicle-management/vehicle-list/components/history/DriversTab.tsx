"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import type { VehicleRow, DispatchPlanApiRow, UserApiRow } from "../../types";
import { listDispatchPlansByVehicle, listUsers } from "../../providers/fetchProviders";

import { Card, CardContent } from "@/components/ui/card";

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

      // Identify latest plan overall (to mark "Present" period)
      let latestOverallMs = 0;
      let latestOverallDriverId = 0;

      for (const p of plans || []) {
        const driverId = Number((p as any)?.driver_id ?? 0);
        const ms = toMs(pickPlanDate(p) || undefined);
        if (driverId && ms >= latestOverallMs) {
          latestOverallMs = ms;
          latestOverallDriverId = driverId;
        }
      }

      // Group by driver_id
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

      // If there are no plans, keep empty
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
          <div className="text-sm text-muted-foreground">No vehicle selected.</div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading drivers...
      </div>
    );
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

  // Determine “Present” driver = most recent endMs after sorting
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
