"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  Check,
  ChevronsUpDown,
  ClipboardList,
  Download,
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
  BranchStock,
  CreateMovementInput,
  CreatePartInput,
  CreateReservationInput,
  ManualPartMovementType,
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
  movementType: ManualPartMovementType;
};

type ReservationActionState = {
  open: boolean;
  reservation: PartReservationRow | null;
  action: "issue" | "return" | "cancel";
};

type PartDetailRow = PartInventoryRow & {
  recentMovements?: PartMovementRow[];
  activeReservations?: PartReservationRow[];
  issuedVehicles?: Array<{
    vehicleId: number | null;
    vehiclePlate: string | null;
    vehicleName: string | null;
    issuedQuantity: number;
    returnedQuantity: number;
    damagedQuantity: number;
    netUsedQuantity: number;
    latestMovementAt: string | null;
  }>;
};

type SharedUnitLookup = PartsLookupData["units"][number];

type ReportType =
  | "stock_on_hand"
  | "low_stock"
  | "out_of_stock"
  | "usage_by_vehicle"
  | "usage_by_category"
  | "movement_audit";

type ReportFilters = {
  branchId: string;
  vehicleId: string;
  categoryId: string;
  movementType: "all" | PartMovementType;
  dateFrom: string;
  dateTo: string;
};

type ReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
};

type ReportMetric = {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof summaryToneStyles;
};

const manualMovementTypes: ManualPartMovementType[] = ["Receiving", "Issue", "Return", "Adjustment", "Damage"];
const movementTypes: PartMovementType[] = [...manualMovementTypes, "Reservation"];
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

function formatDateOnly(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function dateInputDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function nowLocalDatetime() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function reportValue(row: Record<string, unknown>, key: string) {
  return row[key];
}

function reportNumber(row: Record<string, unknown>, key: string) {
  const value = reportValue(row, key);
  return typeof value === "number" ? value : Number(value || 0);
}

function reportText(row: Record<string, unknown>, key: string) {
  const value = reportValue(row, key);
  return value == null || value === "" ? "-" : String(value);
}

function categoryLabel(categoryName: string | null | undefined) {
  return categoryName?.trim() || "Uncategorized";
}

function stockStatusLabel(status: unknown) {
  if (status === "out_of_stock") return "Out of Stock";
  if (status === "low_stock") return "Low Stock";
  if (status === "available") return "Available";
  return reportText({ status }, "status");
}

function statusBadgeClasses(status: string) {
  const normalized = status.toLowerCase().replace(/\s+/g, "_");
  if (normalized === "available" || normalized === "returned") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  if (normalized === "low_stock" || normalized === "partially_issued") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  }
  if (normalized === "out_of_stock" || normalized === "cancelled") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300";
  }
  if (normalized === "reserved") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300";
  }
  if (normalized === "issued") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300";
  }
  return "border-muted bg-muted/40 text-muted-foreground";
}

function StatusBadge({ status, label }: { status: string; label: React.ReactNode }) {
  return (
    <Badge variant="outline" className={statusBadgeClasses(status)}>
      {label}
    </Badge>
  );
}

function movementDirection(stockBefore: number, stockAfter: number) {
  if (stockAfter > stockBefore) return "positive";
  if (stockAfter < stockBefore) return "negative";
  return "neutral";
}

function movementDirectionClasses(direction: ReturnType<typeof movementDirection>) {
  if (direction === "positive") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (direction === "negative") return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300";
  return "border-muted bg-muted/40 text-muted-foreground";
}

function movementDirectionTextClasses(direction: ReturnType<typeof movementDirection>) {
  if (direction === "positive") return "text-emerald-700 dark:text-emerald-300";
  if (direction === "negative") return "text-red-700 dark:text-red-300";
  return "text-muted-foreground";
}

function movementDisplaySnapshot(movement: PartMovementRow) {
  if (movement.movementType === "Reservation") {
    return {
      before: movement.stockBefore - movement.reservedBefore - movement.damagedBefore,
      after: movement.stockAfter - movement.reservedAfter - movement.damagedAfter,
    };
  }
  return {
    before: movement.stockBefore,
    after: movement.stockAfter,
  };
}

function reservationActionButtonClasses(action: "issue" | "return" | "cancel") {
  if (action === "issue") {
    return "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900 disabled:border-border disabled:bg-transparent disabled:text-muted-foreground dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50";
  }
  if (action === "return") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900 disabled:border-border disabled:bg-transparent disabled:text-muted-foreground dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50";
  }
  return "border-red-200 bg-red-50 text-red-800 hover:bg-red-100 hover:text-red-900 disabled:border-border disabled:bg-transparent disabled:text-muted-foreground dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50";
}

function reservationDisplayQuantities(reservation: PartReservationRow) {
  if (reservation.status === "Cancelled") {
    return {
      reserved: 0,
      issued: 0,
      returned: 0,
      remaining: 0,
    };
  }

  return {
    reserved: reservation.remainingQuantity,
    issued: Math.max(0, reservation.issuedQuantity - reservation.returnedQuantity),
    returned: reservation.returnedQuantity,
    remaining: reservation.remainingQuantity,
  };
}

function movementQuantityLabel(quantity: number, stockBefore: number, stockAfter: number) {
  const direction = movementDirection(stockBefore, stockAfter);
  const prefix = direction === "positive" ? "+" : direction === "negative" ? "-" : "";
  return `${prefix}${formatNumber(quantity)}`;
}

