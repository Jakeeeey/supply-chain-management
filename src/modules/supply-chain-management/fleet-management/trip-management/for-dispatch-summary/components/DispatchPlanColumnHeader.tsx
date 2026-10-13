"use client";

import type { DispatchPlanGroup } from "../types/for-dispatch-summary.types";
import { User, Truck, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DispatchPlanColumnHeaderProps {
  group: DispatchPlanGroup;
}

export function DispatchPlanColumnHeader({ group }: DispatchPlanColumnHeaderProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md bg-foreground px-3 py-2 text-background">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide">
          {group.dispatchDocNo || "Unknown Plan"}
        </span>
        <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[9px] text-foreground bg-background">
          {group.invoices.length} {group.invoices.length === 1 ? "ORDER" : "ORDERS"}
        </Badge>
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 text-background/80">
          <CalendarClock className="h-3 w-3 shrink-0" />
          <span className="text-[10px] uppercase tracking-wide">
            {group.dateLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-background/80">
          <User className="h-3 w-3 shrink-0" />
          <span className="text-[10px] uppercase tracking-wide truncate">
            {group.driverName}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-background/80">
          <Truck className="h-3 w-3 shrink-0" />
          <span className="text-[10px] uppercase tracking-wide">
            {group.vehiclePlate}
          </span>
        </div>
      </div>
    </div>
  );
}
