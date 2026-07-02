"use client";

import * as React from "react";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  Check,
  ChevronsUpDown,
  ClipboardList,
  Edit,
  Eye,
  FileText,
  PackageMinus,
  PackagePlus,
  Plus,
  RefreshCcw,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { usePartMovements } from "./hooks/usePartMovements";
import { usePartReservations } from "./hooks/usePartReservations";
import { usePartsInventory } from "./hooks/usePartsInventory";
import * as api from "./providers/partsInventoryApi";
import type {
  CreateMovementInput,
  CreatePartInput,
  CreateReservationInput,
  PartInventoryRow,
  PartMovementRow,
  PartMovementType,
  PartReservationRow,
  PartsInventoryListResponse,
  PartsLookupData,
  ReportResponse,
  UpdateReservationInput,
} from "./types";

type DialogState<T> = {
  open: boolean;
  item: T | null;
};

type MovementDialogState = {
  open: boolean;
  part: PartInventoryRow | null;
  movementType: PartMovementType;
};

type ReservationActionState = {
  open: boolean;
  reservation: PartReservationRow | null;
  action: "issue" | "return" | "cancel";
};

type PartDetailRow = PartInventoryRow & {
  recentMovements?: PartMovementRow[];
  activeReservations?: PartReservationRow[];
};

