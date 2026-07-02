"use client";

import * as React from "react";
import type { VehicleRow } from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/types";
import { fetchMovements } from "@/modules/supply-chain-management/fleet-management/parts-inventory/providers/partsInventoryApi";
import type { PartMovementRow } from "@/modules/supply-chain-management/fleet-management/parts-inventory/types";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

function PartsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={`psk-${i}`}>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PartsTab({ vehicle }: { vehicle: VehicleRow }) {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<PartMovementRow[]>([]);

  function formatDate(value: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  React.useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const response = await fetchMovements({
          vehicleId: String(vehicle.id),
          partId: "",
          branchId: "",
          movementType: "all",
          search: "",
          dateFrom: "",
          dateTo: "",
          page: 1,
          limit: 25,
        });
        if (alive) setRows(response.data);
      } catch (error) {
        if (alive) {
          setRows([]);
          toast.error("Failed to load vehicle parts history", {
            description: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [vehicle?.id]);

  if (loading) return <PartsSkeleton rows={3} />;

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Part</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No parts records found for this vehicle.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDate(row.movementAt)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{row.partCode || "-"}</div>
                    <div className="text-xs text-muted-foreground">{row.partName || ""}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.movementType}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{row.quantity}</TableCell>
                  <TableCell>{row.branchName || "-"}</TableCell>
                  <TableCell>{row.referenceNo || row.reservationNo || "-"}</TableCell>
                  <TableCell className="max-w-[240px] truncate">{row.remarks || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
