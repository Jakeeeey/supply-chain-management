// src/modules/vehicle-management/vehicle-list/components/history/PartsTab.tsx
"use client";

import * as React from "react";
import type {
  VehicleRow,
  VehicleInstalledPartApiRow,
  VehiclePartApiRow,
} from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/types";
import {
  listVehicleInstalledParts,
  listVehicleParts,
  installVehiclePart,
} from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/providers/fetchProviders";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, RefreshCw, Package, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

function PartsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={`psk-${i}`}>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PartsTab({ vehicle }: { vehicle: VehicleRow }) {
  const vehicleId = Number(vehicle?.id ?? 0);

  const [loading, setLoading] = React.useState(true);
  const [partsCatalogue, setPartsCatalogue] = React.useState<VehiclePartApiRow[]>([]);
  const [installedParts, setInstalledParts] = React.useState<VehicleInstalledPartApiRow[]>([]);

  // Add / Link part form
  const [showAssignForm, setShowAssignForm] = React.useState(false);
  const [selectedPartId, setSelectedPartId] = React.useState<string>("");
  const [quantity, setQuantity] = React.useState("1");
  const [serialNo, setSerialNo] = React.useState("");
  const [remarks, setRemarks] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (!vehicleId) return;
    setLoading(true);
    try {
      const [installed, catalogue] = await Promise.all([
        listVehicleInstalledParts(vehicleId).catch(() => []),
        listVehicleParts().catch(() => []),
      ]);
      setInstalledParts(installed || []);
      setPartsCatalogue(catalogue || []);
    } catch (e) {
      toast.error("Failed to load parts", {
        description: String(e instanceof Error ? e.message : e),
      });
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAssignPart(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPartId || !vehicleId) {
      toast.error("Please select a part from catalogue");
      return;
    }

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setSubmitting(true);
    try {
      await installVehiclePart({
        vehicle_id: vehicleId,
        part_id: Number(selectedPartId),
        quantity: qty,
        serial_no: serialNo.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });

      toast.success("Part linked successfully", {
        description: "The part has been assigned to this vehicle.",
      });

      setShowAssignForm(false);
      setSelectedPartId("");
      setQuantity("1");
      setSerialNo("");
      setRemarks("");
      loadData();
    } catch (e) {
      toast.error("Failed to link part", {
        description: String(e instanceof Error ? e.message : e),
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PartsSkeleton rows={3} />;

  return (
    <div className="space-y-4">
      {/* Header card with action */}
      <Card>
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Installed Parts & Assets</div>
            <div className="text-xs text-muted-foreground">
              Components, equipment, and tracking assets assigned to this vehicle.
            </div>
          </div>

          <div className="flex gap-2">
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
            <Button
              type="button"
              size="sm"
              onClick={() => setShowAssignForm((v) => !v)}
              className="h-8 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              {showAssignForm ? "Cancel" : "Link Part / Asset"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Link Part / Asset Form */}
      {showAssignForm && (
        <Card className="border-primary/40 bg-muted/20">
          <CardContent className="p-5">
            <form onSubmit={handleAssignPart} className="space-y-4">
              <div className="text-sm font-semibold">Link Part / Asset to Vehicle</div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                <div className="grid gap-1.5 md:col-span-2">
                  <Label className="text-xs">
                    Select Part <span className="text-destructive">*</span>
                  </Label>
                  <Select value={selectedPartId} onValueChange={setSelectedPartId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Choose part from catalogue" />
                    </SelectTrigger>
                    <SelectContent>
                      {partsCatalogue.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No active parts available
                        </SelectItem>
                      ) : (
                        partsCatalogue.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.part_code} - {p.part_name} {p.category ? `(${p.category})` : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs">
                    Quantity <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    className="h-9 text-xs"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs">Serial / Asset No.</Label>
                  <Input
                    className="h-9 text-xs"
                    value={serialNo}
                    onChange={(e) => setSerialNo(e.target.value)}
                    placeholder="e.g. SN-8829103"
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs">Remarks / Installation Notes</Label>
                <Input
                  className="h-9 text-xs"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Installed during routine inspection"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssignForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting} className="gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  {submitting ? "Linking..." : "Confirm & Link Part"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Installed Parts List */}
      {installedParts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-10 w-10 text-muted-foreground/60 mx-auto mb-2" />
            <div className="text-sm font-semibold">No parts or assets linked yet</div>
            <div className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              You can assign parts from the catalogue to keep track of serial numbers and replacement history.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {installedParts.map((item) => {
            const partObj =
              typeof item.part_id === "object" && item.part_id !== null
                ? (item.part_id as VehiclePartApiRow)
                : null;
            const partName = partObj?.part_name || `Part #${item.part_id}`;
            const partCode = partObj?.part_code || "";
            const category = partObj?.category || "General";
            const installedDate = item.installed_at
              ? item.installed_at.slice(0, 10)
              : item.created_at
              ? item.created_at.slice(0, 10)
              : "N/A";

            return (
              <Card key={item.id} className="hover:border-primary/40 transition">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                    <div>
                      <div className="text-xs text-muted-foreground">Part Details</div>
                      <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        {partName}
                      </div>
                      {partCode && (
                        <div className="text-xs text-muted-foreground font-mono">{partCode}</div>
                      )}
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">Category & Quantity</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[11px]">{category}</Badge>
                        <span className="text-sm font-medium">Qty: {item.quantity}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">Serial / Asset No.</div>
                      <div className="text-sm font-medium">
                        {item.serial_no || "N/A"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Installed: {installedDate}
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <div className="text-xs text-muted-foreground">Status</div>
                      <Badge
                        variant={item.removed_at ? "secondary" : "default"}
                        className="mt-0.5"
                      >
                        {item.removed_at ? "Removed" : "Fitted / Installed"}
                      </Badge>
                      {item.remarks && (
                        <div className="text-xs text-muted-foreground truncate mt-1">
                          {item.remarks}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
