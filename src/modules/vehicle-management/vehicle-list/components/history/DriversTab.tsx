"use client";

import * as React from "react";
import { toast } from "sonner";

import type { VehicleRow, DispatchPlanApiRow, UserApiRow } from "../../types";
import { listDispatchPlansByVehicle, listUsers } from "../../providers/fetchProviders";

import { Skeleton } from "@/components/ui/skeleton";

type DriverHistoryRow = {
  driverId: number;
  driverName: string;
  startMs: number;
  endMs: number;
  totalTrips: number;
  isCurrent: boolean;
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function toMs(v?: string | null) {
  if (!v) return 0;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : 0;
}

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

function fmtMonthYear(ms: number) {
  if (!ms) return "N/A";
  const d = new Date(ms);
  const m = MONTHS[d.getMonth()] ?? "N/A";
  return `${m} ${d.getFullYear()}`;
}

function buildUserMap(users: UserApiRow[]) {
  const map = new Map<number, string>();
  for (const u of users || []) {
    const id = Number(u?.user_id ?? 0);
    if (!id) continue;

    const first = String(u?.user_fname ?? "").trim();
    const last = String(u?.user_lname ?? "").trim();
    const name = `${first} ${last}`.trim();

    map.set(id, name.length ? name : `User #${id}`);
  }
  return map;
}

function DriversSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-background p-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Skeleton className="h-3 w-[60px]" />
              <Skeleton className="h-5 w-[160px]" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-[60px]" />
              <Skeleton className="h-5 w-[180px]" />
            </div>
            <div className="space-y-2 md:text-right">
              <Skeleton className="ml-auto h-3 w-[70px]" />
              <Skeleton className="ml-auto h-5 w-[60px]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
  alignRight,
}: {
  label: string;
  value: React.ReactNode;
  alignRight?: boolean;
}) {
  return (
    <div className={["grid gap-1", alignRight ? "md:text-right" : ""].join(" ")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

export default function DriversTab({ vehicle }: { vehicle: VehicleRow }) {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<DriverHistoryRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [plans, users] = await Promise.all([
        listDispatchPlansByVehicle(vehicle.id),
        listUsers(),
      ]);

      const userMap = buildUserMap(users);

      const usable = (plans || [])
        .filter((p) => p?.driver_id != null)
        .map((p) => {
          const driverId = Number(p.driver_id);
          const ms = toMs(pickDate(p) || undefined) || Number(p.id || 0);
          return { driverId, ms };
        })
        .filter((x) => Number.isFinite(x.driverId) && x.driverId > 0);

      if (!usable.length) {
        setRows([]);
        return;
      }

      // Latest trip date determines "Present"
      const globalMax = usable.reduce((acc, x) => Math.max(acc, x.ms), 0);

      const grouped = new Map<number, { min: number; max: number; count: number }>();
      for (const x of usable) {
        const g = grouped.get(x.driverId);
        if (!g) {
          grouped.set(x.driverId, { min: x.ms, max: x.ms, count: 1 });
        } else {
          g.min = Math.min(g.min, x.ms);
          g.max = Math.max(g.max, x.ms);
          g.count += 1;
        }
      }

      const out: DriverHistoryRow[] = [];
      for (const [driverId, g] of grouped.entries()) {
        out.push({
          driverId,
          driverName: userMap.get(driverId) ?? `User #${driverId}`,
          startMs: g.min,
          endMs: g.max,
          totalTrips: g.count,
          isCurrent: g.max === globalMax,
        });
      }

      // Current first, then most recent
      out.sort((a, b) => {
        if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
        return b.endMs - a.endMs;
      });

      setRows(out);
    } catch (e: any) {
      const msg = String(e?.message || e);
      setError(msg);
      toast.error("Failed to load driver history", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [vehicle.id]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (loading) return <DriversSkeleton />;

  if (error) {
    return (
      <div className="rounded-lg border bg-background p-6">
        <div className="text-sm font-semibold">Drivers</div>
        <div className="mt-2 text-sm text-destructive">{error}</div>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-lg border bg-background p-6">
        <div className="text-sm font-semibold">Drivers</div>
        <div className="mt-2 text-sm text-muted-foreground">
          No driver history yet. This will populate once driver history tables are available.
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {rows.map((r) => {
        const start = fmtMonthYear(r.startMs);
        const end = r.isCurrent ? "Present" : fmtMonthYear(r.endMs);
        const period = start !== "N/A" ? `${start} - ${end}` : "N/A";

        return (
          <div key={r.driverId} className="rounded-lg border bg-background p-4">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <Field label="Driver" value={r.driverName} />
              <Field label="Period" value={period} />
              <Field label="Total Trips" value={r.totalTrips} alignRight />
            </div>
          </div>
        );
      })}
    </div>
  );
}
