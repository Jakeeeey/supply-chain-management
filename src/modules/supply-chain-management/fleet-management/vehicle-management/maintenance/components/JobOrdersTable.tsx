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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  MoreHorizontal,
  Eye,
  Pencil,
  Truck,
  UserCheck,
  Building2,
} from "lucide-react";

interface JobOrdersTableProps {
  jobOrders: VehicleJobOrder[];
  loading: boolean;
  onViewDetails: (jo: VehicleJobOrder) => void;
  onEditRequest?: (jo: VehicleJobOrder) => void;
  onOpenApprove?: (jo: VehicleJobOrder) => void;
  onOpenIssueParts?: (jo: VehicleJobOrder) => void;
  onStartMaintenance?: (jo: VehicleJobOrder) => void;
  onOpenComplete?: (jo: VehicleJobOrder) => void;
  // Pagination props
  currentPage?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function JobOrdersTable({
  jobOrders,
  loading,
  onViewDetails,
  onEditRequest,
  currentPage = 1,
  pageSize = 10,
  totalCount = 0,
  onPageChange,
  onPageSizeChange,
}: JobOrdersTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "requested":
        return <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50">Requested</Badge>;
      case "approved":
        return <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50">Approved</Badge>;
      case "in progress":
        return <Badge variant="outline" className="border-purple-500 text-purple-600 bg-purple-50">In Progress</Badge>;
      case "completed":
        return <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50">Completed</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status || "Unknown"}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return <Badge variant="destructive" className="font-semibold">Urgent</Badge>;
      case "high":
        return <Badge variant="outline" className="border-orange-500 text-orange-600">High</Badge>;
      case "normal":
        return <Badge variant="outline" className="border-slate-300 text-slate-700">Normal</Badge>;
      case "low":
        return <Badge variant="secondary" className="text-muted-foreground">Low</Badge>;
      default:
        return <Badge variant="outline">{priority || "Normal"}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="border rounded-md p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm">Loading Job Orders...</p>
      </div>
    );
  }

  if (jobOrders.length === 0) {
    return (
      <div className="border border-dashed rounded-md p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
        <Truck className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">No job orders found</p>
        <p className="text-xs text-muted-foreground">Try adjusting your filters or search query.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-md overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[140px]">JO Number</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mechanic</TableHead>
              <TableHead>Parts</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobOrders.map((jo) => {
              const vehicle = typeof jo.vehicle_id === "object" && jo.vehicle_id !== null ? jo.vehicle_id : null;
              const vehiclePlate = vehicle?.vehicle_plate || vehicle?.plate_number || vehicle?.name || `Vehicle #${typeof jo.vehicle_id === "object" && jo.vehicle_id !== null ? (jo.vehicle_id.vehicle_id || jo.vehicle_id.id) : jo.vehicle_id}`;
              const vehicleModel = vehicle ? [vehicle.make, vehicle.model].filter(Boolean).join(" ") : "";
              const branch = typeof jo.branch_id === "object" && jo.branch_id !== null ? jo.branch_id : null;
              const branchLabel = branch?.branch_name || (jo.branch_id ? `Branch #${typeof jo.branch_id === "object" ? jo.branch_id.id : jo.branch_id}` : "N/A");
              const mechanic = typeof jo.mechanic_id === "object" && jo.mechanic_id !== null ? jo.mechanic_id : null;

              const partsCount = jo.parts?.length || 0;
              const issuedCount = jo.parts?.reduce((acc, p) => acc + (p.quantity_issued || 0), 0) || 0;

              const isRequested = jo.status?.toLowerCase() === "requested";

              const formattedRequestedDate = jo.requested_at
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
                    {formattedRequestedDate && (
                      <div className="text-[11px] text-muted-foreground font-normal">
                        {formattedRequestedDate}
                      </div>
                    )}
                  </TableCell>

                  {/* Vehicle */}
                  <TableCell>
                    <div className="font-medium text-foreground">{vehiclePlate}</div>
                    {vehicleModel && <div className="text-xs text-muted-foreground">{vehicleModel}</div>}
                  </TableCell>

                  {/* Branch */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-foreground">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[120px]" title={branchLabel}>{branchLabel}</span>
                    </div>
                  </TableCell>

                  {/* JO Type */}
                  <TableCell>
                    <span className="text-sm font-medium">{jo.jo_type}</span>
                  </TableCell>

                  {/* Priority */}
                  <TableCell>{getPriorityBadge(jo.priority)}</TableCell>

                  {/* Status */}
                  <TableCell>{getStatusBadge(jo.status)}</TableCell>

                  {/* Assigned Mechanic */}
                  <TableCell>
                    {(() => {
                      if (!mechanic) {
                        return jo.mechanic_id ? (
                          <span className="text-xs text-foreground font-medium">
                            Mechanic #{String(typeof jo.mechanic_id === "object" ? (jo.mechanic_id.id || jo.mechanic_id.user_id) : jo.mechanic_id)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Unassigned</span>
                        );
                      }
                      const f = mechanic.first_name || mechanic.user_fname || "";
                      const l = mechanic.last_name || mechanic.user_lname || "";
                      const full = [f, l].filter(Boolean).join(" ");
                      return (
                        <div className="flex items-center gap-1.5 text-xs text-foreground">
                          <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{full || `Mechanic #${mechanic.id || mechanic.user_id}`}</span>
                        </div>
                      );
                    })()}
                  </TableCell>

                  {/* Parts Status */}
                  <TableCell>
                    <div className="text-xs">
                      <span className="font-medium text-foreground">{partsCount} item(s)</span>
                      {partsCount > 0 && (
                        <span className="text-muted-foreground ml-1">
                          ({issuedCount} issued)
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Actions Dropdown */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onViewDetails(jo)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>

                        {/* Edit option available only when status is Requested */}
                        {isRequested && onEditRequest && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onEditRequest(jo)}>
                              <Pencil className="h-4 w-4 mr-2 text-amber-600" />
                              <span>Edit Request</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
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
