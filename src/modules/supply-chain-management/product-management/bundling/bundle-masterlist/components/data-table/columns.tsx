"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Bundle, BundleMasterData } from "../../../types/bundle.schema";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "./table-column-header";

interface ColumnOptions {
  masterData: BundleMasterData | null;
}

/**
 * Column definitions for the Bundle Masterlist (approved) DataTable.
 */
export function getMasterlistColumns({
  masterData,
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
  ];
}
