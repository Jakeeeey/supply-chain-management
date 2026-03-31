"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  formatNumber,
  formatPeso,
} from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/utils/format";
import {
  AlertTriangle,
  Filter,
  MapPin,
  Package,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Combobox } from "../Combobox";

interface PDPCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: DispatchPlanFormValues) => Promise<void>;
  masterData: DispatchPlanMasterData | null;
  availableOrders: SalesOrderOption[];
  isLoadingOrders: boolean;
  onFilterChange: (clusterId?: number, branchId?: number) => void;
  initialClusterId?: number | null;
  initialBranchId?: number | null;
  editPlan?: DispatchPlan | null;
  editDetails?: DispatchPlanDetail[];
}

// ── Order Status Badge ─────────────────────────────────────────────────────
function OrderStatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;

  // Case-insensitive check to be safe
  const s = status.toLowerCase();

  const variant =
    s === "not fulfilled"
      ? "secondary"
      : s === "for consolidation"
        ? "default"
        : s === "for loading"
          ? "ghost"
          : "outline";

  return (
    <Badge
      variant={variant}
      className="text-[10px] h-4 px-1.5 shrink-0 whitespace-nowrap"
    >
      {status}
    </Badge>
  );
}

// ── Available Order Card ───────────────────────────────────────────────────
function AvailableOrderCard({
  order,
  onClick,
}: {
  order: SalesOrderOption;
  onClick: () => void;
}) {
  const amount =
    order.allocated_amount ?? order.net_amount ?? order.total_amount ?? 0;

  return (
    <div
      className="border border-border/60 rounded-lg p-3 hover:bg-accent/40 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      {/* Row 1: SO number + amount */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-sm font-semibold text-primary leading-tight">
          {order.order_no}
        </span>
        <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">
          {formatPeso(amount)}
        </span>
      </div>

      {/* Row 2: Customer name */}
      <p className="text-xs text-foreground font-medium leading-snug mb-1.5 truncate">
        {order.customer_name || order.store_name || "—"}
      </p>

      {/* Row 3: Meta row — PO, status, location, weight */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {order.po_no && (
            <span className="text-[10px] text-muted-foreground font-medium shrink-0">
              PO: {order.po_no}
            </span>
          )}
          {order.po_no && order.order_status && (
            <span className="text-muted-foreground/40 text-[10px] shrink-0">
              ·
            </span>
          )}
          <OrderStatusBadge status={order.order_status} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {formatNumber(order.total_weight || 0)} kg
          </span>
        </div>
      </div>

      {/* Row 4: Location */}
      <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground">
        <MapPin className="h-3 w-3 shrink-0" />
        <span className="truncate">
          {[order.city, order.province].filter(Boolean).join(", ") || "—"}
        </span>
      </div>
    </div>
  );
}

export function PDPCreateModal({
  open,
  onClose,
  onSubmit,
  masterData,
  availableOrders,
  isLoadingOrders,
  onFilterChange,
  initialClusterId,
  initialBranchId,
  editPlan,
  editDetails,
}: PDPCreateModalProps) {
  const isEditMode = !!editPlan;

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
  const [statusFilter, setStatusFilter] = useState<
    "all" | "For Consolidation" | "Not Fulfilled"
  >("all");
  const [isSaving, setIsSaving] = useState(false);
  const [manifestOrders, setManifestOrders] = useState<SalesOrderOption[]>([]);

  useEffect(() => {
    if (open) {
      if (editPlan) {
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
              order_status: d.order_status,
              total_weight: d.weight,
            }),
          );
          setManifestOrders(manifestFromDetails);
        } else {
          setManifestOrders([]);
        }

        if (cId) onFilterChange(cId, bId || undefined);
      } else {
        setDriverId(null);
        setClusterId(initialClusterId || null);
        setBranchId(initialBranchId || null);
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

        // Trigger initial filter change if we have initial values
        if (initialClusterId || initialBranchId) {
          onFilterChange(
            initialClusterId || undefined,
            initialBranchId || undefined,
          );
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editPlan]);

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

  const totalWeight = useMemo(
    () => manifestOrders.reduce((sum, o) => sum + (o.total_weight || 0), 0),
    [manifestOrders],
  );

  const totalAmount = useMemo(
    () =>
      manifestOrders.reduce(
        (sum, o) =>
          sum + (o.allocated_amount ?? o.net_amount ?? o.total_amount ?? 0),
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

  const manifestOrderIds = useMemo(
    () => new Set(manifestOrders.map((o) => o.order_id)),
    [manifestOrders],
  );

  // In edit mode, the backend excludes orders already assigned to this plan.
  // We parse them from editDetails so they can reappear in the sidebar
  // when the user removes them from the manifest.
  const initialEditOrders = useMemo<SalesOrderOption[]>(() => {
    if (!editDetails?.length) return [];
    return editDetails.map((d) => ({
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
      order_status: d.order_status,
      total_weight: d.weight,
    }));
  }, [editDetails]);

  // Merge backend available orders with the initial edit orders (no duplicates)
  const effectiveAvailableOrders = useMemo(() => {
    const existingIds = new Set(availableOrders.map((o) => o.order_id));
    const merged = [...availableOrders];
    for (const eo of initialEditOrders) {
      if (!existingIds.has(eo.order_id)) {
        merged.push(eo);
      }
    }
    return merged;
  }, [availableOrders, initialEditOrders]);

  const filteredAvailable = useMemo(() => {
    let orders = effectiveAvailableOrders.filter(
      (o) => !manifestOrderIds.has(o.order_id),
    );

    if (statusFilter !== "all") {
      orders = orders.filter((o) => o.order_status === statusFilter);
    }

    if (orderSearch) {
      const q = orderSearch.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.order_no?.toLowerCase().includes(q) ||
          o.customer_name?.toLowerCase().includes(q) ||
          o.store_name?.toLowerCase().includes(q) ||
          o.po_no?.toLowerCase().includes(q),
      );
    }
    return orders;
  }, [effectiveAvailableOrders, manifestOrderIds, orderSearch, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts = { all: 0, consolidation: 0, "not-fulfilled": 0 };
    effectiveAvailableOrders.forEach((o) => {
      if (manifestOrderIds.has(o.order_id)) return;
      counts.all++;
      if (o.order_status === "For Consolidation") counts.consolidation++;
      if (o.order_status === "Not Fulfilled") counts["not-fulfilled"]++;
    });
    return counts;
  }, [effectiveAvailableOrders, manifestOrderIds]);

  const handleClusterChange = (value: string) => {
    const id = Number(value);
    if (id === clusterId) return;
    if (
      manifestOrders.length > 0 &&
      !window.confirm(
        "Changing the target cluster will clear your current manifest. Proceed?",
      )
    )
      return;
    setClusterId(id);
    setManifestOrders([]);
    onFilterChange(id, branchId || undefined);
  };

  const handleBranchChange = (value: string) => {
    const id = Number(value);
    if (id === branchId) return;
    if (
      manifestOrders.length > 0 &&
      !window.confirm(
        "Changing the source branch will clear your current manifest. Proceed?",
      )
    )
      return;
    setBranchId(id);
    setManifestOrders([]);
    onFilterChange(clusterId || undefined, id);
  };

  const handleAddOrder = (order: SalesOrderOption) => {
    setManifestOrders((prev) => [...prev, order]);
  };

  const handleRemoveOrder = (orderId: number) => {
    setManifestOrders((prev) => prev.filter((o) => o.order_id !== orderId));
  };

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

  const getDriverLabel = (driver: {
    user_fname: string;
    user_mname?: string | null;
    user_lname: string;
  }) =>
    [driver.user_fname, driver.user_mname, driver.user_lname]
      .filter(Boolean)
      .join(" ");

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent className="w-full sm:max-w-8xl h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden min-h-0 pointer-events-auto">
        {/* ── Header ──────────────────────────────────────── */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-base font-semibold">
            {isEditMode ? "Edit Trip Configuration" : "Trip Configuration"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Trip Configuration Form ──────────────────────── */}
        <div className="px-6 py-4 border-b shrink-0 bg-muted/5">
          <div className="grid grid-cols-6 gap-4">
            <div className="space-y-1.5 flex flex-col">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
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
                onValueChange={(v: string) => setDriverId(v ? Number(v) : null)}
                placeholder="Select driver"
              />
            </div>

            <div className="space-y-1.5 flex flex-col">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
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
                onValueChange={(v: string) =>
                  setVehicleId(v ? Number(v) : null)
                }
                placeholder="Select vehicle"
              />
              {selectedVehicle && (
                <p className="text-[10px] text-muted-foreground">
                  Max: {vehicleCapacity.toLocaleString()} kg
                </p>
              )}
            </div>

            <div className="space-y-1.5 flex flex-col">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
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

            <div className="space-y-1.5 flex flex-col">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
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

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Dispatch Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Remarks
              </Label>
              <Input
                placeholder="e.g., Priority delivery"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Main Content ─────────────────────────────────── */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Panel: Available Deliveries */}
          <div className="w-[380px] border-r flex flex-col shrink-0 min-h-0">
            <div className="px-4 py-3 border-b shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  Available Deliveries
                </h3>
              </div>
              {(clusterId || branchId) && (
                <p className="text-xs text-muted-foreground mb-2">
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
                    .join(" · ")}
                </p>
              )}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    className="pl-8 h-8 text-sm"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="default"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                    >
                      <Filter className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground">
                      Filter by Status
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setStatusFilter("all")}
                      className="text-xs"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>All Deliveries</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {statusCounts.all}
                        </Badge>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setStatusFilter("For Consolidation")}
                      className="text-xs"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>For Consolidation</span>
                        <Badge variant="ghost" className="text-[10px]">
                          {statusCounts.consolidation}
                        </Badge>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setStatusFilter("Not Fulfilled")}
                      className="text-xs"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>Not Fulfilled</span>
                        <Badge variant="ghost" className="text-[10px]">
                          {statusCounts["not-fulfilled"]}
                        </Badge>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-3 space-y-2">
                {!clusterId ? (
                  <div className="text-center py-10">
                    <Package className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Select a target cluster to view available orders.
                    </p>
                  </div>
                ) : isLoadingOrders ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                        <Skeleton className="h-3 w-3/4" />
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                        <Skeleton className="h-3 w-32" />
                      </div>
                    ))}
                  </div>
                ) : filteredAvailable.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-xs text-muted-foreground">
                      No available orders for this cluster.
                    </p>
                  </div>
                ) : (
                  filteredAvailable.map((order) => (
                    <AvailableOrderCard
                      key={order.order_id}
                      order={order}
                      onClick={() => handleAddOrder(order)}
                    />
                  ))
                )}
              </div>
              <div className="px-4 py-2 text-[10px] text-muted-foreground border-t">
                {filteredAvailable.length} order(s) available
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel: Detailed Trip Manifest */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-3 border-b shrink-0">
              <h3 className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Detailed Trip Manifest
              </h3>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>SO Number</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Weight (kg)</TableHead>
                    <TableHead className="text-right">Amount (₱)</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manifestOrders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center py-12 text-muted-foreground text-sm"
                      >
                        Click available orders to add them to the manifest.
                      </TableCell>
                    </TableRow>
                  ) : (
                    manifestOrders.map((order, index) => (
                      <TableRow key={order.order_id}>
                        <TableCell className="text-muted-foreground text-xs">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-semibold text-primary text-sm">
                          {order.order_no}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {order.po_no || "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {order.customer_name || order.store_name || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {[order.city, order.province]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge status={order.order_status} />
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {formatNumber(order.total_weight || 0)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums font-medium">
                          {formatPeso(
                            order.allocated_amount ??
                              order.net_amount ??
                              order.total_amount ??
                              0,
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveOrder(order.order_id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {manifestOrders.length > 0 && (
                    <TableRow className="bg-muted/30">
                      <TableCell
                        colSpan={6}
                        className="text-right text-xs font-semibold text-muted-foreground"
                      >
                        Totals
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {formatNumber(totalWeight)} kg
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {formatPeso(totalAmount)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="px-4 py-2 border-t shrink-0">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">
                  {manifestOrders.length}
                </span>{" "}
                order(s) &nbsp;·&nbsp; Value:{" "}
                <span className="font-medium text-foreground">
                  {formatPeso(totalAmount)}
                </span>{" "}
                &nbsp;·&nbsp; Weight:{" "}
                <span className="font-medium text-foreground">
                  {formatNumber(totalWeight)} kg
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Footer: Capacity + Actions ───────────────────── */}
        <Separator />
        <div className="px-6 py-4 flex items-center gap-6 shrink-0">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground uppercase tracking-wider text-[10px]">
                Vehicle Capacity
              </span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
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
                "h-2",
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
                  "text-[10px] font-medium flex items-center gap-1",
                  isOverCapacity
                    ? "text-destructive"
                    : capacityPercentage >= 90
                      ? "text-amber-500"
                      : "text-muted-foreground",
                )}
              >
                {isOverCapacity ? (
                  <>
                    <AlertTriangle className="h-3 w-3" /> Over Capacity!
                  </>
                ) : capacityPercentage >= 90 ? (
                  <>
                    <AlertTriangle className="h-3 w-3" /> Near Capacity (
                    {capacityPercentage.toFixed(0)}%)
                  </>
                ) : (
                  `${capacityPercentage.toFixed(0)}% used`
                )}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isOverCapacity}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
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
