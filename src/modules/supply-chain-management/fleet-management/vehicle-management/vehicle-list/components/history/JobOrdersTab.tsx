// src/modules/vehicle-management/vehicle-list/components/history/JobOrdersTab.tsx
"use client";

import * as React from "react";
import type {
  VehicleRow,
  VehicleJobOrderApiRow,
} from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/types";
import { listVehicleJobOrders } from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/providers/fetchProviders";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wrench, Calendar, Gauge, User } from "lucide-react";
import { toast } from "sonner";

function joStatusVariant(status: string) {
  const s = String(status || "").toLowerCase();
  if (s.includes("completed")) return "default";
  if (s.includes("progress")) return "secondary";
  if (s.includes("approved")) return "outline";
  if (s.includes("rejected") || s.includes("cancelled")) return "destructive";
  return "secondary";
}

function priorityVariant(p: string) {
  const s = String(p || "").toLowerCase();
  if (s.includes("urgent")) return "destructive";
  if (s.includes("high")) return "default";
  return "outline";
}

function JobOrdersSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={`josk-${i}`} className="dark:border-white/60">
          <CardContent className="p-5">
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-44" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function JobOrdersTab({ vehicle }: { vehicle: VehicleRow }) {
  const vehicleId = Number(vehicle?.id ?? 0);

  const [loading, setLoading] = React.useState(true);
  const [jobOrders, setJobOrders] = React.useState<VehicleJobOrderApiRow[]>([]);

  const loadData = React.useCallback(async () => {
    if (!vehicleId) return;
    setLoading(true);
    try {
      const data = await listVehicleJobOrders(vehicleId);
      // Sort newest first
      const sorted = [...(data || [])].sort((a, b) => {
        const da = a.created_at ? Date.parse(a.created_at) : 0;
        const db = b.created_at ? Date.parse(b.created_at) : 0;
        return db - da;
      });
      setJobOrders(sorted);
    } catch (e) {
      toast.error("Failed to load job orders", {
        description: String(e instanceof Error ? e.message : e),
      });
      setJobOrders([]);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <JobOrdersSkeleton rows={2} />;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Job Order & Maintenance History</div>
            <div className="text-xs text-muted-foreground">
              Repair logs, preventive maintenance schedules, and inspection reports.
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadData}
            className="h-8 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* JO List */}
      {jobOrders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Wrench className="h-10 w-10 text-muted-foreground/60 mx-auto mb-2" />
            <div className="text-sm font-semibold">No job orders recorded yet</div>
            <div className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Preventive maintenance, repair, and inspection job orders for this vehicle will appear here.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {jobOrders.map((jo) => {
            const reqDate = jo.requested_at
              ? jo.requested_at.slice(0, 10)
              : jo.created_at
              ? jo.created_at.slice(0, 10)
              : "N/A";
            const completedDate = jo.completed_at ? jo.completed_at.slice(0, 10) : null;
            const mechanicName =
              typeof jo.mechanic_id === "object" && jo.mechanic_id !== null
                ? `${jo.mechanic_id.user_fname || ""} ${jo.mechanic_id.user_lname || ""}`.trim()
                : jo.mechanic_id
                ? `Mechanic #${jo.mechanic_id}`
                : "Unassigned";

            return (
              <Card key={jo.id} className="hover:border-primary/40 transition">
                <CardContent className="p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm">{jo.jo_no}</div>
                      <Badge variant="outline" className="text-xs">{jo.jo_type}</Badge>
                      <Badge variant={priorityVariant(jo.priority)} className="text-[11px] px-2 py-0">
                        {jo.priority}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={joStatusVariant(jo.status)} className="px-3">
                        {jo.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-sm text-foreground">
                    {jo.description || "No description provided."}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Requested: <strong className="text-foreground">{reqDate}</strong></span>
                    </div>

                    {jo.odometer_reading !== null && jo.odometer_reading !== undefined && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Gauge className="h-3.5 w-3.5" />
                        <span>Odometer: <strong className="text-foreground">{jo.odometer_reading} km</strong></span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span>Mechanic: <strong className="text-foreground">{mechanicName}</strong></span>
                    </div>
                  </div>

                  {(completedDate || jo.completion_remarks || jo.labor_cost) && (
                    <div className="rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground space-y-1">
                      {completedDate && (
                        <div>Completed: <strong className="text-foreground">{completedDate}</strong></div>
                      )}
                      {jo.labor_cost && (
                        <div>Labor Cost: <strong className="text-foreground">₱{Number(jo.labor_cost).toLocaleString()}</strong></div>
                      )}
                      {jo.completion_remarks && (
                        <div>Remarks: {jo.completion_remarks}</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
