"use client";

import * as React from "react";
import type { PhysicalInventoryStatus } from "../types";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
    status: PhysicalInventoryStatus;
};

export function PhysicalInventoryStatusBadge({ status }: Props) {
    return (
        <Badge
            className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                status === "Pending" && "bg-amber-500/10 text-amber-700 hover:bg-amber-500/10",
                status === "Committed" &&
                "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10",
                status === "Cancelled" &&
                "bg-rose-500/10 text-rose-700 hover:bg-rose-500/10",
            )}
        >
            {status}
        </Badge>
    );
}