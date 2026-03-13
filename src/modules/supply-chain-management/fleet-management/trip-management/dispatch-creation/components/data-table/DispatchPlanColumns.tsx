"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Edit2, Truck, Wallet } from "lucide-react";

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

export const getDispatchPlanColumns = (
  onEdit: (plan: DispatchPlanSummary) => void,
  onBudget: (plan: DispatchPlanSummary) => void,
): ColumnDef<DispatchPlanSummary>[] => [
  {
    accessorKey: "dpNumber",
    header: "Dispatch No.",
    cell: ({ row }) => (
      <span className="font-bold text-blue-600 cursor-pointer hover:underline">
        {row.original.dpNumber}
      </span>
    ),
  },
  {
    header: "Driver & Vehicle",
    cell: ({ row }) => (
      <div className="space-y-1">
        <p className="font-bold text-slate-900">{row.original.driverName}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Truck className="w-3.5 h-3.5" />
          <span>{row.original.vehiclePlateNo}</span>
        </div>
      </div>
    ),
  },
  {
    header: "Schedule (ETOD / ETOA)",
    cell: ({ row }) => {
      const etod = new Date(row.original.estimatedDispatch);
      const etoa = new Date(row.original.estimatedArrival);
      return (
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase w-7">
              Dep:
            </span>
            <span className="font-medium text-slate-700">
              {format(etod, "dd/MM/yyyy")}{" "}
              <span className="text-muted-foreground font-normal">
                {format(etod, "HH:mm")}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase w-7">
              Arr:
            </span>
            <span className="font-medium text-slate-700">
              {format(etoa, "dd/MM/yyyy")}{" "}
              <span className="text-muted-foreground font-normal">
                {format(etoa, "HH:mm")}
              </span>
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "amount",
    header: "Trip Value",
    cell: ({ row }) => (
      <span className="font-bold text-slate-900">
        ₱{Number(row.original.amount || 0).toLocaleString()}
      </span>
    ),
  },
  {
    header: "Budget",
    cell: ({ row }) => {
      const total = row.original.budgetTotal || 0;
      return (
        <span
          className={`font-bold ${total > 0 ? "text-emerald-600" : "text-slate-300 italic font-normal"}`}
        >
          {total > 0 ? `₱${total.toLocaleString()}` : "Not Set"}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant="outline"
          className="rounded-lg px-2.5 py-1 border-amber-200 bg-amber-50 text-amber-700 font-bold text-[10px] uppercase tracking-wider"
        >
          {status}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-slate-200"
          onClick={() => onEdit(row.original)}
        >
          <Edit2 className="w-3.5 h-3.5 text-slate-400" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-lg border-slate-200 gap-1.5 text-xs font-bold text-slate-700"
          onClick={() => onBudget(row.original)}
        >
          <Wallet className="w-3.5 h-3.5" />
          Budget
        </Button>
      </div>
    ),
  },
];
