"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  SKU,
  MasterData,
} from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "./table-column-header";
import { CellHelpers } from "../../../sku-creation/utils/sku-helpers";
import { CheckCircle, XCircle, MoreHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export const getMasterlistColumns = (
  masterData: MasterData | null,
  onToggleStatus?: (id: number | string, current: boolean) => void,
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
            Unassigned
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
          className={`font-medium ${type === "Variant" ? "border-primary text-primary bg-primary/5" : ""}`}
        >
          {type}
        </Badge>
      );
    },
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
    accessorKey: "isActive",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Status" />
    ),
    meta: { label: "Status" },
    cell: ({ row }) => {
      const sku = row.original;
      const isActiveVal = sku.isActive;
      const active = isActiveVal === 1 || isActiveVal === true;
      const displayStatus =
        (sku as any).status || (active ? "ACTIVE" : "INACTIVE");

      return (
        <Badge
          variant={active ? "default" : "destructive"}
          className={`text-xs`}
        >
          {displayStatus.toUpperCase()}
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
      const id = (sku as any).id || (sku as any).product_id;
      const active = sku.isActive === 1 || sku.isActive === true;

      if (!onToggleStatus) return null;

      return (
        <div className="flex justify-end w-[60px]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onToggleStatus(id, active)}
                className={active ? "text-destructive" : "text-primary"}
              >
                {active ? (
                  <>
                    <XCircle className="h-4 w-4 mr-2" /> Deactivate
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" /> Activate
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
