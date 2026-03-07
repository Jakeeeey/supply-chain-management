"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DispatchPlan } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import { ColumnDef } from "@tanstack/react-table";
import { CheckCircle, Eye } from "lucide-react";

/**
 * Column definitions for the PDP Approval table.
 * Shows pending plans with an Approve action button.
 */
export function getPDPApprovalColumns({
  onView,
  onApprove,
}: {
  onView: (plan: DispatchPlan) => void;
  onApprove: (plan: DispatchPlan) => void;
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
            {/* <span className="text-[10px] text-muted-foreground">
              {capacity}% capacity
            </span> */}
          </div>
        );
      },
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
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onView(row.original)}
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => onApprove(row.original)}
          >
            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
            Approve
          </Button>
        </div>
      ),
    },
  ];
}
