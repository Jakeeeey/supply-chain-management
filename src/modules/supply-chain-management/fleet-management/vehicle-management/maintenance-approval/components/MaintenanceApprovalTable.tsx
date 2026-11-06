"use client";

import * as React from "react";
import type { VehicleJobOrder } from "../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Eye, ClipboardCheck } from "lucide-react";

interface MaintenanceApprovalTableProps {
  jobOrders: VehicleJobOrder[];
  loading: boolean;
  onViewDetails: (jo: VehicleJobOrder) => void;
  onOpenApprove: (jo: VehicleJobOrder) => void;
  currentPage?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function MaintenanceApprovalTable({
  jobOrders,
  loading,
  onViewDetails,
  onOpenApprove,
  currentPage = 1,
  pageSize = 10,
  totalCount = 0,
  onPageChange,
  onPageSizeChange,
}: MaintenanceApprovalTableProps) {
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "Urgent":
        return <Badge variant="destructive" className="text-xs">{priority}</Badge>;
      case "High":
        return <Badge className="bg-amber-500 text-white hover:bg-amber-600 text-xs">{priority}</Badge>;
      case "Normal":
        return <Badge variant="secondary" className="text-xs">{priority}</Badge>;
      case "Low":
        return <Badge variant="outline" className="text-xs">{priority}</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{priority}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[140px]">JO Number</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>JO Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Issue / Description</TableHead>
              <TableHead>Parts Requested</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                  Loading pending job order requests...
                </TableCell>
              </TableRow>
            ) : jobOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                  No pending maintenance requests for approval.
                </TableCell>
              </TableRow>
            ) : (
              jobOrders.map((jo) => {
                const vehicle = typeof jo.vehicle_id === "object" && jo.vehicle_id !== null ? jo.vehicle_id : null;
                const vehiclePlate = vehicle?.vehicle_plate || vehicle?.plate_number || vehicle?.name || `Vehicle #${typeof jo.vehicle_id === "object" && jo.vehicle_id !== null ? (jo.vehicle_id.vehicle_id || jo.vehicle_id.id) : jo.vehicle_id}`;
                const vehicleModel = vehicle ? [vehicle.make, vehicle.model].filter(Boolean).join(" ") : "";
                const partsCount = jo.parts?.length || 0;

                // Localized timestamp conversion (UTC+8)
                const formattedDate = jo.requested_at
                  ? new Date(jo.requested_at).toLocaleDateString("en-PH", {
                      timeZone: "Asia/Manila",
                      month: "numeric",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "";

                return (
                  <TableRow key={jo.id}>
                    {/* JO Number */}
                    <TableCell className="font-semibold text-primary">
                      {jo.jo_no}
                      <div className="text-xs text-muted-foreground font-normal">
                        {formattedDate}
                      </div>
                    </TableCell>

                    {/* Vehicle */}
                    <TableCell>
                      <div className="font-medium text-foreground">{vehiclePlate}</div>
                      {vehicleModel && <div className="text-xs text-muted-foreground">{vehicleModel}</div>}
                    </TableCell>

                    {/* JO Type */}
                    <TableCell>
                      <span className="text-sm font-medium">{jo.jo_type}</span>
                    </TableCell>

                    {/* Priority */}
                    <TableCell>{getPriorityBadge(jo.priority)}</TableCell>

                    {/* Description */}
                    <TableCell className="max-w-xs">
                      <p className="text-xs text-muted-foreground truncate" title={jo.description}>
                        {jo.description}
                      </p>
                    </TableCell>

                    {/* Parts Requested */}
                    <TableCell>
                      <span className="text-xs font-medium text-foreground">{partsCount} item(s)</span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => onViewDetails(jo)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Details
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={() => onOpenApprove(jo)}
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          Review Request
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {onPageChange && onPageSizeChange && totalCount > 0 && (
        <DataTablePagination
          pageIndex={currentPage}
          pageSize={pageSize}
          rowCount={totalCount}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}
