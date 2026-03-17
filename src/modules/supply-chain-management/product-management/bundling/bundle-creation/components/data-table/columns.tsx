"use client";

import { ColumnDef } from "@tanstack/react-table";
import { BundleDraft, BundleMasterData } from "../../../types/bundle.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, Send, Trash2, Package, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableColumnHeader } from "./table-column-header";

interface ColumnOptions {
  masterData: BundleMasterData | null;
  onSubmit: (id: number | string) => void;
  onDelete: (id: number | string) => void;
  onView: (draft: BundleDraft) => void;
  onEdit: (id: number | string) => void;
}

/**
 * Column definitions for the Bundle Creation (Drafts) table.
 */
export function getDraftColumns({
  masterData,
  onSubmit,
  onDelete,
  onView,
  onEdit,
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
      accessorKey: "draft_status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.draft_status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const id = row.original.id;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(row.original)}>
                  <Package className="mr-2 h-4 w-4" /> View Details
                </DropdownMenuItem>
                {(row.original.draft_status === "DRAFT" || row.original.draft_status === "REJECTED") && (
                  <DropdownMenuItem onClick={() => onEdit(id)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Draft
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onSubmit(id)}>
                  <Send className="mr-2 h-4 w-4" /> Submit for Approval
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
