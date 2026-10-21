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
import { Eye, CheckCircle2 } from "lucide-react";

interface MaintenanceApprovalTableProps {
  jobOrders: VehicleJobOrder[];
  loading: boolean;
  onViewDetails: (jo: VehicleJobOrder) => void;
  onOpenApprove: (jo: VehicleJobOrder) => void;
}

export function MaintenanceApprovalTable({
  jobOrders,
  loading,
  onViewDetails,
  onOpenApprove,
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
                        className="h-8 text-xs gap-1 bg-primary text-primary-foreground"
                        onClick={() => onOpenApprove(jo)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve / Assign
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
  );
}
