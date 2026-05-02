"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DispatchPlan } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { ColumnDef } from "@tanstack/react-table";
import { formatNumber, formatPeso } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/utils/format";

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
    case "Rejected":
      return "destructive";
    default:
      return "outline";
  }
}

/**
 * Column definitions for the PDP Planner table.
 * Shows all dispatch plans with View + conditional Approve actions.
 */
export function getPDPPlannerColumns({
  onView,
  onApprove,
  onReject,
}: {
  onView: (plan: DispatchPlan) => void;
  onApprove: (plan: DispatchPlan) => void;
  onReject: (plan: DispatchPlan) => void;
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
        <span className="font-medium text-xs text-muted-foreground line-clamp-1 max-w-[120px]">
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
              {formatNumber(weight)} kg
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
      cell: ({ row }) => {
        const isPending = row.original.status === "Pending";
        return (
          <div className="flex items-center justify-end gap-1">
            {isPending && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => onApprove(row.original)}
              >
                Approve
              </Button>
            )}
            {isPending && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onReject(row.original)}
              >
                Reject
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onView(row.original)}
              title="View Details"
            >
              View
            </Button>
          </div>
        );
      },
    },
  ];
}