function MovementDirectionBadge({
  movementType,
  stockBefore,
  stockAfter,
}: {
  movementType: string;
  stockBefore: number;
  stockAfter: number;
}) {
  return (
    <Badge variant="outline" className={movementDirectionClasses(movementDirection(stockBefore, stockAfter))}>
      {movementType}
    </Badge>
  );
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

const inventoryReportColumns: ReportColumn[] = [
  { key: "partCode", label: "Part Code" },
  { key: "partName", label: "Part Name" },
  { key: "categoryName", label: "Category" },
  { key: "branchName", label: "Branch", render: (value) => value ? String(value) : CENTRAL_OR_UNASSIGNED_LABEL },
  { key: "stockOnHand", label: "On Hand", align: "right", render: (value) => formatNumber(Number(value || 0)) },
  { key: "reservedQuantity", label: "Reserved", align: "right", render: (value) => formatNumber(Number(value || 0)) },
  { key: "damagedQuantity", label: "Damaged", align: "right", render: (value) => formatNumber(Number(value || 0)) },
  { key: "availableQuantity", label: "Available", align: "right", render: (value) => formatNumber(Number(value || 0)) },
  { key: "minimumQuantity", label: "Minimum Qty", align: "right", render: (value) => formatNumber(Number(value || 0)) },
  { key: "stockStatus", label: "Status", render: (value) => <StatusBadge status={String(value)} label={stockStatusLabel(value)} /> },
];

const shortageReportColumns: ReportColumn[] = [
  ...inventoryReportColumns.slice(0, 4),
  { key: "availableQuantity", label: "Available", align: "right", render: (value) => formatNumber(Number(value || 0)) },
  { key: "minimumQuantity", label: "Minimum Qty", align: "right", render: (value) => formatNumber(Number(value || 0)) },
  { key: "shortageQuantity", label: "Shortage", align: "right", render: (value) => formatNumber(Number(value || 0)) },
  { key: "lastMovementAt", label: "Last Movement", render: (value) => formatDate(typeof value === "string" ? value : null) },
  { key: "stockStatus", label: "Status", render: (value) => <StatusBadge status={String(value)} label={stockStatusLabel(value)} /> },
];

const usageByVehicleColumns: ReportColumn[] = [
  { key: "vehiclePlate", label: "Vehicle", render: (_value, row) => [reportText(row, "vehiclePlate"), reportText(row, "vehicleName")].filter((value) => value !== "-").join(" - ") || "-" },
  { key: "partCode", label: "Part Code" },
  { key: "partName", label: "Part Name" },
  { key: "issuedQuantity", label: "Issued", align: "right", render: (value) => formatNumber(Number(value || 0)) },
  { key: "returnedQuantity", label: "Returned", align: "right", render: (value) => formatNumber(Number(value || 0)) },
  { key: "damagedQuantity", label: "Damaged", align: "right", render: (value) => formatNumber(Number(value || 0)) },
  { key: "netUsedQuantity", label: "Net Used", align: "right", render: (value) => formatNumber(Number(value || 0)) },
  { key: "latestMovementAt", label: "Latest Movement", render: (value) => formatDate(typeof value === "string" ? value : null) },
];

const usageByCategoryColumns: ReportColumn[] = [
  { key: "categoryName", label: "Category", render: (value) => value ? String(value) : "Uncategorized" },
  { key: "movementCount", label: "Movements", align: "right", render: (value) => formatNumber(Number(value || 0)) },
  { key: "issuedQuantity", label: "Issued", align: "right", render: (value) => formatNumber(Number(value || 0)) },
  { key: "returnedQuantity", label: "Returned", align: "right", render: (value) => formatNumber(Number(value || 0)) },
  { key: "netUsedQuantity", label: "Net Used", align: "right", render: (value) => formatNumber(Number(value || 0)) },
];

const movementAuditColumns: ReportColumn[] = [
  { key: "movementNo", label: "Movement No." },
  { key: "movementAt", label: "Movement Date", render: (value) => formatDate(typeof value === "string" ? value : null) },
  {
    key: "movementType",
    label: "Type",
    render: (value, row) => (
      <MovementDirectionBadge
        movementType={String(value || "-")}
        stockBefore={reportNumber(row, "stockBefore")}
        stockAfter={reportNumber(row, "stockAfter")}
      />
    ),
  },
  { key: "partName", label: "Part", render: (_value, row) => reportText(row, "partName") !== "-" ? reportText(row, "partName") : reportText(row, "partCode") },
  { key: "branchName", label: "Branch", render: (value) => value ? String(value) : CENTRAL_OR_UNASSIGNED_LABEL },
  { key: "vehiclePlate", label: "Vehicle" },
  {
    key: "quantity",
    label: "Qty",
    align: "right",
    render: (value, row) => (
      <span className={cn("font-medium", movementDirectionTextClasses(movementDirection(reportNumber(row, "stockBefore"), reportNumber(row, "stockAfter"))))}>
        {movementQuantityLabel(Number(value || 0), reportNumber(row, "stockBefore"), reportNumber(row, "stockAfter"))}
      </span>
    ),
  },
  { key: "stockBefore", label: "Before", align: "right", render: (value) => formatNumber(Number(value || 0)) },
  { key: "stockAfter", label: "After", align: "right", render: (value) => formatNumber(Number(value || 0)) },
  { key: "referenceNo", label: "Reference" },
];

const reportDefinitions: Record<ReportType, {
  label: string;
  description: string;
  columns: ReportColumn[];
  filters: Array<keyof ReportFilters>;
  metrics: (rows: Array<Record<string, unknown>>) => ReportMetric[];
}> = {
  stock_on_hand: {
    label: "Stock on Hand",
    description: "Current on-hand, reserved, damaged, and available quantities by part and branch.",
    columns: inventoryReportColumns,
    filters: ["branchId", "categoryId"],
    metrics: (rows) => [
      { title: "Report rows", value: rows.length, icon: FileText, tone: "info" },
      { title: "Available qty", value: formatNumber(rows.reduce((sum, row) => sum + reportNumber(row, "availableQuantity"), 0)), icon: ClipboardList, tone: "success" },
      { title: "Reserved qty", value: formatNumber(rows.reduce((sum, row) => sum + reportNumber(row, "reservedQuantity"), 0)), icon: CalendarClock, tone: "warning" },
      { title: "Damaged qty", value: formatNumber(rows.reduce((sum, row) => sum + reportNumber(row, "damagedQuantity"), 0)), icon: ShieldAlert, tone: "critical" },
    ],
  },
  low_stock: {
    label: "Minimum Quantity Action List",
    description: "Parts and branches at or below the configured minimum quantity.",
    columns: shortageReportColumns,
    filters: ["branchId", "categoryId"],
    metrics: (rows) => [
      { title: "Action rows", value: rows.length, icon: AlertTriangle, tone: "warning" },
      { title: "Shortage qty", value: formatNumber(rows.reduce((sum, row) => sum + reportNumber(row, "shortageQuantity"), 0)), icon: PackageMinus, tone: "critical" },
      { title: "Out of stock", value: rows.filter((row) => row.stockStatus === "out_of_stock").length, icon: ShieldAlert, tone: "critical" },
      { title: "Categories", value: new Set(rows.map((row) => reportText(row, "categoryName"))).size, icon: Boxes, tone: "info" },
    ],
  },
  out_of_stock: {
    label: "Out of Stock",
    description: "Parts and branches with no available quantity.",
    columns: shortageReportColumns,
    filters: ["branchId", "categoryId"],
    metrics: (rows) => [
      { title: "Out-of-stock rows", value: rows.length, icon: ShieldAlert, tone: "critical" },
      { title: "Shortage qty", value: formatNumber(rows.reduce((sum, row) => sum + reportNumber(row, "shortageQuantity"), 0)), icon: PackageMinus, tone: "critical" },
      { title: "Parts affected", value: new Set(rows.map((row) => reportText(row, "partCode"))).size, icon: Boxes, tone: "warning" },
      { title: "Branches affected", value: new Set(rows.map((row) => reportText(row, "branchName"))).size, icon: ClipboardList, tone: "info" },
    ],
  },
  usage_by_vehicle: {
    label: "Usage by Vehicle",
    description: "Issued, returned, damaged, and net used quantities grouped by vehicle and part.",
    columns: usageByVehicleColumns,
    filters: ["branchId", "vehicleId", "dateFrom", "dateTo"],
    metrics: (rows) => [
      { title: "Vehicle-part rows", value: rows.length, icon: FileText, tone: "info" },
      { title: "Issued qty", value: formatNumber(rows.reduce((sum, row) => sum + reportNumber(row, "issuedQuantity"), 0)), icon: PackageMinus, tone: "warning" },
      { title: "Returned qty", value: formatNumber(rows.reduce((sum, row) => sum + reportNumber(row, "returnedQuantity"), 0)), icon: PackagePlus, tone: "success" },
      { title: "Net used qty", value: formatNumber(rows.reduce((sum, row) => sum + reportNumber(row, "netUsedQuantity"), 0)), icon: Wrench, tone: "critical" },
    ],
  },
  usage_by_category: {
    label: "Usage by Category",
    description: "Issued, returned, and net used quantities grouped by part category.",
    columns: usageByCategoryColumns,
    filters: ["branchId", "categoryId", "dateFrom", "dateTo"],
    metrics: (rows) => [
      { title: "Categories", value: rows.length, icon: Boxes, tone: "info" },
      { title: "Movements", value: formatNumber(rows.reduce((sum, row) => sum + reportNumber(row, "movementCount"), 0)), icon: FileText, tone: "info" },
      { title: "Issued qty", value: formatNumber(rows.reduce((sum, row) => sum + reportNumber(row, "issuedQuantity"), 0)), icon: PackageMinus, tone: "warning" },
      { title: "Net used qty", value: formatNumber(rows.reduce((sum, row) => sum + reportNumber(row, "netUsedQuantity"), 0)), icon: Wrench, tone: "critical" },
    ],
  },
  movement_audit: {
    label: "Movement Audit",
    description: "Detailed stock movement log for audit and reconciliation checks.",
    columns: movementAuditColumns,
    filters: ["branchId", "vehicleId", "movementType", "dateFrom", "dateTo"],
    metrics: (rows) => [
      { title: "Movements", value: rows.length, icon: FileText, tone: "info" },
      { title: "Total qty", value: formatNumber(rows.reduce((sum, row) => sum + reportNumber(row, "quantity"), 0)), icon: ClipboardList, tone: "info" },
      { title: "Issue rows", value: rows.filter((row) => row.movementType === "Issue").length, icon: PackageMinus, tone: "warning" },
      { title: "Latest movement", value: formatDateOnly(rows.reduce<string | null>((latest, row) => {
        const value = typeof row.movementAt === "string" ? row.movementAt : null;
        if (!value) return latest;
        if (!latest) return value;
        return new Date(value).getTime() > new Date(latest).getTime() ? value : latest;
      }, null)) || "-", icon: CalendarClock, tone: "success" },
    ],
  },
};

function reportExportValue(column: ReportColumn, row: Record<string, unknown>) {
  const value = reportValue(row, column.key);
  if (column.key === "branchName") return value ? String(value) : CENTRAL_OR_UNASSIGNED_LABEL;
  if (column.key === "stockStatus") return stockStatusLabel(value);
  if (column.key === "movementAt" || column.key === "lastMovementAt" || column.key === "latestMovementAt") return formatDate(typeof value === "string" ? value : null);
  if (column.key === "vehiclePlate") {
    const vehicle = [reportText(row, "vehiclePlate"), reportText(row, "vehicleName")]
      .filter((item) => item !== "-")
      .join(" - ");
    return vehicle || "-";
  }
  if (column.key === "partName") return reportText(row, "partName") !== "-" ? reportText(row, "partName") : reportText(row, "partCode");
  if (typeof value === "number") return value;
  return reportText(row, column.key);
}

function downloadExcel(filename: string, sheetName: string, columns: ReportColumn[], rows: Array<Record<string, unknown>>) {
  const exportRows = rows.map((row) => Object.fromEntries(
    columns.map((column) => [column.label, reportExportValue(column, row)]),
  ));
  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, filename);
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
  onUnitCreate,
}: {
  open: boolean;
  part: PartInventoryRow | null;
  lookups: PartsLookupData;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: CreatePartInput, partId?: number) => Promise<void>;
  onCategoryCreate: (name: string) => Promise<{ id: number; code: string | null; name: string; description: string | null }>;
  onUnitCreate: (payload: { unitName: string; unitShortcut: string; skuCode?: string | null; order?: number | null }) => Promise<SharedUnitLookup>;
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
  const [unitOpen, setUnitOpen] = React.useState(false);
  const [unitSearch, setUnitSearch] = React.useState("");
  const [unitDialogOpen, setUnitDialogOpen] = React.useState(false);
  const [creatingUnit, setCreatingUnit] = React.useState(false);

  const selectedCategory = lookups.categories.find((cat) => String(cat.id) === form.categoryId);
  const selectedUnit = lookups.units.find((unit) => {
    const value = form.unit.trim().toLowerCase();
    return unit.shortcut.toLowerCase() === value || unit.name.toLowerCase() === value;
  });
  const canCreateCategory = categorySearch.trim().length > 0
    && !lookups.categories.some((cat) => cat.name.toLowerCase() === categorySearch.trim().toLowerCase());
  const canCreateUnit = unitSearch.trim().length > 0
    && !lookups.units.some((unit) => {
      const search = unitSearch.trim().toLowerCase();
      return unit.name.toLowerCase() === search || unit.shortcut.toLowerCase() === search;
    });
  const allVehicleTypesSelected = lookups.vehicleTypes.length > 0
    && lookups.vehicleTypes.every((type) => compatibleTypeIds.includes(type.id));

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
    setUnitSearch("");
  }, [open, part]);

  React.useEffect(() => {
    if (!open || part) return;
    api.fetchNextPartCode()
      .then((result) => setForm((current) => ({ ...current, partCode: result.data.partCode })))
      .catch(() => {});
  }, [open, part]);

  function update(key: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleType(typeId: number, checked: boolean) {
    setCompatibleTypeIds((current) =>
      checked ? Array.from(new Set([...current, typeId])) : current.filter((id) => id !== typeId),
    );
  }

  function selectAllVehicleTypes() {
    setCompatibleTypeIds(lookups.vehicleTypes.map((type) => type.id));
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

  async function handleCreateUnit(payload: { unitName: string; unitShortcut: string; skuCode?: string | null; order?: number | null }) {
    if (creatingUnit) return;
    setCreatingUnit(true);
    try {
      const created = await onUnitCreate(payload);
      update("unit", created.shortcut);
      setUnitDialogOpen(false);
      setUnitOpen(false);
      setUnitSearch("");
      toast.success(`Unit "${created.name}" created`);
    } catch (error) {
      toast.error("Failed to create unit", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setCreatingUnit(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const initialStockValue = Number(form.initialStock || 0);
    await onSave(
      {
        partName: form.partName,
        categoryId: nullableNumber(form.categoryId),
        unit: form.unit.trim(),
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
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{part ? "Edit Part" : "Add Part"}</DialogTitle>
          <DialogDescription>Maintain the fleet part master record and vehicle compatibility.</DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="partName">Part name</Label>
              <Input id="partName" value={form.partName} onChange={(event) => update("partName", event.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partCode">Part code</Label>
              <Input id="partCode" value={form.partCode || (part ? "" : "Generating...")} disabled />
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
              <Popover open={unitOpen} onOpenChange={setUnitOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="unit"
                    variant="outline"
                    role="combobox"
                    aria-expanded={unitOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedUnit ? `${selectedUnit.name} (${selectedUnit.shortcut})` : form.unit || unitSearch || "Select unit"}
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search units..."
                      value={unitSearch}
                      onValueChange={setUnitSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {canCreateUnit ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="w-full justify-start gap-2 text-sm"
                            onClick={() => {
                              setUnitOpen(false);
                              setUnitDialogOpen(true);
                            }}
                          >
                            <Plus className="size-4" />
                            <span>New Unit</span>
                            <span className="truncate">{unitSearch.trim()}</span>
                          </Button>
                        ) : (
                          "No units found"
                        )}
                      </CommandEmpty>
                      <CommandGroup>
                        {form.unit && !selectedUnit ? (
                          <CommandItem
                            value={form.unit}
                            onSelect={() => {
                              setUnitOpen(false);
                              setUnitSearch("");
                            }}
                          >
                            <Check className="mr-2 size-4 opacity-100" />
                            {form.unit}
                          </CommandItem>
                        ) : null}
                        {lookups.units.map((unit) => (
                          <CommandItem
                            key={unit.id}
                            value={`${unit.name} ${unit.shortcut}`}
                            onSelect={() => {
                              update("unit", unit.shortcut);
                              setUnitOpen(false);
                              setUnitSearch("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-4",
                                selectedUnit?.id === unit.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <span>{unit.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">({unit.shortcut})</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
            <div className="flex items-center justify-between gap-3">
              <Label>Compatible vehicle types</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-2"
                disabled={lookups.vehicleTypes.length === 0 || allVehicleTypesSelected}
                onClick={selectAllVehicleTypes}
              >
                <Check className="size-4" />
                Select all
              </Button>
            </div>
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
    <CreateSharedUnitDialog
      open={unitDialogOpen}
      initialName={unitSearch.trim()}
      saving={creatingUnit}
      onOpenChange={setUnitDialogOpen}
      onCreate={handleCreateUnit}
    />
    </>
  );
}

function suggestedUnitShortcut(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.map((word) => word[0]).join("").toLowerCase().slice(0, 8);
  return name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 8);
}

function CreateSharedUnitDialog({
  open,
  initialName,
  saving,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  initialName: string;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: { unitName: string; unitShortcut: string; skuCode?: string | null; order?: number | null }) => Promise<void>;
}) {
  const [form, setForm] = React.useState({
    unitName: "",
    unitShortcut: "",
    skuCode: "",
    order: "0",
  });

  React.useEffect(() => {
    if (!open) return;
    setForm({
      unitName: initialName,
      unitShortcut: suggestedUnitShortcut(initialName),
      skuCode: "",
      order: "0",
    });
  }, [open, initialName]);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await onCreate({
      unitName: form.unitName,
      unitShortcut: form.unitShortcut,
      skuCode: form.skuCode || null,
      order: Number(form.order || 0),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Unit</DialogTitle>
          <DialogDescription>Add a shared unit of measurement for fleet parts and other SCM modules.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="sharedUnitName">Unit name</Label>
              <Input id="sharedUnitName" value={form.unitName} onChange={(event) => update("unitName", event.target.value)} placeholder="e.g. Piece" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sharedUnitShortcut">Shortcut</Label>
              <Input id="sharedUnitShortcut" value={form.unitShortcut} onChange={(event) => update("unitShortcut", event.target.value)} placeholder="e.g. pc" required />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="sharedUnitSkuCode">Unit code</Label>
              <Input id="sharedUnitSkuCode" value={form.skuCode} onChange={(event) => update("skuCode", event.target.value)} placeholder="Optional" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sharedUnitOrder">Sort order</Label>
              <Input id="sharedUnitOrder" type="number" min="0" step="1" value={form.order} onChange={(event) => update("order", event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Unit"}
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
  const activeReservations = part?.activeReservations || [];
  const issuedVehicles = part?.issuedVehicles || [];

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
              <DetailItem label="Category" value={categoryLabel(part.categoryName)} />
              <DetailItem label="Unit" value={part.unit} />
              <DetailItem label="Minimum Quantity" value={formatNumber(part.minimumQuantity)} />
              <DetailItem label="Storage Location" value={part.storageLocation} />
              <DetailItem label="Status" value={<StatusBadge status={part.stockStatus} label={part.stockStatusLabel} />} />
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
              <div className="text-sm font-medium">Active Reservations</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reservation</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Issued</TableHead>
                    <TableHead className="text-right">Returned</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeReservations.length === 0 ? <EmptyRows colSpan={7} label="No active reservations found." /> : null}
                  {activeReservations.map((reservation) => {
                    const displayQuantities = reservationDisplayQuantities(reservation);
                    return (
                      <TableRow key={reservation.id}>
                        <TableCell>
                          <div className="font-medium">{reservation.reservationNo}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(reservation.neededAt)}</div>
                        </TableCell>
                        <TableCell>{[reservation.vehiclePlate, reservation.vehicleName].filter(Boolean).join(" - ") || "-"}</TableCell>
                        <TableCell>{reservation.branchId == null ? CENTRAL_OR_UNASSIGNED_LABEL : reservation.branchName || "-"}</TableCell>
                        <TableCell className="text-right">{formatNumber(displayQuantities.reserved)}</TableCell>
                        <TableCell className="text-right">{formatNumber(displayQuantities.issued)}</TableCell>
                        <TableCell className="text-right">{formatNumber(displayQuantities.returned)}</TableCell>
                        <TableCell><StatusBadge status={reservation.status} label={reservation.status} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Issued Vehicles</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead className="text-right">Issued</TableHead>
                    <TableHead className="text-right">Returned</TableHead>
                    <TableHead className="text-right">Damaged</TableHead>
                    <TableHead className="text-right">Net Used</TableHead>
                    <TableHead>Latest Movement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issuedVehicles.length === 0 ? <EmptyRows colSpan={6} label="No issued vehicles found." /> : null}
                  {issuedVehicles.map((vehicle) => (
                    <TableRow key={vehicle.vehicleId ?? `${vehicle.vehiclePlate}-${vehicle.vehicleName}`}>
                      <TableCell>
                        {[vehicle.vehiclePlate, vehicle.vehicleName].filter(Boolean).join(" - ") || "-"}
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(vehicle.issuedQuantity)}</TableCell>
                      <TableCell className="text-right">{formatNumber(vehicle.returnedQuantity)}</TableCell>
                      <TableCell className="text-right">{formatNumber(vehicle.damagedQuantity)}</TableCell>
                      <TableCell className="text-right">{formatNumber(vehicle.netUsedQuantity)}</TableCell>
                      <TableCell>{formatDate(vehicle.latestMovementAt)}</TableCell>
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
                  {movements.map((movement) => {
                    const snapshot = movementDisplaySnapshot(movement);
                    return (
                      <TableRow key={movement.id}>
                        <TableCell className="font-medium">{movement.movementNo}</TableCell>
                        <TableCell>{formatDate(movement.movementAt)}</TableCell>
                        <TableCell>{movement.branchId == null ? CENTRAL_OR_UNASSIGNED_LABEL : movement.branchName || "-"}</TableCell>
                        <TableCell>
                          <MovementDirectionBadge
                            movementType={String(movement.movementType)}
                            stockBefore={snapshot.before}
                            stockAfter={snapshot.after}
                          />
                        </TableCell>
                        <TableCell className={cn("text-right font-medium", movementDirectionTextClasses(movementDirection(snapshot.before, snapshot.after)))}>
                          {movementQuantityLabel(movement.quantity, snapshot.before, snapshot.after)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

function movementLabel(type: ManualPartMovementType) {
  if (type === "Receiving") return "Add Stock";
  if (type === "Issue") return "Reduce Stock";
  return `${type} Movement`;
}

function isStockDeduction(type: ManualPartMovementType, adjustmentDirection: "IN" | "OUT") {
  return type === "Issue" || type === "Damage" || (type === "Adjustment" && adjustmentDirection === "OUT");
}

function branchValue(branchId: number | null) {
  return branchId == null ? "" : String(branchId);
}

type PickerOption = {
  value: string;
  label: string;
  keywords?: string;
};

function SearchablePicker({
  id,
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled,
  searchValue,
  onSearchChange,
  onChange,
}: {
  id: string;
  value: string;
  options: PickerOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  disabled?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{selectedOption?.label || placeholder}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={onSearchChange}
          />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value || "empty-option"}
                  value={[option.label, option.keywords || ""].join(" ")}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function branchOptionsFromStocks(stocks: BranchStock[]): PickerOption[] {
  return stocks.map((stock) => ({
    value: branchValue(stock.branchId),
    label: `${stock.branchId == null ? CENTRAL_OR_UNASSIGNED_LABEL : stock.branchName || "-"} - Available: ${formatNumber(stock.availableQuantity)}`,
    keywords: `${stock.branchName || ""} ${stock.availableQuantity}`,
  }));
}

function branchOptionsFromLookups(branches: PartsLookupData["branches"]): PickerOption[] {
  return [
    { value: "", label: CENTRAL_OR_UNASSIGNED_LABEL },
    ...branches.map((branch) => ({
      value: String(branch.id),
      label: branch.name,
      keywords: `${branch.code || ""} ${branch.name}`,
    })),
  ];
}

function partOptionLabel(part: PartInventoryRow) {
  return `${part.partCode || `Part #${part.id}`} - ${part.partName || "Unnamed part"}`;
}

function partOptionsFromRows(parts: PartInventoryRow[]): PickerOption[] {
  return parts.map((part) => ({
    value: String(part.id),
    label: partOptionLabel(part),
    keywords: `${part.partCode} ${part.partName} ${part.categoryName || ""} ${part.storageLocation || ""}`,
  }));
}

function vehicleOptionsFromLookups(vehicles: PartsLookupData["vehicles"], includeNoVehicle: boolean): PickerOption[] {
  return [
    ...(includeNoVehicle ? [{ value: "", label: "No vehicle" }] : []),
    ...vehicles.map((vehicle) => ({
      value: String(vehicle.id),
      label: `${vehicle.plateNo}${vehicle.name ? ` - ${vehicle.name}` : ""}`,
      keywords: `${vehicle.plateNo} ${vehicle.name || ""}`,
    })),
  ];
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
    movementAt: nowLocalDatetime(),
  });
  const [referenceLoading, setReferenceLoading] = React.useState(false);

  React.useEffect(() => {
    if (!state.open) return;
    const defaultStock = state.part?.branchStock.find((stock) => stock.availableQuantity > 0) || state.part?.branchStock[0];
    setForm({
      partId: state.part ? String(state.part.id) : "",
      branchId: defaultStock ? branchValue(defaultStock.branchId) : "",
      movementType: state.movementType,
      adjustmentDirection: "IN",
      quantity: "",
      vehicleId: "",
      referenceNo: "",
      reasonCode: "",
      remarks: "",
      movementAt: nowLocalDatetime(),
    });
  }, [state.open, state.part, state.movementType]);

  React.useEffect(() => {
    if (!state.open) return;
    let cancelled = false;
    setReferenceLoading(true);
    setForm((current) => ({ ...current, referenceNo: "" }));
    api.fetchNextMovementReference(form.movementType)
      .then((result) => {
        if (!cancelled) {
          setForm((current) => ({ ...current, referenceNo: result.data.referenceNo }));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error("Unable to generate movement reference", {
            description: error instanceof Error ? error.message : String(error),
          });
        }
      })
      .finally(() => {
        if (!cancelled) setReferenceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.movementType, state.open]);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const selectedPart = React.useMemo(
    () => state.part || parts.find((part) => String(part.id) === form.partId) || null,
    [form.partId, parts, state.part],
  );
  const deductsStock = isStockDeduction(form.movementType, form.adjustmentDirection);
  const availableBranchStock = React.useMemo(
    () => selectedPart?.branchStock.filter((stock) => stock.availableQuantity > 0) || [],
    [selectedPart],
  );
  const branchOptions = deductsStock ? availableBranchStock : null;
  const hasAvailableStockForDeduction = !deductsStock || availableBranchStock.length > 0;
  const movementBranchOptions = branchOptions
    ? branchOptionsFromStocks(branchOptions)
    : branchOptionsFromLookups(lookups.branches);
  const movementVehicleOptions = vehicleOptionsFromLookups(lookups.vehicles, true);
  const movementPartOptions = partOptionsFromRows(mergePartOptions(parts, state.part));

  React.useEffect(() => {
    if (!state.open || !selectedPart || !deductsStock) return;
    const currentBranchIsAvailable = availableBranchStock.some((stock) => branchValue(stock.branchId) === form.branchId);
    if (!currentBranchIsAvailable) {
      setForm((current) => ({
        ...current,
        branchId: availableBranchStock[0] ? branchValue(availableBranchStock[0].branchId) : "",
      }));
    }
  }, [availableBranchStock, deductsStock, form.branchId, selectedPart, state.open]);

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
  const selectedBranchStock = React.useMemo(() => {
    if (!selectedPart) return null;
    return selectedPart.branchStock.find((s) => branchValue(s.branchId) === form.branchId) || null;
  }, [selectedPart, form.branchId]);
  const currentStockOnHand = selectedPart ? selectedBranchStock?.stockOnHand ?? 0 : null;
  const currentAvailable = selectedPart ? selectedBranchStock?.availableQuantity ?? 0 : null;
  const currentDamaged = selectedPart ? selectedBranchStock?.damagedQuantity ?? 0 : null;
  const qty = Number(form.quantity) || 0;
  const quantityPreview = React.useMemo(() => {
    if (!selectedPart || qty <= 0 || currentStockOnHand == null || currentAvailable == null || currentDamaged == null) return null;

    let stockAfter = currentStockOnHand;
    let availableAfter = currentAvailable;
    let damagedAfter = currentDamaged;
    let title = "Quantity adjustment";
    let tone: "increase" | "decrease" | "damage" = "increase";

    if (form.movementType === "Receiving" || form.movementType === "Return" || (form.movementType === "Adjustment" && form.adjustmentDirection === "IN")) {
      stockAfter += qty;
      availableAfter += qty;
      title = form.movementType === "Receiving" ? "Stock will increase" : form.movementType === "Return" ? "Returned stock will increase inventory" : "Adjustment will increase stock";
      tone = "increase";
    } else if (form.movementType === "Issue" || (form.movementType === "Adjustment" && form.adjustmentDirection === "OUT")) {
      stockAfter -= qty;
      availableAfter -= qty;
      title = form.movementType === "Issue" ? "Stock will decrease" : "Adjustment will decrease stock";
      tone = "decrease";
    } else if (form.movementType === "Damage") {
      damagedAfter += qty;
      availableAfter -= qty;
      title = "Damaged quantity will increase";
      tone = "damage";
    }

    const invalid = stockAfter < 0 || availableAfter < 0 || damagedAfter < 0;

    return {
      title,
      tone,
      invalid,
      rows: [
        { label: "Stock on hand", before: currentStockOnHand, after: stockAfter },
        { label: "Available", before: currentAvailable, after: availableAfter },
        { label: "Damaged", before: currentDamaged, after: damagedAfter, show: form.movementType === "Damage" || currentDamaged !== damagedAfter },
      ].filter((row) => row.show !== false),
    };
  }, [currentAvailable, currentDamaged, currentStockOnHand, form.adjustmentDirection, form.movementType, qty, selectedPart]);

  function movementGuidance(type: ManualPartMovementType): string {
    if (type === "Receiving") return "Use this to record received parts or verified stock additions. On-hand quantity at the selected branch will increase.";
    if (type === "Issue") return "Use this when issuing parts to a vehicle, repair job, or other traceable use. Available stock will be deducted and an Issued reservation entry will be created.";
    if (type === "Return") return "Return unused or excess parts back to inventory. On-hand quantity will be restored.";
    if (type === "Adjustment") return "Correct stock discrepancies discovered during cycle counts or audits. Provide a reason code and remarks.";
    if (type === "Damage") return "Record parts that are damaged, expired, or otherwise unsellable. Damaged quantity will increase.";
    return "";
  }

  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{movementLabel(form.movementType)}</DialogTitle>
          <DialogDescription>{movementGuidance(form.movementType)}</DialogDescription>
        </DialogHeader>

        {quantityPreview ? (
          <div className={cn(
            "rounded-md border px-3 py-2 text-sm",
            quantityPreview.invalid
              ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
              : quantityPreview.tone === "increase"
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20"
                : quantityPreview.tone === "damage"
                  ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                  : "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20",
          )}>
            <div className="font-medium">{quantityPreview.invalid ? "Quantity adjustment needs review" : quantityPreview.title}</div>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
              {quantityPreview.rows.map((row) => {
                const direction = row.after > row.before ? "positive" : row.after < row.before ? "negative" : "neutral";
                return (
                  <div key={row.label} className="rounded border border-border/60 bg-background/70 px-2 py-1.5">
                    <div className="text-[11px] font-medium text-muted-foreground">{row.label}</div>
                    <div className="mt-0.5 text-sm font-semibold">
                      {formatNumber(row.before)}
                      <span className="mx-1 text-muted-foreground">to</span>
                      <span className={movementDirectionTextClasses(direction)}>{formatNumber(row.after)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {quantityPreview.invalid ? (
              <div className="mt-2 text-xs font-medium">This change would result in a negative quantity and should not be saved.</div>
            ) : null}
          </div>
        ) : null}

        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="movementPart">Part</Label>
              <SearchablePicker
                id="movementPart"
                value={form.partId}
                options={movementPartOptions}
                placeholder="Select part"
                searchPlaceholder="Search by part code, name, category, or product..."
                emptyLabel={partsLoading ? "Loading part options..." : "No parts found"}
                disabled={!!state.part}
                searchValue={state.part ? undefined : partSearch}
                onSearchChange={state.part ? undefined : onPartSearchChange}
                onChange={(value) => update("partId", value)}
              />
              {partsLoading && <div className="text-xs text-muted-foreground">Loading part options...</div>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="movementType">Movement type</Label>
              <NativeSelect id="movementType" value={form.movementType} onChange={(event) => update("movementType", event.target.value)} className="w-full">
                {manualMovementTypes.map((type) => (
                  <NativeSelectOption key={type} value={type}>
                    {type}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="movementBranch">Branch</Label>
              <SearchablePicker
                id="movementBranch"
                value={form.branchId}
                options={movementBranchOptions}
                placeholder={branchOptions && !branchOptions.length ? "No available stock" : "Select branch"}
                searchPlaceholder="Search branches..."
                emptyLabel="No branches found"
                disabled={branchOptions != null && branchOptions.length === 0}
                onChange={(value) => update("branchId", value)}
              />
              {selectedPart && !hasAvailableStockForDeduction ? (
                <div className="text-xs text-destructive">No available stock for this part.</div>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="movementQuantity">Quantity</Label>
              <Input id="movementQuantity" type="number" min="0.01" step="0.01" value={form.quantity} onChange={(event) => update("quantity", event.target.value)} required />
              {selectedPart && currentAvailable != null ? (
                <div className="text-xs text-muted-foreground">
                  Available at selected branch: <strong>{formatNumber(currentAvailable)}</strong>
                </div>
              ) : null}
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
                <SearchablePicker
                  id="movementVehicle"
                  value={form.vehicleId}
                  options={movementVehicleOptions}
                  placeholder="No vehicle"
                  searchPlaceholder="Search vehicles..."
                  emptyLabel="No vehicles found"
                  onChange={(value) => update("vehicleId", value)}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="referenceNo">Reference no</Label>
              <Input id="referenceNo" value={referenceLoading ? "Generating..." : form.referenceNo} disabled />
              <div className="text-xs text-muted-foreground">System-generated and locked for this movement.</div>
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
            {!requiresReason ? (
              <div className="text-xs text-muted-foreground">Optional. Add notes about the source or reason for this movement.</div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || referenceLoading || !form.partId || !form.referenceNo || !hasAvailableStockForDeduction}>
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

  const selectedPart = React.useMemo(
    () => part || parts.find((row) => String(row.id) === form.partId) || null,
    [form.partId, part, parts],
  );
  const selectedBranchStock = React.useMemo(() => {
    if (!selectedPart) return null;
    return selectedPart.branchStock.find((stock) => branchValue(stock.branchId) === form.branchId) || null;
  }, [form.branchId, selectedPart]);
  const reservationQuantity = Number(form.quantity) || 0;
  const reservationPreview = React.useMemo(() => {
    if (!selectedPart) return null;
    const availableBefore = selectedBranchStock?.availableQuantity ?? 0;
    const reservedBefore = selectedBranchStock?.reservedQuantity ?? 0;
    const reservedAfter = reservedBefore + Math.max(0, reservationQuantity);
    const availableAfter = availableBefore - Math.max(0, reservationQuantity);
    return {
      availableBefore,
      availableAfter,
      reservedBefore,
      reservedAfter,
      invalid: !selectedBranchStock || (reservationQuantity > 0 && availableAfter < 0),
    };
  }, [reservationQuantity, selectedBranchStock, selectedPart]);
  const reservationBranchOptions = branchOptionsFromLookups(lookups.branches);
  const reservationVehicleOptions = vehicleOptionsFromLookups(lookups.vehicles, false);
  const reservationPartOptions = partOptionsFromRows(mergePartOptions(parts, part));

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
        {reservationPreview ? (
          <div className={cn(
            "rounded-md border px-3 py-2 text-sm",
            reservationPreview.invalid
              ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
              : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20",
          )}>
            <div className="font-medium">{reservationPreview.invalid ? "Reservation quantity needs review" : "Available stock will decrease"}</div>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              <div className="rounded border border-border/60 bg-background/70 px-2 py-1.5">
                <div className="text-[11px] font-medium text-muted-foreground">Available</div>
                <div className="mt-0.5 text-sm font-semibold">
                  {formatNumber(reservationPreview.availableBefore)}
                  <span className="mx-1 text-muted-foreground">to</span>
                  <span className={movementDirectionTextClasses(movementDirection(reservationPreview.availableBefore, reservationPreview.availableAfter))}>{formatNumber(reservationPreview.availableAfter)}</span>
                </div>
              </div>
              <div className="rounded border border-border/60 bg-background/70 px-2 py-1.5">
                <div className="text-[11px] font-medium text-muted-foreground">Reserved</div>
                <div className="mt-0.5 text-sm font-semibold">
                  {formatNumber(reservationPreview.reservedBefore)}
                  <span className="mx-1 text-muted-foreground">to</span>
                  <span className={movementDirectionTextClasses(movementDirection(reservationPreview.reservedBefore, reservationPreview.reservedAfter))}>{formatNumber(reservationPreview.reservedAfter)}</span>
                </div>
              </div>
            </div>
            {reservationPreview.invalid ? (
              <div className="mt-2 text-xs font-medium">{selectedBranchStock ? "This reservation would exceed available stock." : "No stock row exists for the selected part and branch."}</div>
            ) : null}
          </div>
        ) : null}
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="reservationPart">Part</Label>
              <SearchablePicker
                id="reservationPart"
                value={form.partId}
                options={reservationPartOptions}
                placeholder="Select part"
                searchPlaceholder="Search by part code, name, category, or product..."
                emptyLabel={partsLoading ? "Loading part options..." : "No parts found"}
                disabled={!!part}
                searchValue={part ? undefined : partSearch}
                onSearchChange={part ? undefined : onPartSearchChange}
                onChange={(value) => update("partId", value)}
              />
              {partsLoading && <div className="text-xs text-muted-foreground">Loading part options...</div>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reservationBranch">Branch</Label>
              <SearchablePicker
                id="reservationBranch"
                value={form.branchId}
                options={reservationBranchOptions}
                placeholder="Select branch"
                searchPlaceholder="Search branches..."
                emptyLabel="No branches found"
                onChange={(value) => update("branchId", value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reservationVehicle">Vehicle</Label>
              <SearchablePicker
                id="reservationVehicle"
                value={form.vehicleId}
                options={reservationVehicleOptions}
                placeholder="Select vehicle"
                searchPlaceholder="Search vehicles..."
                emptyLabel="No vehicles found"
                onChange={(value) => update("vehicleId", value)}
              />
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
            <Button type="submit" disabled={saving || !form.partId || !form.vehicleId || !!reservationPreview?.invalid}>
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
  const [referenceLoading, setReferenceLoading] = React.useState(false);

  React.useEffect(() => {
    if (!state.open) return;
    setReferenceLoading(false);
    const reservation = state.reservation;
    const defaultQuantity = state.action === "issue"
      ? reservation?.remainingQuantity
      : state.action === "return"
        ? reservation?.returnableQuantity
        : reservation?.remainingQuantity;
    setForm({
      quantity: defaultQuantity ? String(defaultQuantity) : "",
      referenceNo: "",
      remarks: "",
      cancelReason: "",
    });
  }, [state.open, state.action, state.reservation]);

  React.useEffect(() => {
    if (!state.open || state.action === "cancel") return;
    let cancelled = false;
    const movementType = state.action === "issue" ? "Issue" : "Return";
    setReferenceLoading(true);
    setForm((current) => ({ ...current, referenceNo: "" }));
    api.fetchNextMovementReference(movementType)
      .then((result) => {
        if (!cancelled) {
          setForm((current) => ({ ...current, referenceNo: result.data.referenceNo }));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error("Unable to generate movement reference", {
            description: error instanceof Error ? error.message : String(error),
          });
        }
      })
      .finally(() => {
        if (!cancelled) setReferenceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [state.action, state.open]);

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
      referenceNo: state.action === "cancel" ? null : form.referenceNo || null,
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
          {state.action !== "cancel" && (
            <div className="grid gap-2">
              <Label htmlFor="actionReference">Reference no</Label>
              <Input id="actionReference" value={referenceLoading ? "Generating..." : form.referenceNo} disabled />
              <div className="text-xs text-muted-foreground">System-generated and locked for this movement.</div>
            </div>
          )}
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
            <Button type="submit" disabled={saving || (state.action !== "cancel" && (referenceLoading || !form.referenceNo))} variant={state.action === "cancel" ? "destructive" : "default"}>
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
  const [reportType, setReportType] = React.useState<ReportType>("stock_on_hand");
  const [reportFilters, setReportFilters] = React.useState<ReportFilters>({
    branchId: "",
    vehicleId: "",
    categoryId: "",
    movementType: "all",
    dateFrom: dateInputDaysAgo(30),
    dateTo: todayDateInput(),
  });
  const [report, setReport] = React.useState<ReportResponse | null>(null);
  const [reportLoading, setReportLoading] = React.useState(false);
  const [reportPage, setReportPage] = React.useState(1);
  const [lowStockResponse, setLowStockResponse] = React.useState<PartsInventoryListResponse>(emptyPartsResponse);
  const [lowStockLoading, setLowStockLoading] = React.useState(false);
  const [lowStockPage, setLowStockPage] = React.useState(1);
  const [lowStockReloadKey, setLowStockReloadKey] = React.useState(0);
  const lowStockLimit = 25;
  const [operationPartSearch, setOperationPartSearch] = React.useState("");
  const [operationParts, setOperationParts] = React.useState<PartInventoryRow[]>([]);
  const [operationPartsLoading, setOperationPartsLoading] = React.useState(false);

  const parts = inventory.response.data;
  const reportDefinition = reportDefinitions[reportType];
  const reportRows = report?.type === reportType ? report.data : [];
  const reportLimit = 25;
  const reportPageRows = reportRows.slice((reportPage - 1) * reportLimit, reportPage * reportLimit);
  const reportMetrics = report ? reportDefinition.metrics(reportRows) : [];
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

  React.useEffect(() => {
    let alive = true;
    setReportLoading(true);
    setReportPage(1);

    api.fetchReport(reportType, {
      branchId: reportFilters.branchId,
      categoryId: reportFilters.categoryId,
      vehicleId: reportFilters.vehicleId,
      movementType: reportFilters.movementType,
      dateFrom: reportFilters.dateFrom,
      dateTo: reportFilters.dateTo,
    })
      .then((response) => {
        if (alive) setReport(response);
      })
      .catch((error) => {
        if (!alive) return;
        setReport(null);
        toast.error("Failed to load report", {
          description: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        if (alive) setReportLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [
    reportType,
    reportFilters.branchId,
    reportFilters.categoryId,
    reportFilters.vehicleId,
    reportFilters.movementType,
    reportFilters.dateFrom,
    reportFilters.dateTo,
  ]);

  function openMovementDialog(part: PartInventoryRow | null, movementType: ManualPartMovementType) {
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
    await Promise.all([inventory.refresh(), movements.refresh()]);
    setLowStockReloadKey((current) => current + 1);
  }

  async function saveReservationAction(payload: UpdateReservationInput) {
    await reservations.updateReservation(payload);
    await Promise.all([inventory.refresh(), movements.refresh()]);
    setLowStockReloadKey((current) => current + 1);
  }

  function updateReportFilter(key: keyof ReportFilters, value: string) {
    setReportFilters((current) => ({ ...current, [key]: value }));
    setReport(null);
    setReportPage(1);
  }

  function updateReportType(value: ReportType) {
    setReportType(value);
    setReport(null);
    setReportPage(1);
  }

  function exportReportExcel() {
    if (!reportRows.length) return;
    downloadExcel(`${reportType}-${todayDateInput()}.xlsx`, reportDefinition.label, reportDefinition.columns, reportRows);
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
                <NativeSelectOption value="all">All statuses</NativeSelectOption>
                <NativeSelectOption value="true">Active only</NativeSelectOption>
                <NativeSelectOption value="false">Inactive only</NativeSelectOption>
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
                          <div className="font-medium">{part.partName}</div>
                          <div className="text-xs text-muted-foreground">{part.partCode}</div>
                        </TableCell>
                        <TableCell>{categoryLabel(part.categoryName)}</TableCell>
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
                          <StatusBadge status={part.stockStatus} label={part.stockStatusLabel} />
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
                    {!movements.loading && movements.response.data.map((movement) => {
                      const snapshot = movementDisplaySnapshot(movement);
                      return (
                        <TableRow key={movement.id}>
                          <TableCell className="font-medium">{movement.movementNo}</TableCell>
                          <TableCell>{formatDate(movement.movementAt)}</TableCell>
                          <TableCell>{movement.partName || movement.partCode || "-"}</TableCell>
                          <TableCell>{movement.branchId == null ? CENTRAL_OR_UNASSIGNED_LABEL : movement.branchName || "-"}</TableCell>
                          <TableCell>
                            <MovementDirectionBadge
                              movementType={String(movement.movementType)}
                              stockBefore={snapshot.before}
                              stockAfter={snapshot.after}
                            />
                          </TableCell>
                          <TableCell className={cn("text-right font-medium", movementDirectionTextClasses(movementDirection(snapshot.before, snapshot.after)))}>
                            {movementQuantityLabel(movement.quantity, snapshot.before, snapshot.after)}
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(snapshot.before)}</TableCell>
                          <TableCell className="text-right">{formatNumber(snapshot.after)}</TableCell>
                          <TableCell>{[movement.vehiclePlate, movement.vehicleName].filter(Boolean).join(" - ") || "-"}</TableCell>
                          <TableCell>{movement.referenceNo || movement.reservationNo || "-"}</TableCell>
                        </TableRow>
                      );
                    })}
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
                    {!reservations.loading && reservations.response.data.map((reservation) => {
                      const displayQuantities = reservationDisplayQuantities(reservation);
                      return (
                        <TableRow key={reservation.id}>
                          <TableCell>
                            <div className="font-medium">{reservation.reservationNo}</div>
                            <div className="text-xs text-muted-foreground">{formatDate(reservation.neededAt)}</div>
                          </TableCell>
                          <TableCell>
                            {reservation.partId == null ? (
                              <span className="text-destructive">Missing part reference</span>
                            ) : (
                              `${reservation.partCode || reservation.partId}${reservation.partName ? ` - ${reservation.partName}` : ""}`
                            )}
                          </TableCell>
                          <TableCell>{reservation.branchId == null ? CENTRAL_OR_UNASSIGNED_LABEL : reservation.branchName || "-"}</TableCell>
                          <TableCell>{[reservation.vehiclePlate, reservation.vehicleName].filter(Boolean).join(" - ") || "-"}</TableCell>
                          <TableCell className="text-right">{formatNumber(displayQuantities.reserved)}</TableCell>
                          <TableCell className="text-right">{formatNumber(displayQuantities.issued)}</TableCell>
                          <TableCell className="text-right">{formatNumber(displayQuantities.returned)}</TableCell>
                          <TableCell className="text-right">{formatNumber(displayQuantities.remaining)}</TableCell>
                          <TableCell><StatusBadge status={reservation.status} label={reservation.status} /></TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="outline" size="sm" className={cn("h-8 font-medium", reservationActionButtonClasses("issue"))} disabled={reservation.partId == null || reservation.remainingQuantity <= 0 || reservation.status === "Cancelled"} onClick={() => setReservationAction({ open: true, reservation, action: "issue" })}>
                                Issue
                              </Button>
                              <Button variant="outline" size="sm" className={cn("h-8 font-medium", reservationActionButtonClasses("return"))} disabled={reservation.partId == null || reservation.returnableQuantity <= 0 || reservation.status === "Cancelled"} onClick={() => setReservationAction({ open: true, reservation, action: "return" })}>
                                Return
                              </Button>
                              <Button variant="outline" size="sm" className={cn("h-8 font-medium", reservationActionButtonClasses("cancel"))} disabled={reservation.status === "Cancelled" || reservation.remainingQuantity <= 0} onClick={() => setReservationAction({ open: true, reservation, action: "cancel" })}>
                                Cancel
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
                          <div className="font-medium">{part.partName}</div>
                          <div className="text-xs text-muted-foreground">{part.partCode}</div>
                        </TableCell>
                        <TableCell>{part.categoryName || "-"}</TableCell>
                        <TableCell className="text-right">{formatNumber(part.totalAvailableQuantity)}</TableCell>
                        <TableCell className="text-right">{formatNumber(part.minimumQuantity)}</TableCell>
                        <TableCell className="text-right">{formatNumber(Math.max(0, part.minimumQuantity - part.totalAvailableQuantity))}</TableCell>
                        <TableCell><StatusBadge status={part.stockStatus} label={part.stockStatusLabel} /></TableCell>
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
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="text-base">{reportDefinition.label}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{reportDefinition.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={exportReportExcel} disabled={!reportRows.length || reportLoading}>
                      <Download className="size-4" />
                      Export Excel
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <div className="space-y-1">
                    <Label htmlFor="reportType">Report</Label>
                    <NativeSelect id="reportType" value={reportType} onChange={(event) => updateReportType(event.target.value as ReportType)} className="w-full">
                    <NativeSelectOption value="stock_on_hand">Stock on Hand</NativeSelectOption>
                    <NativeSelectOption value="low_stock">Minimum Quantity Action List</NativeSelectOption>
                    <NativeSelectOption value="out_of_stock">Out of Stock</NativeSelectOption>
                    <NativeSelectOption value="usage_by_vehicle">Usage by Vehicle</NativeSelectOption>
                    <NativeSelectOption value="usage_by_category">Usage by Category</NativeSelectOption>
                    <NativeSelectOption value="movement_audit">Movement Audit</NativeSelectOption>
                    </NativeSelect>
                  </div>
                  {reportDefinition.filters.includes("branchId") ? (
                    <div className="space-y-1">
                      <Label htmlFor="reportBranch">Branch</Label>
                      <NativeSelect id="reportBranch" value={reportFilters.branchId} onChange={(event) => updateReportFilter("branchId", event.target.value)} className="w-full">
                        <NativeSelectOption value="">All branches</NativeSelectOption>
                        {inventory.lookups.branches.map((branch) => (
                          <NativeSelectOption key={branch.id} value={branch.id}>{branch.name}</NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                  ) : null}
                  {reportDefinition.filters.includes("categoryId") ? (
                    <div className="space-y-1">
                      <Label htmlFor="reportCategory">Category</Label>
                      <NativeSelect id="reportCategory" value={reportFilters.categoryId} onChange={(event) => updateReportFilter("categoryId", event.target.value)} className="w-full">
                        <NativeSelectOption value="">All categories</NativeSelectOption>
                        {inventory.lookups.categories.map((category) => (
                          <NativeSelectOption key={category.id} value={category.id}>{category.name}</NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                  ) : null}
                  {reportDefinition.filters.includes("vehicleId") ? (
                    <div className="space-y-1">
                      <Label htmlFor="reportVehicle">Vehicle</Label>
                      <NativeSelect id="reportVehicle" value={reportFilters.vehicleId} onChange={(event) => updateReportFilter("vehicleId", event.target.value)} className="w-full">
                        <NativeSelectOption value="">All vehicles</NativeSelectOption>
                        {inventory.lookups.vehicles.map((vehicle) => (
                          <NativeSelectOption key={vehicle.id} value={vehicle.id}>
                            {vehicle.plateNo}{vehicle.name ? ` - ${vehicle.name}` : ""}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                  ) : null}
                  {reportDefinition.filters.includes("movementType") ? (
                    <div className="space-y-1">
                      <Label htmlFor="reportMovementType">Movement type</Label>
                      <NativeSelect id="reportMovementType" value={reportFilters.movementType} onChange={(event) => updateReportFilter("movementType", event.target.value)} className="w-full">
                        <NativeSelectOption value="all">All movement types</NativeSelectOption>
                        {movementTypes.map((type) => <NativeSelectOption key={type} value={type}>{type}</NativeSelectOption>)}
                      </NativeSelect>
                    </div>
                  ) : null}
                  {reportDefinition.filters.includes("dateFrom") ? (
                    <div className="space-y-1">
                      <Label htmlFor="reportDateFrom">From</Label>
                      <Input id="reportDateFrom" type="date" value={reportFilters.dateFrom} onChange={(event) => updateReportFilter("dateFrom", event.target.value)} />
                    </div>
                  ) : null}
                  {reportDefinition.filters.includes("dateTo") ? (
                    <div className="space-y-1">
                      <Label htmlFor="reportDateTo">To</Label>
                      <Input id="reportDateTo" type="date" value={reportFilters.dateTo} onChange={(event) => updateReportFilter("dateTo", event.target.value)} />
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-0">
                {report ? (
                  <div className="grid gap-3 px-3 md:grid-cols-2 xl:grid-cols-4">
                    {reportMetrics.map((metric) => (
                      <SummaryCard key={metric.title} title={metric.title} value={metric.value} icon={metric.icon} tone={metric.tone} />
                    ))}
                  </div>
                ) : null}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {reportDefinition.columns.map((column) => (
                          <TableHead key={column.key} className={column.align === "right" ? "text-right" : undefined}>
                            {column.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportLoading ? <LoadingRows colSpan={reportDefinition.columns.length} /> : null}
                      {!reportLoading && !report ? <EmptyRows colSpan={reportDefinition.columns.length} label="Report results load automatically." /> : null}
                      {!reportLoading && report && reportRows.length === 0 ? <EmptyRows colSpan={reportDefinition.columns.length} label="No report rows found." /> : null}
                      {!reportLoading && reportPageRows.map((row, index) => (
                        <TableRow key={`${reportPage}-${index}`}>
                          {reportDefinition.columns.map((column) => (
                            <TableCell key={column.key} className={column.align === "right" ? "text-right" : undefined}>
                              {column.render ? column.render(reportValue(row, column.key), row) : reportText(row, column.key)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {report ? (
                  <PaginationControls
                    page={reportPage}
                    limit={reportLimit}
                    total={reportRows.length}
                    onPageChange={setReportPage}
                  />
                ) : null}
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
          onUnitCreate={async (payload) => {
            const result = await api.createSharedUnit(payload);
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
