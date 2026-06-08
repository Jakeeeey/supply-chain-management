"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  SKU,
  MasterData,
} from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Eye,
  ImageIcon,
} from "lucide-react";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "./table-column-header";
import { CellHelpers, statusVariants } from "../../utils/sku-helpers";

// --- Main Column Definition ---

export const getColumns = (
  masterData: MasterData | null,
  onEdit?: (sku: SKU) => void,
  onDelete?: (sku: SKU) => void,
  onSubmitForApproval?: (sku: SKU) => void,
  onApprove?: (id: number | string) => void,
  onReject?: (id: number | string) => void,
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
    accessorKey: "main_image",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Image" />
    ),
    meta: { label: "Image" },
    cell: ({ row }) => {
      const sku = row.original;
      const imageUrl = sku.main_image
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${sku.main_image}?width=40&height=40&fit=cover`
        : null;

      return (
        <div className="flex items-center justify-center w-9 h-9 rounded-md border bg-muted overflow-hidden shrink-0">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={sku.product_name || "Product"}
              width={36}
              height={36}
              className="object-cover"
              unoptimized
            />
          ) : (
            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/40" />
          )}
        </div>
      );
    },
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
      <span className="font-medium block truncate max-w-[400px]">
        {row.original.product_name || "Unnamed Product"}
      </span>
    ),
  },
  {
    accessorKey: "product_supplier",
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Supplier" />
    ),
    meta: { label: "Supplier" },
    cell: ({ row }) => (
      <span className="text-xs">
        {CellHelpers.renderMasterText(
          row.original.product_supplier,
          masterData?.suppliers,
        )}
      </span>
    ),
  },
  {
    accessorKey: "product_brand",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Brand" />
    ),
    meta: { label: "Brand" },
    cell: ({ row }) => (
      <div className="w-full truncate">
        <span className="text-xs">
          {CellHelpers.renderMasterText(
            row.original.product_brand,
            masterData?.brands,
          )}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "product_category",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Category" />
    ),
    meta: { label: "Category" },
    cell: ({ row }) => (
      <div className="w-full truncate">
        <span className="text-xs">
          {CellHelpers.renderMasterText(
            row.original.product_category,
            masterData?.categories,
          )}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "product_class",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Class" />
    ),
    meta: { label: "Class" },
    cell: ({ row }) => (
      <span className="text-xs">
        {CellHelpers.renderMasterText(
          row.original.product_class,
          masterData?.classes,
        )}
      </span>
    ),
  },
  {
    accessorKey: "product_segment",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Segment" />
    ),
    meta: { label: "Segment" },
    cell: ({ row }) => (
      <span className="text-xs">
        {CellHelpers.renderMasterText(
          row.original.product_segment,
          masterData?.segments,
        )}
      </span>
    ),
  },
  {
    accessorKey: "product_section",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Section" />
    ),
    meta: { label: "Section" },
    cell: ({ row }) => (
      <span className="text-xs">
        {CellHelpers.renderMasterText(
          row.original.product_section,
          masterData?.sections,
        )}
      </span>
    ),
  },
  {
    accessorKey: "inventory_type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Type" />
    ),
    meta: { label: "Type" },
    cell: ({ row }) => {
      const type = CellHelpers.detectInventoryType(row.original);
      return (
        <Badge
          variant="outline"
          className={`${type === "Variant" ? "bg-secondary text-secondary-foreground" : ""}`}
        >
          {type}
        </Badge>
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
      const raw = (row.getValue("status") || "DRAFT") as string;
      return (
        <Badge variant={statusVariants[raw] || "secondary"}>
          {raw.replace(/_/g, " ")}
        </Badge>
      );
    },
  },
  {
    accessorKey: "remarks",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Remarks" />
    ),
    meta: { label: "Remarks" },
    cell: ({ row }) => {
      const remarks = row.original.remarks;
      const status = row.original.status;
      const isRejected = status === "REJECTED" || status === "Rejected";

      if (!remarks) {
        if (isRejected) {
          return (
            <span className="text-xs text-muted-foreground/50 italic">
              No remarks provided
            </span>
          );
        }
        return null;
      }
      return (
        <div className="max-w-[200px] truncate" title={remarks}>
          <span className="text-xs text-muted-foreground">{remarks}</span>
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    meta: { label: "Actions" },
    cell: ({ row }) => {
      const sku = row.original;
      const id = sku.id || sku.product_id;
      const status = (sku.status || "Draft").toLowerCase().replace(/_/g, " ");

      return (
        <div className="flex justify-end w-[60px]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(status === "draft" || status === "rejected") && (
                <>
                  {onSubmitForApproval && (
                    <DropdownMenuItem onClick={() => onSubmitForApproval(sku)}>
                      <Send className="h-4 w-4 mr-2" /> Submit
                    </DropdownMenuItem>
                  )}
                </>
              )}
              {(status === "for approval" || status === "pending") && (
                <>
                  {onApprove && (
                    <DropdownMenuItem
                      onClick={() => onApprove(id as number)}
                      className="text-primary"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" /> Approve
                    </DropdownMenuItem>
                  )}
                  {onReject && (
                    <DropdownMenuItem onClick={() => onReject(id as number)}>
                      <XCircle className="h-4 w-4 mr-2" /> Reject
                    </DropdownMenuItem>
                  )}
                </>
              )}
              {status === "active" && onEdit && (
                <DropdownMenuItem onClick={() => onEdit(sku)}>
                  <Eye className="h-4 w-4 mr-2" /> View Details
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(sku)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
