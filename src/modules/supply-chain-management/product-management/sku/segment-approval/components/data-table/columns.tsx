"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MasterData,
  SKU,
} from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { ColumnDef } from "@tanstack/react-table";
import {
  CellHelpers,
  statusVariants,
} from "../../../sku-creation/utils/sku-helpers";
import { DataTableColumnHeader } from "../../../sku-approval/components/data-table/table-column-header";

export const getSegmentApprovalColumns = (
  masterData: MasterData | null,
  onApprove?: (sku: SKU) => void,
  onReject?: (sku: SKU) => void,
): ColumnDef<SKU>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <div className="px-1">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-1"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="px-1">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-1"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "product_code",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="SKU Code" />
    ),
    meta: { label: "SKU Code" },
    cell: ({ row }) => (
      <div className="w-fit">
        {row.original.product_code ? (
          <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono font-medium">
            {row.original.product_code}
          </code>
        ) : (
          <span className="text-muted-foreground/50 text-xs italic">
            Pending
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "product_name",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Product Name" />
    ),
    meta: { label: "Product Name" },
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.product_name || "Unnamed Product"}
      </span>
    ),
  },
  {
    accessorKey: "_proposed_class",
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Class" />
    ),
    meta: { label: "Class" },
    cell: ({ row }) => {
      const val = (row.original as SKU & { _proposed_class?: number })._proposed_class;
      return (
        <span className="font-medium">
          {CellHelpers.renderMasterText(val, masterData?.classes) || "N/A"}
        </span>
      );
    },
  },
  {
    accessorKey: "_proposed_segment",
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Segment" />
    ),
    meta: { label: "Segment" },
    cell: ({ row }) => {
      const val = (row.original as SKU & { _proposed_segment?: number })._proposed_segment;
      return (
        <span className="font-medium">
          {CellHelpers.renderMasterText(val, masterData?.segments) || "N/A"}
        </span>
      );
    },
  },
  {
    accessorKey: "_proposed_section",
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Section" />
    ),
    meta: { label: "Section" },
    cell: ({ row }) => {
      const val = (row.original as SKU & { _proposed_section?: number })._proposed_section;
      return (
        <span className="font-medium">
          {CellHelpers.renderMasterText(val, masterData?.sections) || "N/A"}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Status" />
    ),
    meta: { label: "Status" },
    cell: ({ row }) => {
      const raw = (row.getValue("status") || "PENDING") as string;
      return (
        <Badge
          variant={statusVariants[raw] || "secondary"}
          className="uppercase text-xs"
        >
          {raw.replace(/_/g, " ")}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    meta: { label: "Actions" },
    cell: ({ row }) => {
      const sku = row.original;
      return (
        <div className="flex justify-end w-fit gap-2">
          {onReject && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onReject(sku)}
              title="Reject Segment"
            >
             Reject
            </Button>
          )}
          {onApprove && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onApprove(sku)}
              title="Approve Segment"
            >
             Approve
            </Button>
          )}
        </div>
      );
    },
  },
];
