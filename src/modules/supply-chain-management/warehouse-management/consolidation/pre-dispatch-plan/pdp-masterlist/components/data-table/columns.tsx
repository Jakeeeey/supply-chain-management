"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DispatchPlan } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";

/**
 * Returns the appropriate badge variant based on dispatch plan status.
 */
function getStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "Approved":
      return "default";
    case "Dispatched":
      return "secondary";
    case "Pending":
      return "outline";
    case "Picking":
    case "Picked":
      return "secondary";
    default:
      return "outline";
  }
}

/**
 * Column definitions for the PDP Masterlist table.
 * Shows all dispatch plans across all statuses.
 */
export function getPDPMasterlistColumns({
  onView,
}: {
  onView: (plan: DispatchPlan) => void;
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
      id: "cluster_branch",
      header: "Cluster / Branch",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.cluster_name || "—"}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.branch_name || "—"}
          </div>
        </div>
      ),
    },
    {
      id: "driver",
      header: "Driver",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.driver_name || "—"}</span>
      ),
    },
    {
      id: "outlets",
      header: "Outlets",
      cell: ({ row }) => <span>{row.original.outlet_count ?? 0} order(s)</span>,
    },
    {
      accessorKey: "total_amount",
      header: "Amount",
      cell: ({ row }) => {
        const amount = row.original.total_amount;
        if (!amount) return "₱0.00";
        return `₱${Number(amount).toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge variant={getStatusVariant(status)} className="capitalize">
            {status}
          </Badge>
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
            onClick={() => onView(row.original)}
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
