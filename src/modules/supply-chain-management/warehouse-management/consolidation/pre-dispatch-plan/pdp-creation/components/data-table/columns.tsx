"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DispatchPlan } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { formatPeso } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/utils/format";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Eye } from "lucide-react";

/**
 * Column definitions for the PDP Creation (Pending) table.
 * Shows pending dispatch plans with an Edit action.
 */
export function getPDPCreationColumns({
  onEdit,
  onViewRemarks,
}: {
  onEdit: (plan: DispatchPlan) => void;
  onViewRemarks: (remarks: string) => void;
}): ColumnDef<DispatchPlan>[] {
  return [
    {
      accessorKey: "dispatch_no",
      header: "PDP No.",
      cell: ({ row }) => (
        <span className="font-semibold text-primary">
          {row.original.dispatch_no}
        </span>
      ),
    },
    {
      accessorKey: "dispatch_date",
      header: "Dispatch Date",
      cell: ({ row }) => {
        const date = row.original.dispatch_date;
        if (!date) return "—";
        return new Date(date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      },
    },
    {
      id: "cluster",
      header: "Cluster",
      cell: ({ row }) => (
        <span className="font-medium line-clamp-1 max-w-[120px]">
          {row.original.cluster_name || "—"}
        </span>
      ),
    },
    {
      id: "branch",
      header: "Branch",
      cell: ({ row }) => (
        <span className="font-medium text-xs text-muted-foreground">
          {row.original.branch_name || "—"}
        </span>
      ),
    },
    {
      id: "driver",
      header: "Driver",
      cell: ({ row }) => (
        <span className="font-medium line-clamp-1 max-w-[150px]">
          {row.original.driver_name || "—"}
        </span>
      ),
    },
    {
      id: "outlets",
      header: "Outlets",
      cell: ({ row }) => <span>{row.original.outlet_count ?? 0} order(s)</span>,
    },
    {
      id: "weight",
      header: "Weight",
      cell: ({ row }) => {
        const weight = row.original.total_weight || 0;
        const capacity = row.original.capacity_percentage || 0;
        return (
          <div className="flex flex-col">
            <span className="font-semibold">
              {weight.toLocaleString("en-US", { maximumFractionDigits: 0 })} kg
            </span>
            <span
              className={`text-[10px] font-medium ${
                capacity > 100
                  ? "text-destructive"
                  : capacity >= 90
                    ? "text-amber-500"
                    : "text-muted-foreground"
              }`}
            >
              {capacity}% capacity
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "total_amount",
      header: "Amount",
      cell: ({ row }) => {
        return formatPeso(row.original.total_amount ?? 0);
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const variant =
          status === "Pending"
            ? "outline"
            : status === "Approved"
              ? "default"
              : status === "Rejected"
                ? "destructive"
                : "secondary";
        return (
          <Badge variant={variant} className="capitalize">
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "reject_remarks",
      header: "Rejected Remarks",
      cell: ({ row }) => {
        const remarks = row.original.reject_remarks;
        if (!remarks) return <span className="text-muted-foreground">—</span>;
        
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground italic line-clamp-1 max-w-[150px]">
              {remarks}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onViewRemarks(remarks)}
              title="View Remarks"
            >
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(row.original)}
            title="Edit Plan"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
