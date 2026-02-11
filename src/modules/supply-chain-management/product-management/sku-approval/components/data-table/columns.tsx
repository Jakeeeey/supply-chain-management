"use client"

import { ColumnDef } from "@tanstack/react-table"
import { SKU, MasterData } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Eye, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTableColumnHeader } from "./table-column-header"
import { CellHelpers, statusVariants } from "../../../sku-creation/utils/sku-helpers"

export const getApprovalColumns = (
  masterData: MasterData | null,
  onView?: (sku: SKU) => void,
  onApprove?: (id: number) => void,
  onReject?: (id: number) => void,
): ColumnDef<SKU>[] => [
  {
    accessorKey: "product_name",
    enableSorting: true,
    header: ({ column }) => <DataTableColumnHeader column={column} label="Product Name" />,
    cell: ({ row }) => <span className="font-medium">{row.original.product_name || "Unnamed Product"}</span>,
  },
  {
    accessorKey: "product_category",
    enableSorting: true,
    header: ({ column }) => <DataTableColumnHeader column={column} label="Category" />,
    cell: ({ row }) => <span>{CellHelpers.renderMasterText(row.original.product_category, masterData?.categories)}</span>,
  },
  {
    accessorKey: "product_brand",
    enableSorting: true,
    header: ({ column }) => <DataTableColumnHeader column={column} label="Brand" />,
    cell: ({ row }) => <span>{CellHelpers.renderMasterText(row.original.product_brand, masterData?.brands)}</span>,
  },
  {
    accessorKey: "inventory_type",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Type" />,
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
      cell: ({ row }) => (
        row.original.product_code ? (
          <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono">{row.original.product_code}</code>
        ) : (
          <span className="text-muted-foreground/50 text-xs italic">Pending</span>
        )
      ),
    },
  {
    accessorKey: "status",
    enableSorting: true,
    header: ({ column }) => <DataTableColumnHeader column={column} label="Status" />,
    cell: ({ row }) => {
      const raw = (row.getValue("status") || "PENDING") as string;
      return <Badge variant={statusVariants[raw] || "secondary"} className="uppercase">{raw.replace(/_/g, " ")}</Badge>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const sku = row.original;
      const id = (sku as any).id || sku.product_id;
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Review Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onView && <DropdownMenuItem onClick={() => onView(sku)}><Eye className="h-4 w-4 mr-2" /> View Details</DropdownMenuItem>}
              {onApprove && <DropdownMenuItem onClick={() => onApprove(id as number)} className="text-primary"><CheckCircle className="h-4 w-4 mr-2" /> Approve</DropdownMenuItem>}
              {onReject && <DropdownMenuItem onClick={() => onReject(id as number)} className="text-destructive"><XCircle className="h-4 w-4 mr-2" /> Reject</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
