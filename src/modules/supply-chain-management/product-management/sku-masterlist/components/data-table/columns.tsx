"use client"

import { ColumnDef } from "@tanstack/react-table"
import { SKU, MasterData } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "./table-column-header"
import { CellHelpers } from "../../../sku-creation/utils/sku-helpers"
import { Edit, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export const getMasterlistColumns = (
  masterData: MasterData | null,
  onEditDescription?: (sku: SKU) => void
): ColumnDef<SKU>[] => [
  {
    accessorKey: "product_name",
    enableSorting: true,
    header: ({ column }) => <DataTableColumnHeader column={column} label="Product Name" />,
    meta: { label: "Product Name" },
    cell: ({ row }) => <span className="font-semibold">{row.original.product_name || "Unnamed Product"}</span>,
  },
  {
    accessorKey: "product_category",
    enableSorting: true,
    header: ({ column }) => <DataTableColumnHeader column={column} label="Category" />,
    meta: { label: "Category" },
    cell: ({ row }) => <span>{CellHelpers.renderMasterText(row.original.product_category, masterData?.categories)}</span>,
  },
  {
    accessorKey: "product_brand",
    enableSorting: true,
    header: ({ column }) => <DataTableColumnHeader column={column} label="Brand" />,
    meta: { label: "Brand" },
    cell: ({ row }) => <span>{CellHelpers.renderMasterText(row.original.product_brand, masterData?.brands)}</span>,
  },
  {
    accessorKey: "inventory_type",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Type" />,
    meta: { label: "Type" },
    cell: ({ row }) => {
      const type = CellHelpers.detectInventoryType(row.original);
      return (
        <Badge variant="outline" className={`font-medium ${type === 'Variant' ? 'border-primary text-primary bg-primary/5' : 'text-muted-foreground opacity-70'}`}>
          {type}
        </Badge>
      );
    },
  },
  {
    accessorKey: "product_code",
    enableSorting: true,
    header: ({ column }) => <DataTableColumnHeader column={column} label="SKU Code" />,
    meta: { label: "SKU Code" },
    cell: ({ row }) => (
      row.original.product_code ? (
        <code className="px-2 py-1 bg-primary/10 text-primary rounded font-mono text-xs font-bold">{row.original.product_code}</code>
      ) : (
        <span className="text-muted-foreground/40 italic text-xs ml-2">Unassigned</span>
      )
    ),
  },
  {
    accessorKey: "isActive",
    enableSorting: true,
    header: ({ column }) => <DataTableColumnHeader column={column} label="Status" />,
    meta: { label: "Status" },
    cell: ({ row }) => {
      const active = Number(row.getValue("isActive")) === 1;
      return <Badge variant={active ? "default" : "outline"}>{active ? "ACTIVE" : "INACTIVE"}</Badge>;
    },
  },
  {
    id: "actions",
    enableHiding: false,
    meta: { label: "Actions" },
    cell: ({ row }) => {
      const sku = row.original;
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEditDescription?.(sku)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Description
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