const movementTypes: PartMovementType[] = ["Receiving", "Issue", "Return", "Adjustment", "Damage"];
const CENTRAL_OR_UNASSIGNED_LABEL = "Central or unassigned";
const summaryToneStyles = {
  info: {
    card: "border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/25",
    value: "text-blue-700 dark:text-blue-300",
    icon: "border-blue-200 bg-blue-100/70 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-300",
  },
  warning: {
    card: "border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/25",
    value: "text-amber-700 dark:text-amber-300",
    icon: "border-amber-200 bg-amber-100/70 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-300",
  },
  critical: {
    card: "border-red-200 bg-red-50/70 dark:border-red-900/50 dark:bg-red-950/25",
    value: "text-red-700 dark:text-red-300",
    icon: "border-red-200 bg-red-100/70 text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300",
  },
  success: {
    card: "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/25",
    value: "text-emerald-700 dark:text-emerald-300",
    icon: "border-emerald-200 bg-emerald-100/70 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
} as const;
const emptyPartsResponse: PartsInventoryListResponse = {
  data: [],
  meta: { page: 1, limit: 25, total: 0 },
  summary: {
    totalParts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalAvailableQuantity: 0,
  },
};

function nullableNumber(value: string) {
  return value ? Number(value) : null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusVariant(status: string) {
  if (status === "out_of_stock" || status === "Cancelled") return "destructive" as const;
  if (status === "low_stock" || status === "Partially Issued") return "secondary" as const;
  return "outline" as const;
}

function mergePartOptions(options: PartInventoryRow[], selectedPart: PartInventoryRow | null) {
  const merged: PartInventoryRow[] = [];
  const seen = new Set<number>();

  for (const part of selectedPart ? [selectedPart, ...options] : options) {
    if (seen.has(part.id)) continue;
    seen.add(part.id);
    merged.push(part);
  }

  return merged;
}

function PaginationControls({
  page,
  limit,
  total,
  onPageChange,
}: {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex items-center justify-between gap-3 border-t px-3 py-3 text-sm text-muted-foreground">
      <div>
        Page {page} of {totalPages} ({total} rows)
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof summaryToneStyles;
}) {
  const styles = summaryToneStyles[tone];

  return (
    <Card className={styles.card}>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <div className="text-xs font-medium uppercase text-muted-foreground">{title}</div>
          <div className={cn("mt-1 text-2xl font-semibold", styles.value)}>{value}</div>
        </div>
        <div className={cn("rounded-md border p-2", styles.icon)}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyRows({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
        {label}
      </TableCell>
    </TableRow>
  );
}

function LoadingRows({ colSpan, rows = 4 }: { colSpan: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <TableRow key={index}>
          <TableCell colSpan={colSpan}>
            <Skeleton className="h-8 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function PartDialog({
  open,
  part,
  lookups,
  saving,
  onOpenChange,
  onSave,
  onCategoryCreate,
}: {
  open: boolean;
  part: PartInventoryRow | null;
  lookups: PartsLookupData;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: CreatePartInput, partId?: number) => Promise<void>;
  onCategoryCreate: (name: string) => Promise<{ id: number; code: string | null; name: string; description: string | null }>;
}) {
  const [form, setForm] = React.useState({
    partCode: "",
    partName: "",
    categoryId: "",
    unit: "pc",
    minimumQuantity: "0",
    storageLocation: "",
    description: "",
    isActive: true,
    initialBranchId: "",
    initialStock: "",
  });
  const [compatibleTypeIds, setCompatibleTypeIds] = React.useState<number[]>([]);
  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [categorySearch, setCategorySearch] = React.useState("");
  const [creatingCategory, setCreatingCategory] = React.useState(false);

  const selectedCategory = lookups.categories.find((cat) => String(cat.id) === form.categoryId);
  const canCreateCategory = categorySearch.trim().length > 0
    && !lookups.categories.some((cat) => cat.name.toLowerCase() === categorySearch.trim().toLowerCase());

  React.useEffect(() => {
    if (!open) return;
    setForm({
      partCode: part?.partCode || "",
      partName: part?.partName || "",
      categoryId: part?.categoryId ? String(part.categoryId) : "",
      unit: part?.unit || "pc",
      minimumQuantity: String(part?.minimumQuantity ?? 0),
      storageLocation: part?.storageLocation || "",
      description: part?.description || "",
      isActive: part?.isActive ?? true,
      initialBranchId: "",
      initialStock: "",
    });
    setCompatibleTypeIds(part?.compatibleVehicleTypes.map((type) => type.id) || []);
    setCategorySearch("");
  }, [open, part]);

  function update(key: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleType(typeId: number, checked: boolean) {
    setCompatibleTypeIds((current) =>
      checked ? Array.from(new Set([...current, typeId])) : current.filter((id) => id !== typeId),
    );
  }

  async function handleCreateCategory(name?: string) {
    const categoryName = name ?? categorySearch.trim();
    if (!categoryName || creatingCategory) return;
    setCreatingCategory(true);
    try {
      const created = await onCategoryCreate(categoryName);
      update("categoryId", String(created.id));
      setCategoryOpen(false);
      setCategorySearch("");
      toast.success(`Category "${categoryName}" created`);
    } catch (error) {
      toast.error("Failed to create category", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setCreatingCategory(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const initialStockValue = Number(form.initialStock || 0);
    await onSave(
      {
        partCode: form.partCode,
        partName: form.partName,
        categoryId: nullableNumber(form.categoryId),
        unit: form.unit,
        minimumQuantity: Number(form.minimumQuantity || 0),
        storageLocation: form.storageLocation || null,
        description: form.description || null,
        isActive: form.isActive,
        compatibleVehicleTypeIds: compatibleTypeIds,
        initialStock: !part && initialStockValue > 0
          ? [{ branchId: nullableNumber(form.initialBranchId), stockOnHand: initialStockValue }]
          : [],
      },
      part?.id,
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{part ? "Edit Part" : "Add Part"}</DialogTitle>
          <DialogDescription>Maintain the fleet part master record and vehicle compatibility.</DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="partCode">Part code</Label>
              <Input id="partCode" value={form.partCode} onChange={(event) => update("partCode", event.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partName">Part name</Label>
              <Input id="partName" value={form.partName} onChange={(event) => update("partName", event.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="categoryId">Category</Label>
              <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="categoryId"
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedCategory ? selectedCategory.name : categorySearch || "Uncategorized"}
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search categories..."
                      value={categorySearch}
                      onValueChange={setCategorySearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {canCreateCategory ? (
                          <Button
                            variant="ghost"
                            className="w-full justify-start gap-2 text-sm"
                            onClick={() => handleCreateCategory()}
                            disabled={creatingCategory}
                          >
                            <Plus className="size-4" />
                            {creatingCategory ? "Creating..." : `New Category "${categorySearch.trim()}"`}
                          </Button>
                        ) : (
                          "No categories found"
                        )}
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value=""
                          onSelect={() => {
                            update("categoryId", "");
                            setCategoryOpen(false);
                            setCategorySearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 size-4",
                              form.categoryId === "" ? "opacity-100" : "opacity-0",
                            )}
                          />
                          Uncategorized
                        </CommandItem>
                        {lookups.categories.map((category) => (
                          <CommandItem
                            key={category.id}
                            value={String(category.id)}
                            onSelect={() => {
                              update("categoryId", String(category.id));
                              setCategoryOpen(false);
                              setCategorySearch("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-4",
                                form.categoryId === String(category.id) ? "opacity-100" : "opacity-0",
                              )}
                            />
                            {category.name}
                          </CommandItem>
                        ))}

                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" value={form.unit} onChange={(event) => update("unit", event.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minimumQuantity">Minimum Quantity</Label>
              <Input id="minimumQuantity" type="number" min="0" step="0.01" value={form.minimumQuantity} onChange={(event) => update("minimumQuantity", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="storageLocation">Storage location</Label>
              <Input id="storageLocation" value={form.storageLocation} onChange={(event) => update("storageLocation", event.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={form.description} onChange={(event) => update("description", event.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>Compatible vehicle types</Label>
            <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-3">
              {lookups.vehicleTypes.length === 0 ? (
                <div className="text-sm text-muted-foreground">No vehicle types available.</div>
              ) : (
                lookups.vehicleTypes.map((type) => (
                  <label key={type.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={compatibleTypeIds.includes(type.id)}
                      onCheckedChange={(checked) => toggleType(type.id, checked === true)}
                    />
                    {type.name}
                  </label>
                ))
              )}
            </div>
          </div>

          {!part && (
            <div className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="initialBranchId">Initial stock branch</Label>
                <NativeSelect id="initialBranchId" value={form.initialBranchId} onChange={(event) => update("initialBranchId", event.target.value)} className="w-full">
                  <NativeSelectOption value="">{CENTRAL_OR_UNASSIGNED_LABEL}</NativeSelectOption>
                  {lookups.branches.map((branch) => (
                    <NativeSelectOption key={branch.id} value={branch.id}>
                      {branch.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="initialStock">Initial stock</Label>
                <Input id="initialStock" type="number" min="0" step="0.01" value={form.initialStock} onChange={(event) => update("initialStock", event.target.value)} />
              </div>
            </div>
          )}

          <label className="flex items-center gap-3 text-sm">
            <Switch checked={form.isActive} onCheckedChange={(checked) => update("isActive", checked)} />
            Active part
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value || "-"}</div>
    </div>
  );
}

function PartViewDialog({
  open,
  part,
  loading,
  onOpenChange,
}: {
  open: boolean;
  part: PartDetailRow | null;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const movements = part?.recentMovements || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{part ? part.partName : "Part Details"}</DialogTitle>
          <DialogDescription>{part?.partCode || "View part information and related stock movements."}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="grid gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : part ? (
          <div className="grid gap-5">
            <div className="grid gap-3 rounded-md border p-4 sm:grid-cols-2 lg:grid-cols-4">
              <DetailItem label="Category" value={part.categoryName} />
              <DetailItem label="Unit" value={part.unit} />
              <DetailItem label="Minimum Quantity" value={formatNumber(part.minimumQuantity)} />
              <DetailItem label="Storage Location" value={part.storageLocation} />
              <DetailItem label="Status" value={<Badge variant={statusVariant(part.stockStatus)}>{part.stockStatusLabel}</Badge>} />
              <DetailItem label="Active" value={part.isActive ? "Yes" : "No"} />
              <DetailItem label="On Hand" value={formatNumber(part.totalStockOnHand)} />
              <DetailItem label="Available" value={formatNumber(part.totalAvailableQuantity)} />
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Compatible Vehicle Types</div>
              <div className="flex flex-wrap gap-1">
                {part.compatibleVehicleTypes.length ? part.compatibleVehicleTypes.map((type) => (
                  <Badge key={type.id} variant="secondary">{type.name}</Badge>
                )) : <span className="text-sm text-muted-foreground">All</span>}
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Branch Stock</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">On Hand</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Damaged</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {part.branchStock.length === 0 ? <EmptyRows colSpan={5} label="No branch stock found." /> : null}
                  {part.branchStock.map((stock) => (
                    <TableRow key={stock.id}>
                      <TableCell>{stock.branchId == null ? CENTRAL_OR_UNASSIGNED_LABEL : stock.branchName || "-"}</TableCell>
                      <TableCell className="text-right">{formatNumber(stock.stockOnHand)}</TableCell>
                      <TableCell className="text-right">{formatNumber(stock.reservedQuantity)}</TableCell>
                      <TableCell className="text-right">{formatNumber(stock.damagedQuantity)}</TableCell>
                      <TableCell className="text-right">{formatNumber(stock.availableQuantity)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Recent Movements</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Movement</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.length === 0 ? <EmptyRows colSpan={5} label="No recent movements found." /> : null}
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="font-medium">{movement.movementNo}</TableCell>
                      <TableCell>{formatDate(movement.movementAt)}</TableCell>
                      <TableCell>{movement.branchId == null ? CENTRAL_OR_UNASSIGNED_LABEL : movement.branchName || "-"}</TableCell>
                      <TableCell><Badge variant="outline">{movement.movementType}</Badge></TableCell>
                      <TableCell className="text-right">{formatNumber(movement.quantity)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">No part selected.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function movementLabel(type: PartMovementType) {
  if (type === "Receiving") return "Add Stock";
  if (type === "Issue") return "Reduce Stock";
  return `${type} Movement`;
}

function MovementDialog({
  state,
  lookups,
  parts,
  partsLoading,
  partSearch,
  saving,
  onOpenChange,
  onPartSearchChange,
  onSave,
}: {
  state: MovementDialogState;
  lookups: PartsLookupData;
  parts: PartInventoryRow[];
  partsLoading: boolean;
  partSearch: string;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onPartSearchChange: (value: string) => void;
  onSave: (payload: CreateMovementInput) => Promise<void>;
}) {
  const [form, setForm] = React.useState({
    partId: "",
    branchId: "",
    movementType: state.movementType,
    adjustmentDirection: "IN" as "IN" | "OUT",
    quantity: "",
    vehicleId: "",
    referenceNo: "",
    reasonCode: "",
    remarks: "",
    movementAt: "",
  });

  React.useEffect(() => {
    if (!state.open) return;
    setForm({
      partId: state.part ? String(state.part.id) : "",
      branchId: state.part?.branchStock[0]?.branchId ? String(state.part.branchStock[0].branchId) : "",
    movementType: state.movementType,
      adjustmentDirection: "IN",
      quantity: "",
      vehicleId: "",
      referenceNo: "",
      reasonCode: "",
      remarks: "",
      movementAt: "",
    });
  }, [state.open, state.part, state.movementType]);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await onSave({
      partId: Number(form.partId),
      branchId: nullableNumber(form.branchId),
      movementType: form.movementType,
      adjustmentDirection: form.adjustmentDirection,
      quantity: Number(form.quantity),
      vehicleId: nullableNumber(form.vehicleId),
      referenceNo: form.referenceNo || null,
      reasonCode: form.reasonCode || null,
      remarks: form.remarks || null,
      movementAt: form.movementAt ? new Date(form.movementAt).toISOString() : undefined,
    });
    onOpenChange(false);
  }

  const requiresReason = form.movementType === "Adjustment" || form.movementType === "Damage";
  const showVehicle = form.movementType === "Issue" || form.movementType === "Return" || form.movementType === "Damage";

  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{movementLabel(form.movementType)}</DialogTitle>
          <DialogDescription>Record a stock movement for fleet parts inventory.</DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-2">
            {!state.part && (
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="movementPartSearch">Search parts</Label>
                <Input
                  id="movementPartSearch"
                  placeholder="Search by part code, name, category, or product"
                  value={partSearch}
                  onChange={(event) => onPartSearchChange(event.target.value)}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="movementPart">Part</Label>
              <NativeSelect id="movementPart" value={form.partId} onChange={(event) => update("partId", event.target.value)} className="w-full" required>
                <NativeSelectOption value="">Select part</NativeSelectOption>
                {parts.map((part) => (
                  <NativeSelectOption key={part.id} value={part.id}>
                    {part.partCode} - {part.partName}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {partsLoading && <div className="text-xs text-muted-foreground">Loading part options...</div>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="movementType">Movement type</Label>
              <NativeSelect id="movementType" value={form.movementType} onChange={(event) => update("movementType", event.target.value)} className="w-full">
                {movementTypes.map((type) => (
                  <NativeSelectOption key={type} value={type}>
                    {type}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="movementBranch">Branch</Label>
              <NativeSelect id="movementBranch" value={form.branchId} onChange={(event) => update("branchId", event.target.value)} className="w-full">
                <NativeSelectOption value="">{CENTRAL_OR_UNASSIGNED_LABEL}</NativeSelectOption>
                {lookups.branches.map((branch) => (
                  <NativeSelectOption key={branch.id} value={branch.id}>
                    {branch.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="movementQuantity">Quantity</Label>
              <Input id="movementQuantity" type="number" min="0.01" step="0.01" value={form.quantity} onChange={(event) => update("quantity", event.target.value)} required />
            </div>
            {form.movementType === "Adjustment" && (
              <div className="grid gap-2">
                <Label htmlFor="adjustmentDirection">Direction</Label>
                <NativeSelect id="adjustmentDirection" value={form.adjustmentDirection} onChange={(event) => update("adjustmentDirection", event.target.value)} className="w-full">
                  <NativeSelectOption value="IN">IN</NativeSelectOption>
                  <NativeSelectOption value="OUT">OUT</NativeSelectOption>
                </NativeSelect>
              </div>
            )}
            {showVehicle && (
              <div className="grid gap-2">
                <Label htmlFor="movementVehicle">Vehicle</Label>
                <NativeSelect id="movementVehicle" value={form.vehicleId} onChange={(event) => update("vehicleId", event.target.value)} className="w-full">
                  <NativeSelectOption value="">No vehicle</NativeSelectOption>
                  {lookups.vehicles.map((vehicle) => (
                    <NativeSelectOption key={vehicle.id} value={vehicle.id}>
                      {vehicle.plateNo} {vehicle.name ? `- ${vehicle.name}` : ""}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="referenceNo">Reference no</Label>
              <Input id="referenceNo" value={form.referenceNo} onChange={(event) => update("referenceNo", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="movementAt">Movement date</Label>
              <Input id="movementAt" type="datetime-local" value={form.movementAt} onChange={(event) => update("movementAt", event.target.value)} />
            </div>
            {requiresReason && (
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="reasonCode">Reason code</Label>
                <Input id="reasonCode" value={form.reasonCode} onChange={(event) => update("reasonCode", event.target.value)} required />
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="movementRemarks">Remarks</Label>
            <Textarea id="movementRemarks" value={form.remarks} onChange={(event) => update("remarks", event.target.value)} required={requiresReason} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : movementLabel(form.movementType)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReservationDialog({
  open,
  part,
  lookups,
  parts,
  partsLoading,
  partSearch,
  saving,
  onOpenChange,
  onPartSearchChange,
  onSave,
}: {
  open: boolean;
  part: PartInventoryRow | null;
  lookups: PartsLookupData;
  parts: PartInventoryRow[];
  partsLoading: boolean;
  partSearch: string;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onPartSearchChange: (value: string) => void;
  onSave: (payload: CreateReservationInput) => Promise<void>;
}) {
  const [form, setForm] = React.useState({
    partId: "",
    branchId: "",
    vehicleId: "",
    quantity: "",
    neededAt: "",
    remarks: "",
  });

  React.useEffect(() => {
    if (!open) return;
    setForm({
      partId: part ? String(part.id) : "",
      branchId: part?.branchStock[0]?.branchId ? String(part.branchStock[0].branchId) : "",
      vehicleId: "",
      quantity: "",
      neededAt: "",
      remarks: "",
    });
  }, [open, part]);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await onSave({
      partId: Number(form.partId),
      branchId: nullableNumber(form.branchId),
      vehicleId: Number(form.vehicleId),
      reservedQuantity: Number(form.quantity),
      neededAt: form.neededAt ? new Date(form.neededAt).toISOString() : null,
      remarks: form.remarks || null,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reserve Part</DialogTitle>
          <DialogDescription>Hold available stock for planned repair or service work.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-2">
            {!part && (
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="reservationPartSearch">Search parts</Label>
                <Input
                  id="reservationPartSearch"
                  placeholder="Search by part code, name, category, or product"
                  value={partSearch}
                  onChange={(event) => onPartSearchChange(event.target.value)}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="reservationPart">Part</Label>
              <NativeSelect id="reservationPart" value={form.partId} onChange={(event) => update("partId", event.target.value)} className="w-full" required>
                <NativeSelectOption value="">Select part</NativeSelectOption>
                {parts.map((row) => (
                  <NativeSelectOption key={row.id} value={row.id}>
                    {row.partCode} - {row.partName}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {partsLoading && <div className="text-xs text-muted-foreground">Loading part options...</div>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reservationBranch">Branch</Label>
              <NativeSelect id="reservationBranch" value={form.branchId} onChange={(event) => update("branchId", event.target.value)} className="w-full">
                <NativeSelectOption value="">{CENTRAL_OR_UNASSIGNED_LABEL}</NativeSelectOption>
                {lookups.branches.map((branch) => (
                  <NativeSelectOption key={branch.id} value={branch.id}>
                    {branch.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reservationVehicle">Vehicle</Label>
              <NativeSelect id="reservationVehicle" value={form.vehicleId} onChange={(event) => update("vehicleId", event.target.value)} className="w-full" required>
                <NativeSelectOption value="">Select vehicle</NativeSelectOption>
                {lookups.vehicles.map((vehicle) => (
                  <NativeSelectOption key={vehicle.id} value={vehicle.id}>
                    {vehicle.plateNo} {vehicle.name ? `- ${vehicle.name}` : ""}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reservationQuantity">Quantity</Label>
              <Input id="reservationQuantity" type="number" min="0.01" step="0.01" value={form.quantity} onChange={(event) => update("quantity", event.target.value)} required />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="neededAt">Needed at</Label>
              <Input id="neededAt" type="datetime-local" value={form.neededAt} onChange={(event) => update("neededAt", event.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reservationRemarks">Remarks</Label>
            <Textarea id="reservationRemarks" value={form.remarks} onChange={(event) => update("remarks", event.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Create Reservation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReservationActionDialog({
  state,
  saving,
  onOpenChange,
  onSave,
}: {
  state: ReservationActionState;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: UpdateReservationInput) => Promise<void>;
}) {
  const [form, setForm] = React.useState({ quantity: "", referenceNo: "", remarks: "", cancelReason: "" });

  React.useEffect(() => {
    if (!state.open) return;
    const reservation = state.reservation;
    const defaultQuantity = state.action === "issue"
      ? reservation?.remainingQuantity
      : state.action === "return"
        ? reservation?.returnableQuantity
        : reservation?.remainingQuantity;
    setForm({
      quantity: defaultQuantity ? String(defaultQuantity) : "",
      referenceNo: reservation?.reservationNo || "",
      remarks: "",
      cancelReason: "",
    });
  }, [state.open, state.action, state.reservation]);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!state.reservation) return;
    await onSave({
      id: state.reservation.id,
      action: state.action,
      quantity: state.action === "cancel" ? undefined : Number(form.quantity),
      referenceNo: form.referenceNo || null,
      remarks: form.remarks || null,
      cancelReason: form.cancelReason || null,
    });
    onOpenChange(false);
  }

  const title = state.action === "issue" ? "Issue Reserved Part" : state.action === "return" ? "Return Reserved Part" : "Cancel Reservation";

  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{state.reservation?.reservationNo || "Reservation action"}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          {state.action !== "cancel" && (
            <div className="grid gap-2">
              <Label htmlFor="actionQuantity">Quantity</Label>
              <Input id="actionQuantity" type="number" min="0.01" step="0.01" value={form.quantity} onChange={(event) => update("quantity", event.target.value)} required />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="actionReference">Reference no</Label>
            <Input id="actionReference" value={form.referenceNo} onChange={(event) => update("referenceNo", event.target.value)} />
          </div>
          {state.action === "cancel" && (
            <div className="grid gap-2">
              <Label htmlFor="cancelReason">Cancel reason</Label>
              <Textarea id="cancelReason" value={form.cancelReason} onChange={(event) => update("cancelReason", event.target.value)} required />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="actionRemarks">Remarks</Label>
            <Textarea id="actionRemarks" value={form.remarks} onChange={(event) => update("remarks", event.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} variant={state.action === "cancel" ? "destructive" : "default"}>
              {saving ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PartsInventoryModule() {
  const inventory = usePartsInventory();
  const movements = usePartMovements();
  const reservations = usePartReservations();

  const [activeTab, setActiveTab] = React.useState("parts");
  const [partDialog, setPartDialog] = React.useState<DialogState<PartInventoryRow>>({ open: false, item: null });
  const [partViewOpen, setPartViewOpen] = React.useState(false);
  const [partView, setPartView] = React.useState<PartDetailRow | null>(null);
  const [partViewLoading, setPartViewLoading] = React.useState(false);
  const [movementDialog, setMovementDialog] = React.useState<MovementDialogState>({
    open: false,
    part: null,
    movementType: "Receiving",
  });
  const [reservationDialog, setReservationDialog] = React.useState<DialogState<PartInventoryRow>>({ open: false, item: null });
  const [reservationAction, setReservationAction] = React.useState<ReservationActionState>({
    open: false,
    reservation: null,
    action: "issue",
  });
  const [reportType, setReportType] = React.useState("stock_on_hand");
  const [report, setReport] = React.useState<ReportResponse | null>(null);
  const [reportLoading, setReportLoading] = React.useState(false);
  const [lowStockResponse, setLowStockResponse] = React.useState<PartsInventoryListResponse>(emptyPartsResponse);
  const [lowStockLoading, setLowStockLoading] = React.useState(false);
  const [lowStockPage, setLowStockPage] = React.useState(1);
  const [lowStockReloadKey, setLowStockReloadKey] = React.useState(0);
  const lowStockLimit = 25;
  const [operationPartSearch, setOperationPartSearch] = React.useState("");
  const [operationParts, setOperationParts] = React.useState<PartInventoryRow[]>([]);
  const [operationPartsLoading, setOperationPartsLoading] = React.useState(false);

  const parts = inventory.response.data;
  const selectedOperationPart = movementDialog.open
    ? movementDialog.part
    : reservationDialog.open
      ? reservationDialog.item
      : null;
  const operationPartOptions = React.useMemo(
    () => mergePartOptions(operationParts, selectedOperationPart),
    [operationParts, selectedOperationPart],
  );

  React.useEffect(() => {
    setLowStockPage(1);
  }, [
    inventory.filters.search,
    inventory.filters.categoryId,
    inventory.filters.vehicleTypeId,
    inventory.filters.branchId,
    inventory.filters.active,
  ]);

  React.useEffect(() => {
    let alive = true;
    setLowStockLoading(true);

    api.fetchLowStockParts({
      search: inventory.filters.search,
      categoryId: inventory.filters.categoryId,
      vehicleTypeId: inventory.filters.vehicleTypeId,
      branchId: inventory.filters.branchId,
      stockStatus: "needs_attention",
      active: inventory.filters.active,
      page: lowStockPage,
      limit: lowStockLimit,
    })
      .then((response) => {
        if (alive) setLowStockResponse(response);
      })
      .catch((error) => {
        if (!alive) return;
        setLowStockResponse(emptyPartsResponse);
        toast.error("Failed to load low-stock parts", {
          description: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        if (alive) setLowStockLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [
    inventory.filters.search,
    inventory.filters.categoryId,
    inventory.filters.vehicleTypeId,
    inventory.filters.branchId,
    inventory.filters.active,
    lowStockPage,
    lowStockReloadKey,
  ]);

  React.useEffect(() => {
    if (!movementDialog.open && !reservationDialog.open) return;

    let alive = true;
    setOperationPartsLoading(true);

    api.fetchPartOptions(operationPartSearch)
      .then((rows) => {
        if (alive) setOperationParts(rows);
      })
      .catch((error) => {
        if (!alive) return;
        setOperationParts([]);
        toast.error("Failed to load part options", {
          description: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        if (alive) setOperationPartsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [movementDialog.open, operationPartSearch, reservationDialog.open]);

  function openMovementDialog(part: PartInventoryRow | null, movementType: PartMovementType) {
    setOperationPartSearch("");
    setMovementDialog({ open: true, part, movementType });
  }

  function openReservationDialog(part: PartInventoryRow | null) {
    setOperationPartSearch("");
    setReservationDialog({ open: true, item: part });
  }

  async function openPartView(part: PartInventoryRow) {
    setPartViewOpen(true);
    setPartView(part);
    setPartViewLoading(true);
    try {
      const response = await api.fetchPartDetail(part.id);
      setPartView(response.data as PartDetailRow);
    } catch (error) {
      toast.error("Failed to load part details", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setPartViewLoading(false);
    }
  }

  async function refreshAll() {
    await Promise.all([inventory.refresh(), movements.refresh(), reservations.refresh()]);
    setLowStockReloadKey((current) => current + 1);
  }

  async function savePart(payload: CreatePartInput, partId?: number) {
    await inventory.savePart(payload, partId);
    setLowStockReloadKey((current) => current + 1);
  }

  async function saveMovement(payload: CreateMovementInput) {
    await movements.saveMovement(payload);
    await Promise.all([inventory.refresh(), reservations.refresh()]);
    setLowStockReloadKey((current) => current + 1);
  }

  async function saveReservation(payload: CreateReservationInput) {
    await reservations.createReservation(payload);
    await inventory.refresh();
    setLowStockReloadKey((current) => current + 1);
  }

  async function saveReservationAction(payload: UpdateReservationInput) {
    await reservations.updateReservation(payload);
    await Promise.all([inventory.refresh(), movements.refresh()]);
    setLowStockReloadKey((current) => current + 1);
  }

  async function loadReport() {
    setReportLoading(true);
    try {
      setReport(
        await api.fetchReport(reportType, {
          branchId: inventory.filters.branchId,
          categoryId: inventory.filters.categoryId,
        }),
      );
    } catch (error) {
      toast.error("Failed to load report", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <div className="w-full px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Parts Inventory</h1>
            <p className="text-sm text-muted-foreground">Fleet-maintained parts, stock balances, movements, reservations, and reports.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={refreshAll} aria-label="Refresh">
              <RefreshCcw className="size-4" />
            </Button>
            <Button onClick={() => setPartDialog({ open: true, item: null })}>
              <PackagePlus className="size-4" />
              Add Part
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Total parts" value={inventory.response.summary.totalParts} icon={Boxes} tone="info" />
          <SummaryCard title="Low stock" value={inventory.response.summary.lowStockCount} icon={AlertTriangle} tone="warning" />
          <SummaryCard title="Out of stock" value={inventory.response.summary.outOfStockCount} icon={ShieldAlert} tone="critical" />
          <SummaryCard title="Available qty" value={formatNumber(inventory.response.summary.totalAvailableQuantity)} icon={ClipboardList} tone="success" />
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <Input
                placeholder="Search parts"
                value={inventory.filters.search}
                onChange={(event) => inventory.setFilters({ search: event.target.value })}
                className="xl:col-span-2"
              />
              <NativeSelect value={inventory.filters.categoryId} onChange={(event) => inventory.setFilters({ categoryId: event.target.value })} className="w-full">
                <NativeSelectOption value="">All categories</NativeSelectOption>
                {inventory.lookups.categories.map((category) => (
                  <NativeSelectOption key={category.id} value={category.id}>
                    {category.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <NativeSelect value={inventory.filters.branchId} onChange={(event) => inventory.setFilters({ branchId: event.target.value })} className="w-full">
                <NativeSelectOption value="">All branches</NativeSelectOption>
                {inventory.lookups.branches.map((branch) => (
                  <NativeSelectOption key={branch.id} value={branch.id}>
                    {branch.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <NativeSelect value={inventory.filters.stockStatus} onChange={(event) => inventory.setFilters({ stockStatus: event.target.value as "all" | "available" | "low_stock" | "out_of_stock" })} className="w-full">
                <NativeSelectOption value="all">All stock</NativeSelectOption>
                <NativeSelectOption value="available">Available</NativeSelectOption>
                <NativeSelectOption value="low_stock">Low Stock</NativeSelectOption>
                <NativeSelectOption value="out_of_stock">Out of Stock</NativeSelectOption>
              </NativeSelect>
              <NativeSelect value={inventory.filters.active} onChange={(event) => inventory.setFilters({ active: event.target.value as "true" | "false" | "all" })} className="w-full">
                <NativeSelectOption value="true">Active only</NativeSelectOption>
                <NativeSelectOption value="false">Inactive only</NativeSelectOption>
                <NativeSelectOption value="all">All statuses</NativeSelectOption>
              </NativeSelect>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex w-full justify-start overflow-x-auto">
            <TabsTrigger value="parts">Parts Masterlist</TabsTrigger>
            <TabsTrigger value="movements">Stock Movements</TabsTrigger>
            <TabsTrigger value="reservations">Reservations</TabsTrigger>
            <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="parts" className="space-y-3">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Compatible Types</TableHead>
                      <TableHead className="text-right">On Hand</TableHead>
                      <TableHead className="text-right">Reserved</TableHead>
                      <TableHead className="text-right">Damaged</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.loading ? <LoadingRows colSpan={10} /> : null}
                    {!inventory.loading && parts.length === 0 ? <EmptyRows colSpan={10} label="No parts found." /> : null}
                    {!inventory.loading && parts.map((part) => (
                      <TableRow key={part.id}>
                        <TableCell>
                          <div className="font-medium">{part.partCode}</div>
                          <div className="text-xs text-muted-foreground">{part.partName}</div>
                        </TableCell>
                        <TableCell>{part.categoryName || "-"}</TableCell>
                        <TableCell className="max-w-[220px]">
                          <div className="flex flex-wrap gap-1">
                            {part.compatibleVehicleTypes.length ? part.compatibleVehicleTypes.map((type) => (
                              <Badge key={type.id} variant="secondary">{type.name}</Badge>
                            )) : <span className="text-muted-foreground">All</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(part.totalStockOnHand)}</TableCell>
                        <TableCell className="text-right">{formatNumber(part.totalReservedQuantity)}</TableCell>
                        <TableCell className="text-right">{formatNumber(part.totalDamagedQuantity)}</TableCell>
                        <TableCell className="text-right">{formatNumber(part.totalAvailableQuantity)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(part.stockStatus)}>{part.stockStatusLabel}</Badge>
                        </TableCell>
                        <TableCell>{part.storageLocation || "-"}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" aria-label="View part" onClick={() => openPartView(part)}>
                              <Eye className="size-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Edit stock">
                                  <Wrench className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openMovementDialog(part, "Receiving")}>
                                  <PackagePlus className="mr-2 size-4" />
                                  Add Stock
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openMovementDialog(part, "Issue")}>
                                  <PackageMinus className="mr-2 size-4" />
                                  Reduce Stock
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openMovementDialog(part, "Adjustment")}>
                                  <Wrench className="mr-2 size-4" />
                                  Adjust Stock
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button variant="ghost" size="icon" aria-label="Edit part" onClick={() => setPartDialog({ open: true, item: part })}>
                              <Edit className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label="Reserve part" onClick={() => openReservationDialog(part)}>
                              <CalendarClock className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <PaginationControls
                  page={inventory.response.meta.page}
                  limit={inventory.response.meta.limit}
                  total={inventory.response.meta.total}
                  onPageChange={(page) => inventory.setFilters({ page })}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movements" className="space-y-3">
            <Card>
              <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle className="text-base">Stock Movements</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Input placeholder="Search movements" value={movements.filters.search} onChange={(event) => movements.setFilters({ search: event.target.value })} className="w-56" />
                  <NativeSelect value={movements.filters.movementType} onChange={(event) => movements.setFilters({ movementType: event.target.value as "all" | PartMovementType })}>
                    <NativeSelectOption value="all">All movement types</NativeSelectOption>
                    {movementTypes.map((type) => <NativeSelectOption key={type} value={type}>{type}</NativeSelectOption>)}
                  </NativeSelect>
                  <Button variant="outline" onClick={() => openMovementDialog(null, "Receiving")}>
                    <PackagePlus className="size-4" />
                    New Movement
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Movement</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Part</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Before</TableHead>
                      <TableHead className="text-right">After</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.loading ? <LoadingRows colSpan={10} /> : null}
                    {!movements.loading && movements.response.data.length === 0 ? <EmptyRows colSpan={10} label="No movements found." /> : null}
                    {!movements.loading && movements.response.data.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="font-medium">{movement.movementNo}</TableCell>
                        <TableCell>{formatDate(movement.movementAt)}</TableCell>
                        <TableCell>{movement.partName || movement.partCode || "-"}</TableCell>
                        <TableCell>{movement.branchId == null ? CENTRAL_OR_UNASSIGNED_LABEL : movement.branchName || "-"}</TableCell>
                        <TableCell><Badge variant="outline">{movement.movementType}</Badge></TableCell>
                        <TableCell className="text-right">{formatNumber(movement.quantity)}</TableCell>
                        <TableCell className="text-right">{formatNumber(movement.stockBefore)}</TableCell>
                        <TableCell className="text-right">{formatNumber(movement.stockAfter)}</TableCell>
                        <TableCell>{movement.vehiclePlate || "-"}</TableCell>
                        <TableCell>{movement.referenceNo || movement.reservationNo || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <PaginationControls
                  page={movements.response.meta.page}
                  limit={movements.response.meta.limit}
                  total={movements.response.meta.total}
                  onPageChange={(page) => movements.setFilters({ page })}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reservations" className="space-y-3">
            <Card>
              <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle className="text-base">Reservations</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Input placeholder="Search reservations" value={reservations.filters.search} onChange={(event) => reservations.setFilters({ search: event.target.value })} className="w-56" />
                  <NativeSelect value={reservations.filters.status} onChange={(event) => reservations.setFilters({ status: event.target.value })}>
                    <NativeSelectOption value="all">All statuses</NativeSelectOption>
                    <NativeSelectOption value="Reserved">Reserved</NativeSelectOption>
                    <NativeSelectOption value="Partially Issued">Partially Issued</NativeSelectOption>
                    <NativeSelectOption value="Issued">Issued</NativeSelectOption>
                    <NativeSelectOption value="Returned">Returned</NativeSelectOption>
                    <NativeSelectOption value="Cancelled">Cancelled</NativeSelectOption>
                  </NativeSelect>
                  <Button variant="outline" onClick={() => openReservationDialog(null)}>
                    <CalendarClock className="size-4" />
                    New Reservation
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reservation</TableHead>
                      <TableHead>Part</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead className="text-right">Reserved</TableHead>
                      <TableHead className="text-right">Issued</TableHead>
                      <TableHead className="text-right">Returned</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservations.loading ? <LoadingRows colSpan={10} /> : null}
                    {!reservations.loading && reservations.response.data.length === 0 ? <EmptyRows colSpan={10} label="No reservations found." /> : null}
                    {!reservations.loading && reservations.response.data.map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell>
                          <div className="font-medium">{reservation.reservationNo}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(reservation.neededAt)}</div>
                        </TableCell>
                        <TableCell>{reservation.partCode} {reservation.partName ? `- ${reservation.partName}` : ""}</TableCell>
                        <TableCell>{reservation.branchId == null ? CENTRAL_OR_UNASSIGNED_LABEL : reservation.branchName || "-"}</TableCell>
                        <TableCell>{reservation.vehiclePlate || "-"}</TableCell>
                        <TableCell className="text-right">{formatNumber(reservation.reservedQuantity)}</TableCell>
                        <TableCell className="text-right">{formatNumber(reservation.issuedQuantity)}</TableCell>
                        <TableCell className="text-right">{formatNumber(reservation.returnedQuantity)}</TableCell>
                        <TableCell className="text-right">{formatNumber(reservation.remainingQuantity)}</TableCell>
                        <TableCell><Badge variant={statusVariant(reservation.status)}>{reservation.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" disabled={reservation.remainingQuantity <= 0 || reservation.status === "Cancelled"} onClick={() => setReservationAction({ open: true, reservation, action: "issue" })}>
                              Issue
                            </Button>
                            <Button variant="ghost" size="sm" disabled={reservation.returnableQuantity <= 0 || reservation.status === "Cancelled"} onClick={() => setReservationAction({ open: true, reservation, action: "return" })}>
                              Return
                            </Button>
                            <Button variant="ghost" size="sm" disabled={reservation.status === "Cancelled" || reservation.remainingQuantity <= 0} onClick={() => setReservationAction({ open: true, reservation, action: "cancel" })}>
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <PaginationControls
                  page={reservations.response.meta.page}
                  limit={reservations.response.meta.limit}
                  total={reservations.response.meta.total}
                  onPageChange={(page) => reservations.setFilters({ page })}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="low-stock">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Low and Out-of-Stock Parts</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Minimum Quantity</TableHead>
                      <TableHead className="text-right">Shortage</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockLoading ? <LoadingRows colSpan={6} /> : null}
                    {!lowStockLoading && lowStockResponse.data.length === 0 ? <EmptyRows colSpan={6} label="No low-stock parts match the active filters." /> : null}
                    {!lowStockLoading && lowStockResponse.data.map((part) => (
                      <TableRow key={part.id}>
                        <TableCell>
                          <div className="font-medium">{part.partCode}</div>
                          <div className="text-xs text-muted-foreground">{part.partName}</div>
                        </TableCell>
                        <TableCell>{part.categoryName || "-"}</TableCell>
                        <TableCell className="text-right">{formatNumber(part.totalAvailableQuantity)}</TableCell>
                        <TableCell className="text-right">{formatNumber(part.minimumQuantity)}</TableCell>
                        <TableCell className="text-right">{formatNumber(Math.max(0, part.minimumQuantity - part.totalAvailableQuantity))}</TableCell>
                        <TableCell><Badge variant={statusVariant(part.stockStatus)}>{part.stockStatusLabel}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <PaginationControls
                  page={lowStockResponse.meta.page}
                  limit={lowStockResponse.meta.limit}
                  total={lowStockResponse.meta.total}
                  onPageChange={setLowStockPage}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-3">
            <Card>
              <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle className="text-base">Reports</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <NativeSelect value={reportType} onChange={(event) => setReportType(event.target.value)}>
                    <NativeSelectOption value="stock_on_hand">Stock on Hand</NativeSelectOption>
                    <NativeSelectOption value="low_stock">Low Stock</NativeSelectOption>
                    <NativeSelectOption value="out_of_stock">Out of Stock</NativeSelectOption>
                    <NativeSelectOption value="usage_by_vehicle">Usage by Vehicle</NativeSelectOption>
                    <NativeSelectOption value="usage_by_category">Usage by Category</NativeSelectOption>
                    <NativeSelectOption value="movement_audit">Movement Audit</NativeSelectOption>
                  </NativeSelect>
                  <Button variant="outline" onClick={loadReport} disabled={reportLoading}>
                    <FileText className="size-4" />
                    {reportLoading ? "Loading..." : "Load Report"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field 1</TableHead>
                      <TableHead>Field 2</TableHead>
                      <TableHead>Field 3</TableHead>
                      <TableHead>Field 4</TableHead>
                      <TableHead>Field 5</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportLoading ? <LoadingRows colSpan={5} /> : null}
                    {!reportLoading && !report ? <EmptyRows colSpan={5} label="Load a report to view results." /> : null}
                    {!reportLoading && report?.data.length === 0 ? <EmptyRows colSpan={5} label="No report rows found." /> : null}
                    {!reportLoading && report?.data.slice(0, 100).map((row, index) => {
                      const values = Object.values(row).slice(0, 5);
                      return (
                        <TableRow key={index}>
                          {Array.from({ length: 5 }).map((_, valueIndex) => (
                            <TableCell key={valueIndex}>{String(values[valueIndex] ?? "-")}</TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <PartDialog
          open={partDialog.open}
          part={partDialog.item}
          lookups={inventory.lookups}
          saving={inventory.saving}
          onOpenChange={(open) => setPartDialog((current) => ({ ...current, open }))}
          onSave={savePart}
          onCategoryCreate={async (name) => {
            const result = await api.createPartCategory(name);
            await inventory.refreshLookups();
            return result.data;
          }}
        />

        <PartViewDialog
          open={partViewOpen}
          part={partView}
          loading={partViewLoading}
          onOpenChange={(open) => {
            setPartViewOpen(open);
            if (!open) setPartView(null);
          }}
        />

        <MovementDialog
          state={movementDialog}
          lookups={inventory.lookups}
          parts={operationPartOptions}
          partsLoading={operationPartsLoading}
          partSearch={operationPartSearch}
          saving={movements.saving}
          onOpenChange={(open) => setMovementDialog((current) => ({ ...current, open }))}
          onPartSearchChange={setOperationPartSearch}
          onSave={saveMovement}
        />

        <ReservationDialog
          open={reservationDialog.open}
          part={reservationDialog.item}
          lookups={inventory.lookups}
          parts={operationPartOptions}
          partsLoading={operationPartsLoading}
          partSearch={operationPartSearch}
          saving={reservations.saving}
          onOpenChange={(open) => setReservationDialog((current) => ({ ...current, open }))}
          onPartSearchChange={setOperationPartSearch}
          onSave={saveReservation}
        />

        <ReservationActionDialog
          state={reservationAction}
          saving={reservations.saving}
          onOpenChange={(open) => setReservationAction((current) => ({ ...current, open }))}
          onSave={saveReservationAction}
        />
      </div>
    </div>
  );
}
