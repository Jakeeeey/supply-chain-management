"use client";

import * as React from "react";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type {
  DashboardCardType,
  DashboardVehicleItem,
  DashboardDriverItem,
  DashboardJobOrderItem,
  DashboardOutsideVehicleItem,
  DashboardLicenseItem,
} from "../types";

type DashboardRowItem =
  | DashboardVehicleItem
  | DashboardDriverItem
  | DashboardJobOrderItem
  | DashboardOutsideVehicleItem
  | DashboardLicenseItem;

interface FleetDashboardTableProps {
  activeCard: DashboardCardType;
  rows: DashboardRowItem[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function LicenseStatusBadge({ status, days }: { status: string; days: number | null }) {
  if (status === "Expired") {
    return (
      <Badge variant="destructive" className="gap-1.5 font-medium shadow-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
        Expired ({Math.abs(days ?? 0)}d ago)
      </Badge>
    );
  }
  if (status === "Expiring Soon") {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-amber-500/50 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-medium"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Expiring in {days}d
      </Badge>
    );
  }
  if (status === "Valid") {
    return (
      <Badge
        variant="default"
        className="gap-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white font-medium shadow-xs"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-200" />
        Valid {days !== null ? `(${days}d left)` : ""}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400 font-normal"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      {status}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = String(status || "").toLowerCase().trim();
  if (s === "inactive" || s.includes("inactive")) {
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 font-normal">
        {status}
      </Badge>
    );
  }
  if (s.includes("active") || s.includes("completed") || s.includes("approved")) {
    return (
      <Badge variant="default" className="bg-emerald-600/90 hover:bg-emerald-600 text-white font-normal">
        {status}
      </Badge>
    );
  }
  if (s.includes("in progress") || s.includes("on trip") || s.includes("for inbound") || s.includes("dispatched")) {
    return (
      <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-normal">
        {status}
      </Badge>
    );
  }
  if (s.includes("pending") || s.includes("requested") || s.includes("for dispatch")) {
    return (
      <Badge variant="outline" className="border-amber-500/50 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-normal">
        {status}
      </Badge>
    );
  }
  return <Badge variant="secondary">{status || "—"}</Badge>;
}

export function FleetDashboardTable({
  activeCard,
  rows,
  loading,
  currentPage,
  totalPages,
  onPageChange,
}: FleetDashboardTableProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            {activeCard === "vehicles" && (
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[180px]">Plate Number</TableHead>
                <TableHead>Vehicle Name / Model</TableHead>
                <TableHead>Fuel Type</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
              </TableRow>
            )}

            {activeCard === "drivers" && (
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[200px]">Driver Name</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Contact Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[140px]">License No.</TableHead>
              </TableRow>
            )}

            {activeCard === "jo_pendings" && (
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[140px]">JO Number</TableHead>
                <TableHead>Vehicle Plate</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Target Date</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
              </TableRow>
            )}

            {activeCard === "outside" && (
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[160px]">Trip Doc #</TableHead>
                <TableHead>Vehicle Plate</TableHead>
                <TableHead>Assigned Driver</TableHead>
                <TableHead>Dispatch Time</TableHead>
                <TableHead>Est. Arrival</TableHead>
                <TableHead className="w-[130px]">Trip Status</TableHead>
              </TableRow>
            )}

            {activeCard === "licenses" && (
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[190px]">Driver Name</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className="w-[140px]">License No.</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>Restrictions</TableHead>
                <TableHead className="w-[130px]">Expiry Date</TableHead>
                <TableHead className="w-[150px]">License Status</TableHead>
              </TableRow>
            )}
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                if (activeCard === "vehicles") {
                  const v = row as DashboardVehicleItem;
                  return (
                    <TableRow key={v.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-semibold text-foreground tracking-wide">
                        {v.plate_number}
                      </TableCell>
                      <TableCell>{v.name}</TableCell>
                      <TableCell className="text-muted-foreground">{v.fuel_type || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{v.capacity || "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={v.status} />
                      </TableCell>
                    </TableRow>
                  );
                }

                if (activeCard === "drivers") {
                  const d = row as DashboardDriverItem;
                  return (
                    <TableRow key={d.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-semibold text-foreground">
                        {d.name}
                      </TableCell>
                      <TableCell>{d.branch_name}</TableCell>
                      <TableCell className="text-muted-foreground">{d.contact || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{d.email || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{d.license_no}</TableCell>
                    </TableRow>
                  );
                }

                if (activeCard === "jo_pendings") {
                  const jo = row as DashboardJobOrderItem;
                  return (
                    <TableRow key={jo.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-semibold text-foreground">
                        {jo.jo_no}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{jo.vehicle_plate}</div>
                        {jo.vehicle_name && (
                          <div className="text-xs text-muted-foreground">{jo.vehicle_name}</div>
                        )}
                      </TableCell>
                      <TableCell>{jo.jo_type}</TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            jo.priority.toLowerCase() === "urgent" || jo.priority.toLowerCase() === "high"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {jo.priority}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {jo.target_start_date ? new Date(jo.target_start_date).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={jo.status} />
                      </TableCell>
                    </TableRow>
                  );
                }

                if (activeCard === "outside") {
                  const out = row as DashboardOutsideVehicleItem;
                  return (
                    <TableRow key={out.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-semibold text-foreground">
                        {out.doc_no}
                      </TableCell>
                      <TableCell className="font-medium tracking-wide">
                        {out.vehicle_plate}
                      </TableCell>
                      <TableCell>{out.driver_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {out.dispatch_time ? new Date(out.dispatch_time).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {out.estimated_arrival ? new Date(out.estimated_arrival).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={out.status} />
                      </TableCell>
                    </TableRow>
                  );
                }

                if (activeCard === "licenses") {
                  const lic = row as DashboardLicenseItem;
                  return (
                    <TableRow key={lic.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-semibold text-foreground">
                        <div>{lic.driver_name}</div>
                        {lic.contact && lic.contact !== "—" && (
                          <div className="text-[11px] text-muted-foreground">{lic.contact}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{lic.branch_name}</TableCell>
                      <TableCell className="font-mono text-xs font-medium">
                        {lic.license_no}
                      </TableCell>
                      <TableCell>{lic.license_classification}</TableCell>
                      <TableCell className="text-muted-foreground">{lic.license_restrictions || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {lic.license_expiry_date ? new Date(lic.license_expiry_date).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <LicenseStatusBadge status={lic.status} days={lic.days_remaining} />
                      </TableCell>
                    </TableRow>
                  );
                }

                return null;
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-end pt-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) onPageChange(currentPage - 1);
                  }}
                  className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    isActive={currentPage === p}
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(p);
                    }}
                    className="cursor-pointer"
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages) onPageChange(currentPage + 1);
                  }}
                  className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
