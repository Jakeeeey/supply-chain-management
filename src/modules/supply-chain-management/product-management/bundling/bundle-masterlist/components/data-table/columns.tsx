"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Bundle, BundleMasterData } from "../../../types/bundle.schema";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "./table-column-header";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ColumnOptions {
  masterData: BundleMasterData | null;
  onView: (id: number) => void;
}

/**
 * Column definitions for the Bundle Masterlist (approved) DataTable.
 */
export function getMasterlistColumns({
  masterData,
  onView,
}: ColumnOptions): ColumnDef<Bundle>[] {
  return [
    {
      accessorKey: "bundle_sku",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Bundle Code" />
      ),
      cell: ({ row }) => (
        <span className="px-1 py-0.5 bg-muted rounded text-xs font-mono font-medium">
          {row.original.bundle_sku}
        </span>
      ),
    },
    {
      accessorKey: "bundle_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Bundle Name" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.bundle_name}</span>
      ),
    },
    {
      accessorKey: "bundle_type_id",
      header: "Type",
      cell: ({ row }) => {
        const raw = row.original.bundle_type_id;
        if (typeof raw === "object" && raw !== null) {
          return raw.name || "-";
        }
        const found = masterData?.bundleTypes.find((t: any) => t.id == raw);
        return found?.name || "-";
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const isRejected = (row.original as any).draft_status === "REJECTED";
        return (
          <Badge
            variant="secondary"
            className={
              isRejected
                ? "bg-destructive/10 text-destructive"
                : "bg-emerald-500/10 text-emerald-600"
            }
          >
            {isRejected ? "REJECTED" : "APPROVED"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const bundle = row.original;
        return (
          <div className="flex items-center justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => onView(bundle.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View Details</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
  ];
}
