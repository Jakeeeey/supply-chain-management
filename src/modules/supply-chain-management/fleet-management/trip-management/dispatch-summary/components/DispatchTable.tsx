"use client";

import * as React from "react";
import type { DateFilter, DispatchPlan } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Filter, Printer, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateTime } from "../utils/date";
import { badgeClassesByCategory, getStatusCategory } from "../utils/status";

function TableSkeletonRows({ rows = 10 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, idx) => (
        <TableRow key={idx}>
          <TableCell className="py-4">
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-44" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="ml-auto h-6 w-28 rounded-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function FooterSkeleton() {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <Skeleton className="h-4 w-72" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
    </div>
  );
}

export default function DispatchTable(props: {
  loading: boolean;
  rows: DispatchPlan[];
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  dateFilter: DateFilter;
  setDateFilter: (v: DateFilter) => void;
  customStartDate: string;
  setCustomStartDate: (v: string) => void;
  customEndDate: string;
  setCustomEndDate: (v: string) => void;

  onOpenPrint: () => void;

  // pagination
  currentPage: number;
  setCurrentPage: (v: number) => void;
  totalPages: number;
  indexOfFirstItem: number;
  indexOfLastItem: number;
  totalCount: number;
}) {
  const canPrev = props.currentPage > 1;
  const canNext = props.currentPage < props.totalPages;

  return (
    <Card className="shadow-sm dark:border-white/60">
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <span>📑</span> Active Dispatch Plans
        </CardTitle>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="outline" onClick={props.onOpenPrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print PDF
          </Button>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={props.statusFilter} onValueChange={props.setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Statuses">All Statuses</SelectItem>
                <SelectItem value="For Dispatch">For Dispatch</SelectItem>
                <SelectItem value="For Inbound">For Inbound</SelectItem>
                <SelectItem value="For Clearance">For Clearance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={props.dateFilter} onValueChange={(v) => props.setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Time">All Time</SelectItem>
                <SelectItem value="This Week">This Week</SelectItem>
                <SelectItem value="This Month">This Month</SelectItem>
                <SelectItem value="This Year">This Year</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {props.dateFilter === "Custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="h-10 rounded-md border px-3 text-sm"
                value={props.customStartDate}
                onChange={(e) => props.setCustomStartDate(e.target.value)}
              />
              <span className="text-muted-foreground">-</span>
              <input
                type="date"
                className="h-10 rounded-md border px-3 text-sm"
                value={props.customEndDate}
                onChange={(e) => props.setCustomEndDate(e.target.value)}
              />
            </div>
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[140px]">DP #</TableHead>
                <TableHead>DRIVER</TableHead>
                <TableHead>SALESMAN</TableHead>
                <TableHead>VEHICLE</TableHead>
                <TableHead>DISPATCH FROM</TableHead>
                <TableHead>DISPATCH TO</TableHead>
                <TableHead className="text-right">STATUS</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {props.loading ? (
                <TableSkeletonRows rows={10} />
              ) : props.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No active dispatch plans found matching filters.
                  </TableCell>
                </TableRow>
              ) : (
                props.rows.map((plan) => {
                  const cat = getStatusCategory(plan.status);
                  return (
                    <TableRow key={plan.id} className="hover:bg-muted/20">
                      <TableCell className="font-semibold">{plan.dpNumber}</TableCell>
                      <TableCell>{plan.driverName}</TableCell>
                      <TableCell className="font-semibold text-blue-600">{plan.salesmanName}</TableCell>
                      <TableCell>{plan.vehiclePlateNo}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(plan.timeOfDispatch)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(plan.timeOfArrival)}</TableCell>
                      <TableCell className="text-right">
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badgeClassesByCategory(cat)}`}>
                          {cat}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {props.loading ? (
          <FooterSkeleton />
        ) : props.totalCount > 0 ? (
          <div className="flex items-center justify-between px-6 py-4">
            <div className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">{props.indexOfFirstItem + 1}</span> to{" "}
              <span className="font-medium text-foreground">{Math.min(props.indexOfLastItem, props.totalCount)}</span>{" "}
              of <span className="font-medium text-foreground">{props.totalCount}</span> results
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={!canPrev}
                onClick={() => props.setCurrentPage(props.currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(3, props.totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(props.currentPage, props.totalPages - 2));
                  const pNum = start + i;

                  return (
                    <Button
                      key={pNum}
                      variant={props.currentPage === pNum ? "default" : "outline"}
                      className="h-9 w-9 rounded-xl p-0"
                      onClick={() => props.setCurrentPage(pNum)}
                    >
                      {pNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="icon"
                disabled={!canNext}
                onClick={() => props.setCurrentPage(props.currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
