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
import {
  MoreHorizontal,
  Eye,
  CheckCircle2,
  PackageCheck,
  Play,
  CheckCheck,
  Truck,
  UserCheck,
} from "lucide-react";

interface JobOrdersTableProps {
  jobOrders: VehicleJobOrder[];
  loading: boolean;
  onViewDetails: (jo: VehicleJobOrder) => void;
  onOpenApprove: (jo: VehicleJobOrder) => void;
  onOpenIssueParts: (jo: VehicleJobOrder) => void;
  onStartMaintenance: (jo: VehicleJobOrder) => void;
  onOpenComplete: (jo: VehicleJobOrder) => void;
}

export function JobOrdersTable({
  jobOrders,
  loading,
  onViewDetails,
  onOpenApprove,
  onOpenIssueParts,
  onStartMaintenance,
  onOpenComplete,
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
        <Truck className="h-10 w-10 text-muted-foreground/40 mb-1" />
        <p className="text-base font-medium">No Job Orders found</p>
        <p className="text-xs">Create a new Job Order request to begin maintenance.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">JO Number</TableHead>
            <TableHead>Vehicle</TableHead>
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
            const mechanic = typeof jo.mechanic_id === "object" && jo.mechanic_id !== null ? jo.mechanic_id : null;
            const partsCount = jo.parts?.length || 0;
            const issuedCount = jo.parts?.reduce((acc, p) => acc + (p.quantity_issued || 0), 0) || 0;

            return (
              <TableRow key={jo.id}>
                {/* JO Number */}
                <TableCell className="font-semibold text-primary">
                  {jo.jo_no}
                  <div className="text-xs text-muted-foreground font-normal">
                    {jo.requested_at ? new Date(jo.requested_at).toLocaleDateString() : ""}
                  </div>
                </TableCell>

                {/* Vehicle */}
                <TableCell>
                  <div className="font-medium text-foreground">
                    {vehicle?.vehicle_plate || vehicle?.plate_number || `Vehicle #${typeof jo.vehicle_id === "object" && jo.vehicle_id !== null ? (jo.vehicle_id.vehicle_id || jo.vehicle_id.id) : jo.vehicle_id}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {vehicle ? ([vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.name || "") : ""}
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

                {/* Mechanic */}
                <TableCell>
                  {mechanic ? (
                    <div className="flex items-center gap-1.5 text-xs text-foreground">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{mechanic.first_name || ""} {mechanic.last_name || ""}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Unassigned</span>
                  )}
                </TableCell>

                {/* Parts Summary */}
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

                      <DropdownMenuSeparator />

                      {/* Step: Approve / Assign Mechanic */}
                      {jo.status === "Requested" && (
                        <DropdownMenuItem onClick={() => onOpenApprove(jo)}>
                          <CheckCircle2 className="h-4 w-4 mr-2 text-blue-600" />
                          Approve / Assign
                        </DropdownMenuItem>
                      )}

                      {/* Step: Issue Parts */}
                      {(jo.status === "Approved" || jo.status === "In Progress") && (
                        <DropdownMenuItem onClick={() => onOpenIssueParts(jo)}>
                          <PackageCheck className="h-4 w-4 mr-2 text-amber-600" />
                          Issue Parts
                        </DropdownMenuItem>
                      )}

                      {/* Step: Start Maintenance */}
                      {jo.status === "Approved" && (
                        <DropdownMenuItem onClick={() => onStartMaintenance(jo)}>
                          <Play className="h-4 w-4 mr-2 text-purple-600" />
                          Start Maintenance
                        </DropdownMenuItem>
                      )}

                      {/* Step: Complete JO */}
                      {jo.status === "In Progress" && (
                        <DropdownMenuItem onClick={() => onOpenComplete(jo)}>
                          <CheckCheck className="h-4 w-4 mr-2 text-emerald-600" />
                          Complete JO
                        </DropdownMenuItem>
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
  );
}
