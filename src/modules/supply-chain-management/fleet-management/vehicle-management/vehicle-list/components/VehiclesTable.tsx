//src/modules/vehicle-management/vehicle-list/components/Sample.tsx
"use client";

import * as React from "react";
import { Eye } from "lucide-react";

import type { VehicleRow } from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/types";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function statusVariant(s: string) {
  const v = String(s || "").toLowerCase();
  if (v.includes("active")) return "default";
  return "secondary";
}

function VehiclesTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={`sk-${i}`} className="odd:bg-muted/40">
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
          className="rounded-lg border bg-background p-4 dark:border-white/60"
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
    <div className="rounded-lg border bg-background p-4 dark:border-white/60">
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
          <div className="truncate text-sm">{row.vehicleTypeName || "N/A"}</div>
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
  currentPage,
  totalPages,
  pageSize = 10,
  totalCount = 0,
  onPageChange,
  onPageSizeChange,
  onViewHistory,
}: {
  rows: VehicleRow[];
  loading?: boolean;
  currentPage: number;
  totalPages: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onViewHistory: (row: VehicleRow) => void;
}) {
  const safeTotalPages = Math.max(1, totalPages);
  return (
    <div className="rounded-lg border bg-background dark:border-white/60">
      {/* ✅ Mobile (true responsive): Card list */}
      <div className="p-3 md:hidden">
        {loading ? (
          <VehiclesCardsSkeleton rows={6} />
        ) : rows.length === 0 ? (
          <div className="rounded-lg border bg-background p-6 text-center text-sm text-muted-foreground dark:border-white/60">
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
                <TableRow key={r.id} className="group hover:bg-muted/60 odd:bg-muted/30 transition-colors">
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

      {/* ✅ Pagination Controls with Rows per Page Binding */}
      {!loading && (
        <div className="border-t p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
            <span>
              {totalCount > 0 ? (
                <>
                  Showing{" "}
                  <strong className="text-foreground">
                    {Math.min((currentPage - 1) * pageSize + 1, totalCount)}
                  </strong>{" "}
                  to{" "}
                  <strong className="text-foreground">
                    {Math.min(currentPage * pageSize, totalCount)}
                  </strong>{" "}
                  of <strong className="text-foreground">{totalCount}</strong> vehicles
                </>
              ) : (
                "0 vehicles"
              )}
            </span>

            {onPageSizeChange && (
              <div className="flex items-center gap-1.5 pl-2 border-l">
                <span className="text-xs">Rows per page:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => onPageSizeChange(Number(val))}
                >
                  <SelectTrigger className="h-7 w-[68px] text-xs">
                    <SelectValue placeholder={String(pageSize)} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 25, 50, 100].map((sz) => (
                      <SelectItem key={sz} value={String(sz)} className="text-xs">
                        {sz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {safeTotalPages > 1 && (
            <Pagination className="mx-0 w-auto justify-end">
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

                {Array.from({ length: safeTotalPages }).map((_, i) => {
                  const page = i + 1;
                  if (
                    page === 1 ||
                    page === safeTotalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            onPageChange(page);
                          }}
                          isActive={page === currentPage}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <PaginationItem key={page}>
                        <span className="px-2 text-muted-foreground">...</span>
                      </PaginationItem>
                    );
                  }
                  return null;
                })}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < safeTotalPages) onPageChange(currentPage + 1);
                    }}
                    className={currentPage >= safeTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </div>
  );
}
