"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { EllipsisVertical, Pencil } from "lucide-react";

import { DataTableColumnHeader } from "./table-column-header";

export type DispatchPlanSummary = {
  id: string;
  dpNumber: string;
  driverName: string;
  vehiclePlateNo: string;
  estimatedDispatch: string;
  estimatedArrival: string;
  amount: number;
  budgetTotal?: number;
  status: string;
};

const statusStyles: Record<string, string> = {
  POSTED: "bg-amber-50 text-amber-600 border-amber-200",
  COMPLETED: "bg-emerald-50 text-emerald-600 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-500 border-red-200",
  DRAFT: "bg-muted text-muted-foreground border-border",
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
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-md",
            statusStyles[status] ??
              "bg-muted text-muted-foreground border-border",
          )}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
            size="icon"
          >
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onEdit(row.original)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
