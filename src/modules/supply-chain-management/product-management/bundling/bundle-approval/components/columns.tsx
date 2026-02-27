"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  BundleDraft,
  BundleMasterData,
} from "@/modules/supply-chain-management/product-management/bundling/types/bundle.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

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
      accessorKey: "bundle_sku",
      header: "Bundle Code",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-primary">
          {row.original.bundle_sku}
        </span>
      ),
    },
    {
      accessorKey: "bundle_name",
      header: "Bundle Name",
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
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
          {row.original.draft_status}
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
