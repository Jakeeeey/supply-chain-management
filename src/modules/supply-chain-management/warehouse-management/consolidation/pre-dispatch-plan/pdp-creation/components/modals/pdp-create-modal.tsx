"use client";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { formatNumber, formatPeso } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/utils/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  DispatchPlan,
  DispatchPlanDetail,
  DispatchPlanFormValues,
  DispatchPlanMasterData,
  SalesOrderOption,
} from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import {
  AlertTriangle,
  MapPin,
  Package,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface PDPCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: DispatchPlanFormValues) => Promise<void>;
  masterData: DispatchPlanMasterData | null;
  availableOrders: SalesOrderOption[];
  isLoadingOrders: boolean;
  onFilterChange: (clusterId?: number, branchId?: number) => void;
  /** When provided, modal opens in edit mode with pre-filled data */
  editPlan?: DispatchPlan | null;
  editDetails?: DispatchPlanDetail[];
}

/**
 * Full-screen creation modal for Pre Dispatch Plans.
 * Features Trip Configuration form, Available Deliveries panel,
 * Detailed Trip Manifest table, and Vehicle Capacity progress bar.
 */
export function PDPCreateModal({
  open,
  onClose,
  onSubmit,
  masterData,
  availableOrders,
  isLoadingOrders,
  onFilterChange,
  editPlan,
  editDetails,
}: PDPCreateModalProps) {
  const isEditMode = !!editPlan;
  // ─── Form State ───────────────────────────────────
  const [driverId, setDriverId] = useState<number | null>(null);
  const [clusterId, setClusterId] = useState<number | null>(null);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [dispatchDate, setDispatchDate] = useState<string>(
    new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0],
  );
  const [remarks, setRemarks] = useState("");
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // ─── Manifest State (selected orders) ─────────────
  const [manifestOrders, setManifestOrders] = useState<SalesOrderOption[]>([]);

  // Reset or pre-fill state when modal opens
  useEffect(() => {
    if (open) {
      if (editPlan) {
        // Edit mode: pre-fill from existing plan
        // Directus may return relational IDs as objects (e.g. {vehicle_id: 5})
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toId = (val: any): number | null => {
          if (val == null) return null;
          if (typeof val === "number") return val;
          if (typeof val === "object")
            return (
              Number(
                val.id ||
                  val.vehicle_id ||
                  val.user_id ||
                  val.cluster_id ||
                  val.branch_id,
              ) || null
            );
          return Number(val) || null;
        };

        const cId = toId(editPlan.cluster_id);
        const bId = toId(editPlan.branch_id);

        setDriverId(toId(editPlan.driver_id));
        setClusterId(cId);
        setBranchId(bId);
        setVehicleId(toId(editPlan.vehicle_id));
        setDispatchDate(
          editPlan.dispatch_date
            ? editPlan.dispatch_date.split("T")[0]
            : new Date().toISOString().split("T")[0],
        );
        setRemarks(editPlan.remarks || "");
        setOrderSearch("");

        // Pre-fill manifest from details
        if (editDetails?.length) {
          const manifestFromDetails: SalesOrderOption[] = editDetails.map(
            (d) => ({
              order_id: d.sales_order_id,
              order_no: d.order_no || "",
              customer_code: "",
              customer_name: d.customer_name,
              city: d.city,
              province: d.province,
              total_amount: d.amount ?? null,
              net_amount: d.amount ?? null,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              po_no: (d as any).po_no || null,
              total_weight: d.weight,
            }),
          );
          setManifestOrders(manifestFromDetails);
        } else {
          setManifestOrders([]);
        }

        // Fetch available orders for the cluster and branch
        if (cId) {
          onFilterChange(cId, bId || undefined);
        }
      } else {
        // Create mode: reset everything
        setDriverId(null);
        setClusterId(null);
        setBranchId(null);
        setDispatchDate(
          new Date(
            new Date().getTime() - new Date().getTimezoneOffset() * 60000,
          )
            .toISOString()
            .split("T")[0],
        );
        setRemarks("");
        setVehicleId(null);
        setOrderSearch("");
        setManifestOrders([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editPlan]);

  // ─── Vehicle / Capacity ───────────────────────────
  // Find the selected vehicle from master data
  const selectedVehicle = useMemo(() => {
    if (!vehicleId || !masterData?.vehicles?.length) return undefined;
    return masterData.vehicles.find((v) => v.vehicle_id === vehicleId);
  }, [vehicleId, masterData]);

  const vehicleCapacity = useMemo(() => {
    if (!selectedVehicle) return 0;
    const cap = selectedVehicle.maximum_weight ?? selectedVehicle.minimum_load;
    if (!cap) return 0;
    return typeof cap === "number" ? cap : parseFloat(cap) || 0;
  }, [selectedVehicle]);

  // ─── Computed Values ──────────────────────────────
  const totalWeight = useMemo(
    () => manifestOrders.reduce((sum, o) => sum + (o.total_weight || 0), 0),
    [manifestOrders],
  );

  const totalAmount = useMemo(
    () =>
      manifestOrders.reduce(
        (sum, o) => sum + (o.allocated_amount ?? o.net_amount ?? o.total_amount ?? 0),
        0,
      ),
    [manifestOrders],
  );

  const isOverCapacity = useMemo(() => {
    if (!vehicleCapacity) return false;
    return totalWeight > vehicleCapacity;
  }, [totalWeight, vehicleCapacity]);

  const capacityPercentage = useMemo(() => {
    if (!vehicleCapacity) return 0;
    return Math.min((totalWeight / vehicleCapacity) * 100, 100);
  }, [totalWeight, vehicleCapacity]);

  // ─── Filtered Available Orders ────────────────────
  const manifestOrderIds = useMemo(
    () => new Set(manifestOrders.map((o) => o.order_id)),
    [manifestOrders],
  );

  const filteredAvailable = useMemo(() => {
    let orders = availableOrders.filter(
      (o) => !manifestOrderIds.has(o.order_id),
    );
    if (orderSearch) {
      const q = orderSearch.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.order_no?.toLowerCase().includes(q) ||
          o.customer_name?.toLowerCase().includes(q) ||
          o.store_name?.toLowerCase().includes(q),
      );
    }
    return orders;
  }, [availableOrders, manifestOrderIds, orderSearch]);

  // ─── Selection Handlers ─────────────────────────
  const handleClusterChange = (value: string) => {
    const id = Number(value);
    if (id === clusterId) return;
    if (manifestOrders.length > 0) {
      if (
        !window.confirm(
          "Changing the target cluster will clear your current manifest. Proceed?",
        )
      )
        return;
    }
    setClusterId(id);
    setManifestOrders([]); // Reset manifest when cluster changes
    onFilterChange(id, branchId || undefined);
  };

  const handleBranchChange = (value: string) => {
    const id = Number(value);
    if (id === branchId) return;
    if (manifestOrders.length > 0) {
      if (
        !window.confirm(
          "Changing the source branch will clear your current manifest. Proceed?",
        )
      )
        return;
    }
    setBranchId(id);
    setManifestOrders([]); // Reset manifest when branch changes
    onFilterChange(clusterId || undefined, id);
  };

  // ─── Add Order to Manifest ────────────────────────
  const handleAddOrder = (order: SalesOrderOption) => {
    setManifestOrders((prev) => [...prev, order]);
  };

  // ─── Remove Order from Manifest ───────────────────
  const handleRemoveOrder = (orderId: number) => {
    setManifestOrders((prev) => prev.filter((o) => o.order_id !== orderId));
  };

  // ─── Save Plan ────────────────────────────────────
  const handleSave = async () => {
    if (!driverId) return toast.error("Please select a driver.");
    if (!clusterId) return toast.error("Please select a target cluster.");
    if (!branchId) return toast.error("Please select a source branch.");
    if (!vehicleId) return toast.error("Please select a vehicle.");
    if (!dispatchDate) return toast.error("Please set a dispatch date.");
    if (manifestOrders.length === 0)
      return toast.error("Please add at least one sales order.");
    if (isOverCapacity)
      return toast.error("Total weight exceeds vehicle capacity.");

    setIsSaving(true);
    try {
      await onSubmit({
        driver_id: driverId,
        cluster_id: clusterId,
        branch_id: branchId,
        vehicle_id: vehicleId,
        dispatch_date: dispatchDate,
        remarks,
        sales_order_ids: manifestOrders.map((o) => o.order_id),
      });
      toast.success(
        isEditMode
          ? "Pre-dispatch plan updated successfully!"
          : "Pre-dispatch plan created successfully!",
      );
      onClose();
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message || "Failed to save plan.");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Driver Display Name ──────────────────────────
  const getDriverLabel = (driver: {
    user_fname: string;
    user_mname?: string | null;
    user_lname: string;
  }) => {
    return [driver.user_fname, driver.user_mname, driver.user_lname]
      .filter(Boolean)
      .join(" ");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full sm:max-w-8xl h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden min-h-0 pointer-events-auto">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-xl font-semibold">
            {isEditMode ? "Edit Trip Configuration" : "Trip Configuration"}
          </DialogTitle>
        </DialogHeader>

        {/* ─── Trip Configuration Form ─────────────── */}
        <div className="px-6 py-4 border-b shrink-0">
          <div className="grid grid-cols-6 gap-4">
            {/* Assigned Driver */}
            <div className="space-y-1.5 flex flex-col">
              <Label htmlFor="pdp-driver">
                Assigned Driver <span className="text-destructive">*</span>
              </Label>
              <Combobox
                options={
                  masterData?.drivers?.map((d) => ({
                    value: String(d.user_id),
                    label: getDriverLabel(d),
                  })) || []
                }
                value={driverId ? String(driverId) : ""}
                onValueChange={(v) => setDriverId(v ? Number(v) : null)}
                placeholder="Select driver"
              />
            </div>

            {/* Vehicle Selection */}
            <div className="space-y-1.5 flex flex-col">
              <Label htmlFor="pdp-vehicle">
                Vehicle <span className="text-destructive">*</span>
              </Label>
              <Combobox
                options={
                  masterData?.vehicles?.map((v) => ({
                    value: String(v.vehicle_id),
                    label: `${v.vehicle_plate}${v.vehicle_type_name ? ` (${v.vehicle_type_name})` : ""}`,
                  })) || []
                }
                value={vehicleId ? String(vehicleId) : ""}
                onValueChange={(v) => setVehicleId(v ? Number(v) : null)}
                placeholder="Select vehicle"
              />
              {selectedVehicle && (
                <p className="text-xs text-muted-foreground mt-1">
                  Max Capacity: {vehicleCapacity.toLocaleString()} kg
                </p>
              )}
            </div>

            {/* Target Cluster */}
            <div className="space-y-1.5 flex flex-col">
              <Label htmlFor="pdp-cluster">
                Target Cluster <span className="text-destructive">*</span>
              </Label>
              <Combobox
                options={
                  masterData?.clusters?.map((c) => ({
                    value: String(c.id),
                    label: c.cluster_name,
                  })) || []
                }
                value={clusterId ? String(clusterId) : ""}
                onValueChange={handleClusterChange}
                placeholder="Select cluster"
              />
            </div>

            {/* Source Branch */}
            <div className="space-y-1.5 flex flex-col">
              <Label htmlFor="pdp-branch">
                Source Branch <span className="text-destructive">*</span>
              </Label>
              <Combobox
                options={
                  masterData?.branches?.map((b) => ({
                    value: String(b.id),
                    label: b.branch_name,
                  })) || []
                }
                value={branchId ? String(branchId) : ""}
                onValueChange={handleBranchChange}
                placeholder="Select branch"
              />
            </div>

            {/* Dispatch Date */}
            <div className="space-y-1.5">
              <Label htmlFor="pdp-date">
                Dispatch Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pdp-date"
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
              />
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <Label htmlFor="pdp-remarks">Remarks (Optional)</Label>
              <Input
                id="pdp-remarks"
                placeholder="e.g., Priority delivery"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ─── Main Content: Available + Manifest ─── */}
        <div className="flex-1 flex min-h-0 overflow-hidden bg-background">
          {/* Left Panel: Available Deliveries */}
          <div className="w-[400px] border-r flex flex-col shrink-0 min-h-0">
            <div className="px-4 py-3 border-b shrink-0">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Available Deliveries
              </h3>
              {(clusterId || branchId) && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Showing orders for{" "}
                  {[
                    clusterId
                      ? masterData?.clusters?.find((c) => c.id === clusterId)
                          ?.cluster_name
                      : null,
                    branchId
                      ? masterData?.branches?.find((b) => b.id === branchId)
                          ?.branch_name
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" • ") || "selected filters"}
                </p>
              )}
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  className="pl-9 h-9"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0 flex flex-col">
              <div className="p-2 space-y-2">
                {!clusterId ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Select a target cluster to view available orders
                  </div>
                ) : isLoadingOrders ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2.5 w-2/3">
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-4 w-16" />
                            </div>
                            <Skeleton className="h-4 w-[85%]" />
                            <div className="flex items-center gap-1.5 mt-1">
                              <Skeleton className="h-3 w-32" />
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1.5 mt-0.5">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-3 w-12" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredAvailable.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No available orders for this cluster
                  </div>
                ) : (
                  filteredAvailable.map((order) => (
                    <div
                      key={order.order_id}
                      className="border rounded-lg p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => handleAddOrder(order)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-primary">
                              {order.order_no}
                            </span>
                            {order.po_no && (
                              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium">
                                PO: {order.po_no}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground">
                            {order.customer_name || order.store_name || "—"}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {[order.city, order.province]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {formatPeso(
                              order.allocated_amount ??
                              order.net_amount ??
                              order.total_amount ??
                              0
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 font-medium">
                            {formatNumber(order.total_weight || 0)} kg
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2 text-xs text-muted-foreground">
                {filteredAvailable.length} order(s) available
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel: Detailed Trip Manifest */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-3 border-b shrink-0">
              <h3 className="font-semibold text-sm">Detailed Trip Manifest</h3>
            </div>

            <ScrollArea className="flex-1 min-h-0 flex flex-col">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>SO Number</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead className="text-right">Weight (kg)</TableHead>
                    <TableHead className="text-right">Amount (₱)</TableHead>
                    <TableHead className="w-16 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manifestOrders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-12 text-muted-foreground"
                      >
                        Click on available orders to add them to the delivery
                        manifest
                      </TableCell>
                    </TableRow>
                  ) : (
                    manifestOrders.map((order, index) => (
                      <TableRow key={order.order_id}>
                        <TableCell className="font-medium text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          {order.order_no}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {order.po_no || "—"}
                        </TableCell>
                        <TableCell>
                          {order.customer_name || order.store_name || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {[order.city, order.province]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(order.total_weight || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPeso(
                            order.allocated_amount ??
                            order.net_amount ??
                            order.total_amount ??
                            0
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveOrder(order.order_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {manifestOrders.length > 0 && (
                    <TableRow className="bg-muted/30 font-semibold">
                      <TableCell colSpan={5} className="text-right">
                        Totals:
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(totalWeight)} kg
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPeso(totalAmount)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Bottom Info */}
            <div className="px-4 py-2 border-t text-sm text-muted-foreground shrink-0">
              {manifestOrders.length} order(s) in manifest &nbsp;&bull;&nbsp;
              Total Value:{" "}
              <span className="font-semibold text-foreground">
                {formatPeso(totalAmount)}
              </span>
              &nbsp;&bull;&nbsp; Total Weight:{" "}
              <span className="font-semibold text-foreground">
                {formatNumber(totalWeight)} kg
              </span>
            </div>
          </div>
        </div>

        {/* ─── Footer: Capacity Bar + Actions ──────── */}
        <Separator />
        <div className="px-6 py-4 flex items-center gap-6 shrink-0">
          {/* Vehicle Capacity */}
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Vehicle Capacity</span>
              <span
                className={cn(
                  "font-semibold",
                  isOverCapacity
                    ? "text-destructive"
                    : capacityPercentage >= 90
                      ? "text-amber-500"
                      : "text-muted-foreground",
                )}
              >
                {formatNumber(totalWeight)} /{" "}
                {vehicleCapacity > 0
                  ? `${formatNumber(vehicleCapacity)} kg`
                  : "0 kg"}
              </span>
            </div>
            <Progress
              value={capacityPercentage}
              className={cn(
                "h-2.5",
                isOverCapacity
                  ? "[&>[data-slot=progress-indicator]]:bg-destructive"
                  : capacityPercentage >= 90
                    ? "[&>[data-slot=progress-indicator]]:bg-amber-500"
                    : "",
              )}
            />
            {vehicleCapacity > 0 && (
              <p
                className={cn(
                  "text-xs font-medium flex items-center gap-1.5",
                  isOverCapacity
                    ? "text-destructive"
                    : capacityPercentage >= 90
                      ? "text-amber-500"
                      : "text-muted-foreground",
                )}
              >
                {isOverCapacity ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Over Capacity!
                  </>
                ) : capacityPercentage >= 90 ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Near Capacity ({capacityPercentage.toFixed(0)}%)
                  </>
                ) : (
                  `${capacityPercentage.toFixed(0)}% capacity`
                )}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || isOverCapacity}
              className={cn(isOverCapacity && "opacity-50 cursor-not-allowed")}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving
                ? "Saving..."
                : isEditMode
                  ? "Update Plan"
                  : "Save Plan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
