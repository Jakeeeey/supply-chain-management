"use client";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Users } from "lucide-react";
import { DataTableColumnHeader } from "./table-column-header";

export type CustomerTransaction = {
  id: string;
  customerName: string;
  address: string;
  itemsOrdered: string;
  amount: number;
  status: string;
};

export type DispatchPlanSummary = {
  id: string;
  dpNumber: string;
  driverName: string;
  driverId?: string;
  vehiclePlateNo: string;
  vehicleId?: string;
  helpers?: string[];
  estimatedDispatch: string;
  estimatedArrival: string;
  amount: number;
  budgetTotal?: number;
  status: string;
  salesmanName?: string;
  salesmanId?: string;
  startingPoint?: string;
  timeOfDispatch?: string | null;
  timeOfArrival?: string | null;
  customerTransactions?: CustomerTransaction[];
  totalWeight?: number;
  maximumWeight?: number;
  capacityPercentage?: number;
  createdAt?: string;
};

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  "For Approval": "outline",
  "For Dispatch": "default",
  "For Inbound": "secondary",
  "For Clearance": "destructive",
  Posted: "secondary",
  POSTED: "secondary",
  COMPLETED: "default",
  CANCELLED: "destructive",
  DRAFT: "outline",
};

export const getDispatchPlanColumns = (
  onEdit: (plan: DispatchPlanSummary) => void,
): ColumnDef<DispatchPlanSummary>[] => [
  {
    accessorKey: "dpNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Dispatch No." />
    ),
    meta: { label: "Dispatch No." },
    cell: ({ row }) => (
      <span className="text-sm font-medium text-primary">
        {row.original.dpNumber}
      </span>
    ),
  },
  {
    accessorKey: "driverName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Driver & Vehicle" />
    ),
    meta: { label: "Driver & Vehicle" },
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium text-foreground">
          {row.original.driverName}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {row.original.vehiclePlateNo}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "helpers",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Trip Staff" />
    ),
    meta: { label: "Trip Staff" },
    enableSorting: false,
    cell: ({ row }) => {
      const helpers = row.original.helpers || [];
      if (helpers.length === 0) {
        return (
          <span className="text-xs text-muted-foreground/50 italic">
            No helpers
          </span>
        );
      }
      return (
        <div className="flex flex-col gap-0.5">
          {helpers.map((name: string, i: number) => (
            <div key={i} className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-foreground truncate max-w-[140px]">
                {name}
              </span>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "estimatedDispatch",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Departure" />
    ),
    meta: { label: "Departure" },
    cell: ({ row }) => {
      const etod = new Date(row.original.estimatedDispatch);
      return (
        <div>
          <p className="text-sm text-foreground">
            {format(etod, "dd MMM yyyy")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(etod, "HH:mm")}
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: "estimatedArrival",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Arrival" />
    ),
    meta: { label: "Arrival" },
    cell: ({ row }) => {
      const etoa = new Date(row.original.estimatedArrival);
      return (
        <div>
          <p className="text-sm text-foreground">
            {format(etoa, "dd MMM yyyy")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(etoa, "HH:mm")}
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Trip Value" />
    ),
    meta: { label: "Trip Value" },
    cell: ({ row }) => (
      <span className="text-sm font-medium text-foreground tabular-nums">
        ₱
        {Number(row.original.amount || 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
        })}
      </span>
    ),
  },
  {
    id: "weight",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Weight" />
    ),
    meta: { label: "Weight" },
    cell: ({ row }) => {
      const weight = row.original.totalWeight || 0;
      const capacity = row.original.capacityPercentage || 0;
      return (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {weight.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg
          </span>
          <span
            className={cn(
              "text-[10px] font-medium transition-colors",
              capacity > 100
                ? "text-destructive animate-pulse"
                : capacity >= 90
                ? "text-amber-500"
                : "text-muted-foreground"
            )}
          >
            {capacity.toFixed(0)}% capacity
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "budgetTotal",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Budget" />
    ),
    meta: { label: "Budget" },
    cell: ({ row }) => {
      const total = row.original.budgetTotal || 0;
      return total > 0 ? (
        <span className="text-sm font-medium text-foreground tabular-nums">
          ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground/50 italic">Not set</span>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Status" />
    ),
    meta: { label: "Status" },
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant={statusVariant[status] ?? "outline"}>{status}</Badge>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const status = row.original.status;
      const isEditable = status === "For Approval" || status === "DRAFT";
      if (!isEditable) return null;
      return (
        <Button
          className="text-sm rounded-lg"
          onClick={() => onEdit(row.original)}
        >
          Edit
        </Button>
      );
    },
  },
];
