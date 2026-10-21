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
import { Eye, PackageCheck, Play, UserCheck } from "lucide-react";

interface MaintenanceStartTableProps {
  jobOrders: VehicleJobOrder[];
  loading: boolean;
  onViewDetails: (jo: VehicleJobOrder) => void;
  onOpenIssueParts: (jo: VehicleJobOrder) => void;
  onStartMaintenance: (jo: VehicleJobOrder) => void;
}

export function MaintenanceStartTable({
  jobOrders,
  loading,
  onViewDetails,
  onOpenIssueParts,
  onStartMaintenance,
}: MaintenanceStartTableProps) {
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
            <TableHead>Assigned Mechanic</TableHead>
            <TableHead>Parts Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                Loading approved job orders...
              </TableCell>
            </TableRow>
          ) : jobOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                No approved job orders waiting to start.
              </TableCell>
            </TableRow>
          ) : (
            jobOrders.map((jo) => {
              const vehicle = typeof jo.vehicle_id === "object" && jo.vehicle_id !== null ? jo.vehicle_id : null;
              const vehiclePlate = vehicle?.vehicle_plate || vehicle?.plate_number || vehicle?.name || `Vehicle #${typeof jo.vehicle_id === "object" && jo.vehicle_id !== null ? (jo.vehicle_id.vehicle_id || jo.vehicle_id.id) : jo.vehicle_id}`;
              const vehicleModel = vehicle ? [vehicle.make, vehicle.model].filter(Boolean).join(" ") : "";
              const mechanic = typeof jo.mechanic_id === "object" && jo.mechanic_id !== null ? jo.mechanic_id : null;

              const partsCount = jo.parts?.length || 0;
              const issuedCount = jo.parts?.reduce((acc, p) => acc + (p.quantity_issued || 0), 0) || 0;

              return (
                <TableRow key={jo.id}>
                  {/* JO Number */}
                  <TableCell className="font-semibold text-primary">
                    {jo.jo_no}
                    <div className="text-xs text-muted-foreground font-normal">
                      Approved: {jo.approved_at ? new Date(jo.approved_at).toLocaleDateString() : ""}
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
                      const first = mechanic.first_name || mechanic.user_fname || "";
                      const last = mechanic.last_name || mechanic.user_lname || "";
                      const full = [first, last].filter(Boolean).join(" ");
                      const displayName = full || mechanic.email || mechanic.user_email || `Mechanic #${mechanic.id || mechanic.user_id}`;

                      return (
                        <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                          <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{displayName}</span>
                        </div>
                      );
                    })()}
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
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1 text-amber-700 hover:text-amber-800 border-amber-200 hover:bg-amber-50"
                        onClick={() => onOpenIssueParts(jo)}
                      >
                        <PackageCheck className="h-3.5 w-3.5 text-amber-600" />
                        Issue Parts
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => onStartMaintenance(jo)}
                      >
                        <Play className="h-3.5 w-3.5" />
                        Start Maintenance
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
