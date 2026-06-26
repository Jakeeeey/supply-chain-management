"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MasterData,
  SKU,
} from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle,
  Clock,
  ImageIcon,
  Images,
  MoreHorizontal,
  XCircle,
  Edit,
} from "lucide-react";
import Image from "next/image";
import { CellHelpers } from "../../../sku-creation/utils/sku-helpers";
import { DataTableColumnHeader } from "./table-column-header";

/** Shape returned by Directus when parent_id is expanded as a relational object. */
interface ParentRef {
  id?: number;
  product_id?: number;
  main_image?: string | null;
}

function isParentRef(value: unknown): value is ParentRef {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const getMasterlistColumns = (
  masterData: MasterData | null,
  parentImages: Record<number, string | null> = {},
  onToggleStatus?: (id: number | string, current: boolean) => void,
  onEdit?: (sku: SKU) => void,
  onUpdateImage?: (sku: SKU) => void,
  onViewGallery?: (sku: SKU) => void,
  pendingEditIds?: Set<number>,
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
          className="translate-y-0.5"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="px-1">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-0.5"
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
      // Inherit image from parent if current SKU has no image
      const parentRef = isParentRef(sku.parent_id) ? sku.parent_id : null;
      const parentId = parentRef
        ? parentRef.id ?? parentRef.product_id
        : sku.parent_id;

      const parentImageFromMap = parentId ? parentImages[Number(parentId)] : null;
      const parentImageFromObject = parentRef?.main_image ?? null;

      const imageId = sku.main_image || parentImageFromMap || parentImageFromObject;

      const imageUrl = imageId
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${imageId}?width=40&height=40&fit=cover`
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
    cell: ({ row }) =>
      row.original.product_code ? (
        <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
          {row.original.product_code}
        </code>
      ) : (
        <span className="text-xs text-muted-foreground italic">Unassigned</span>
      ),
  },
  {
    accessorKey: "product_name",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Product Name" />
    ),
    meta: { label: "Product Name" },
    cell: ({ row }) => {
      const sku = row.original;
      const pid = (sku.product_id || sku.id) as number;
      const hasPendingEdit = pendingEditIds?.has(pid) ?? false;
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium block truncate max-w-[400px]">
            {sku.product_name || "Unnamed Product"}
          </span>
          {hasPendingEdit && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-amber-300 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 shrink-0">
              <Clock className="h-3 w-3 mr-0.5" />
              Pending Edit
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "product_supplier",
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Supplier" />
    ),
    meta: { label: "Supplier" },
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
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
      <span className="text-sm text-muted-foreground">
        {CellHelpers.renderMasterText(
          row.original.product_brand,
          masterData?.brands,
        )}
      </span>
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
      <span className="text-sm text-muted-foreground">
        {CellHelpers.renderMasterText(
          row.original.product_category,
          masterData?.categories,
        )}
      </span>
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
      <span className="text-sm text-muted-foreground">
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
      <span className="text-sm text-muted-foreground">
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
      <span className="text-sm text-muted-foreground">
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
        <Badge variant={type === "Variant" ? "default" : "outline"}>
          {type}
        </Badge>
      );
    },
  },
  {
    accessorKey: "unit_of_measurement",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="UOM Type" />
    ),
    meta: { label: "UOM Type" },
    cell: ({ row }) => {
      const sku = row.original;
      const uomValue = sku.unit_of_measurement;
      let uomName = "Unassigned";
      if (uomValue) {
        if (typeof uomValue === "object" && uomValue !== null) {
          const obj = uomValue as Record<string, unknown>;
          uomName = String(obj.name || obj.unit_name || obj.unit_shortcut || "Unassigned");
        } else {
          const unit = masterData?.units?.find((u) => u.id === Number(uomValue));
          uomName = unit?.name || "Unassigned";
        }
      }
      return <span className="text-sm text-muted-foreground">{uomName}</span>;
    },
  },
  {
    accessorKey: "unit_of_measurement_count",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="UOM Count" />
    ),
    meta: { label: "UOM Count" },
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.unit_of_measurement_count ?? "-"}
      </span>
    ),
  },
  {
    accessorKey: "isActive",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Status" />
    ),
    meta: { label: "Status" },
    cell: ({ row }) => {
      const sku = row.original;
      const active = sku.isActive === 1 || sku.isActive === true;
      return (
        <Badge variant={active ? "default" : "secondary"}>
          {active ? "Active" : "Inactive"}
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
      const id = sku.id ?? sku.product_id;
      const active = sku.isActive === 1 || sku.isActive === true;

      if (!onToggleStatus || id == null) return null;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              (() => {
                const pid = (sku.product_id || sku.id) as number;
                const hasPendingEdit = pendingEditIds?.has(pid) ?? false;
                return (
                  <DropdownMenuItem
                    onClick={() => onEdit(sku)}
                    disabled={hasPendingEdit}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {hasPendingEdit ? "Edit Pending Approval" : "Edit Product"}
                  </DropdownMenuItem>
                );
              })()
            )}
            {onUpdateImage && (
              <DropdownMenuItem onClick={() => onUpdateImage(sku)}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Update Image
              </DropdownMenuItem>
            )}
            {onViewGallery && (
              <DropdownMenuItem onClick={() => onViewGallery(sku)}>
                <Images className="h-4 w-4 mr-2" />
                View Gallery
              </DropdownMenuItem>
            )}
            {(onUpdateImage || onViewGallery) && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuItem
              variant={active ? "destructive" : undefined}
              onClick={() => onToggleStatus(id, active)}
            >
              {active ? (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Deactivate
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Activate
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
