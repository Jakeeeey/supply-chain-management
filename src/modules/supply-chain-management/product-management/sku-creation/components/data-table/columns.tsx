"use client"

import { ColumnDef } from "@tanstack/react-table"
import { SKU, MasterData, SKUStatus } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Send, CheckCircle, XCircle, MoreHorizontal, Eye } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTableColumnHeader } from "./table-column-header"
import { CellHelpers, statusVariants } from "../../utils/sku-helpers"

// --- Main Column Definition ---

export const getColumns = (
  masterData: MasterData | null,
  onEdit?: (sku: SKU) => void,
  onDelete?: (id: number) => void,
  onSubmitForApproval?: (id: number) => void,
  onApprove?: (id: number) => void,
  onReject?: (id: number) => void,
): ColumnDef<SKU>[] => [
  {
    accessorKey: "product_name",
    enableSorting: true,
    header: ({ column }) => <DataTableColumnHeader column={column} label="Product Name" />,
    meta: { label: "Product Name" },
    cell: ({ row }) => <span className="font-medium">{row.original.product_name || "Unnamed Product"}</span>,
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
        <Badge variant="secondary" className={`font-medium ${type === 'Variant' ? 'border-primary text-primary bg-primary/5' : 'text-muted-foreground opacity-70'}`}>
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
    meta: { label: "Status" },
    cell: ({ row }) => {
      const raw = (row.getValue("status") || "DRAFT") as string;
      return (
        <Badge variant={statusVariants[raw] || "outline"} className="font-semibold uppercase">
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
      const id = (sku as any).id || sku.product_id;
      const status = (sku.status || "Draft").toLowerCase().replace(/_/g, " ");

      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(status === "draft" || status === "rejected") && (
                <>
                  {onSubmitForApproval && <DropdownMenuItem onClick={() => onSubmitForApproval(id as number)}><Send className="h-4 w-4 mr-2" /> Submit</DropdownMenuItem>}
                </>
              )}
              {(status === "for approval" || status === "pending") && (
                <>
                  {onApprove && <DropdownMenuItem onClick={() => onApprove(id as number)} className="text-primary"><CheckCircle className="h-4 w-4 mr-2" /> Approve</DropdownMenuItem>}
                  {onReject && <DropdownMenuItem onClick={() => onReject(id as number)}><XCircle className="h-4 w-4 mr-2" /> Reject</DropdownMenuItem>}
                </>
              )}
              {status === "active" && onEdit && <DropdownMenuItem onClick={() => onEdit(sku)}><Eye className="h-4 w-4 mr-2" /> View Details</DropdownMenuItem>}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(id as number)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
