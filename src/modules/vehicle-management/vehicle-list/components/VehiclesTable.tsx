//src/modules/vehicle-management/vehicle-list/components/VehiclesTable.tsx
"use client";

import * as React from "react";
import { Eye } from "lucide-react";

import type { VehicleRow } from "../types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function statusVariant(s: string) {
  const v = String(s || "").toLowerCase();
  if (v.includes("active")) return "default";
  return "secondary";
}

function VehiclesTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={`sk-${i}`}>
          <TableCell className="font-medium">
            <Skeleton className="h-4 w-[120px]" />
          </TableCell>

          <TableCell>
            <Skeleton className="h-4 w-[180px]" />
          </TableCell>

          <TableCell>
            <Skeleton className="h-4 w-[140px]" />
          </TableCell>

          <TableCell>
            <Skeleton className="h-6 w-[90px] rounded-full" />
          </TableCell>

          <TableCell>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-[130px] rounded-md" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function VehiclesCardsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={`csk-${i}`}
          className="rounded-lg border bg-background p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[140px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
            <Skeleton className="h-6 w-[90px] rounded-full" />
          </div>

          <div className="mt-3 grid gap-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Skeleton className="h-3 w-[80px]" />
                <Skeleton className="h-4 w-[140px]" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-[70px]" />
                <Skeleton className="h-4 w-[120px]" />
              </div>
            </div>

            <Skeleton className="mt-2 h-9 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

function VehicleCard({
  row,
  onViewHistory,
}: {
  row: VehicleRow;
  onViewHistory: (row: VehicleRow) => void;
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{row.plateNo}</div>
          <div className="truncate text-sm text-muted-foreground">
            {row.vehicleName || "—"}
          </div>
        </div>

        <Badge variant={statusVariant(row.status)} className="shrink-0 px-3">
          {row.status || "Inactive"}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Driver</div>
          <div className="truncate text-sm">{row.driverName || "N/A"}</div>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Type</div>
          <div className="truncate text-sm">{row.vehicleName || "N/A"}</div>
        </div>
      </div>

      <div className="mt-3">
        <Button
          type="button"
          className="w-full gap-2"
          onClick={() => onViewHistory(row)}
        >
          <Eye className="h-4 w-4" />
          View History
        </Button>
      </div>
    </div>
  );
}

export function VehiclesTable({
  rows,
  loading,
  onViewHistory,
}: {
  rows: VehicleRow[];
  loading?: boolean;
  onViewHistory: (row: VehicleRow) => void;
}) {
  return (
    <div className="rounded-lg border bg-background">
      {/* ✅ Mobile (true responsive): Card list */}
      <div className="p-3 md:hidden">
        {loading ? (
          <VehiclesCardsSkeleton rows={6} />
        ) : rows.length === 0 ? (
          <div className="rounded-lg border bg-background p-6 text-center text-sm text-muted-foreground">
            No vehicles found.
          </div>
        ) : (
          <div className="grid gap-3">
            {rows.map((r) => (
              <VehicleCard key={r.id} row={r} onViewHistory={onViewHistory} />
            ))}
          </div>
        )}
      </div>

      {/* ✅ Desktop: Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">PLATE NO.</TableHead>
              <TableHead>VEHICLE NAME</TableHead>
              <TableHead>DRIVER</TableHead>
              <TableHead className="w-[160px]">STATUS</TableHead>
              <TableHead className="w-[220px]">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <VehiclesTableSkeleton rows={7} />
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No vehicles found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.plateNo}</TableCell>
                  <TableCell>{r.vehicleName}</TableCell>
                  <TableCell>{r.driverName}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)} className="px-3">
                      {r.status || "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      className="gap-2"
                      onClick={() => onViewHistory(r)}
                    >
                      <Eye className="h-4 w-4" />
                      View History
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
