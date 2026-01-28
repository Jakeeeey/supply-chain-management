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
  );
}
