"use client"

import { ColumnDef } from "@tanstack/react-table"
import { SKU, MasterData, SKUStatus } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Send, CheckCircle, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const statusVariants: Record<SKUStatus, "outline" | "secondary" | "default" | "destructive"> = {
  Draft: "outline",
  "For Approval": "secondary",
  Active: "default",
  Inactive: "destructive",
};

export const getColumns = (
  masterData: MasterData | null,
  onEdit: (sku: SKU) => void,
  onDelete: (id: number) => void,
  onSubmitForApproval: (id: number) => void,
  onApprove: (id: number) => void,
): ColumnDef<SKU>[] => [
  {
    accessorKey: "product_name",
    header: "Product Name",
    cell: ({ row }) => {
      const sku = row.original;
      return (
        <span className="font-medium">
          {sku.product_name}
        </span>
      );
    },
  },
  {
    accessorKey: "product_category",
    header: "Category",
    cell: ({ row }) => {
      const sku = row.original;
      const category = masterData?.categories.find(c => (c.id == sku.product_category));
      const categoryName = category ? (category.name || (category as any).category || (category as any).category_name || (category as any).title || (category as any).code) : "—";
      
      return <span>{categoryName}</span>;
    },
  },
  {
    accessorKey: "product_brand",
    header: "Brand",
    cell: ({ row }) => {
      const sku = row.original;
      const brand = masterData?.brands.find(b => (b.id == sku.product_brand));
      const brandName = brand ? (brand.name || (brand as any).brand || (brand as any).brand_name || (brand as any).title || (brand as any).code) : "—";
      
      return <span>{brandName}</span>;
    },
  },
  {
    accessorKey: "product_supplier",
    header: "Supplier",
    cell: ({ row }) => {
      const sku = row.original;
      const rawSupplier = sku.product_supplier || (sku as any).supplier || (sku as any).supplier_id || (sku as any).vendor;
      const supplierId = (typeof rawSupplier === 'object' && rawSupplier !== null) 
        ? (rawSupplier as any).id 
        : rawSupplier;

      const supplier = masterData?.suppliers?.find(s => (s.id == supplierId));
      const supplierName = supplier ? (supplier.name || (supplier as any).supplier_name) : "—";
      
      return <span className="truncate max-w-[150px] block" title={supplierName}>{supplierName}</span>;
    },
  },
  {
    accessorKey: "product_code",
    header: "SKU Code",
    cell: ({ row }) => {
      const code = row.getValue("product_code") as string;
      return (
        <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono">
          {code || "Pending"}
        </code>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = (row.getValue("status") || "Draft") as SKUStatus;
      return (
        <Badge variant={statusVariants[status]}>
          {status}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const sku = row.original;
      const id = (sku as any).id || (sku as any).product_id;
      const status = sku.status as SKUStatus;

      return (
        <div className="flex justify-end gap-2">
          {status === "Draft" && (
            <>
               <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onEdit(sku)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => onSubmitForApproval(id)}
              >
                <Send className="h-4 w-4 mr-2" />
                Submit
              </Button>
            </>
          )}

          {status === "For Approval" && (
            <Button 
              variant="default" 
              size="sm"
              onClick={() => onApprove(id)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          )}

          {status === "Active" && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onEdit(sku)}
            >
              <Edit className="h-4 w-4 mr-2" />
              View
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
