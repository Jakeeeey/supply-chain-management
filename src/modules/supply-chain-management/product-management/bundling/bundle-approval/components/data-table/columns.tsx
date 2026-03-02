"use client";

import { ColumnDef } from "@tanstack/react-table";
import { BundleDraft, BundleMasterData } from "../../../types/bundle.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye } from "lucide-react";
import { DataTableColumnHeader } from "./table-column-header";

interface ColumnOptions {
  masterData: BundleMasterData | null;
  onView: (draft: BundleDraft) => void;
}

/**
 * Column definitions for the Bundle Approval (pending) DataTable.
 */
export function getApprovalColumns({
  masterData,
  onView,
}: ColumnOptions): ColumnDef<BundleDraft>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
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
        const found = masterData?.bundleTypes.find((t) => t.id == raw);
        return found?.name || "-";
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(row.original)}
          >
            <Eye className="mr-2 h-4 w-4" /> View
          </Button>
        </div>
      ),
    },
  ];
}
