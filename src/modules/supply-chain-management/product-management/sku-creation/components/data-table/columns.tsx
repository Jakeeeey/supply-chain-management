"use client"

import { ColumnDef } from "@tanstack/react-table"
import { SKU, MasterData, SKUStatus } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Send, CheckCircle, XCircle, MoreHorizontal } from "lucide-react"
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
  Rejected: "destructive",
  Active: "default",
  Inactive: "outline",
};

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
    header: "Workflow Status",
    cell: ({ row }) => {
      const status = (row.getValue("status") || "Draft") as SKUStatus;
      return (
        <Badge variant={statusVariants[status] || "outline"} className="font-semibold uppercase px-3">
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: "Active (1/0)",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive");
      const isVisible = isActive === 1 || isActive === true;
      return (
        <Badge variant={isVisible ? "default" : "outline"}>
          {isVisible ? "Active (1)" : "Inactive (0)"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const sku = row.original;
      const id = (sku as any).id || (sku as any).product_id;
      const status = (sku.status || "Draft") as SKUStatus;

      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Draft/Rejected Status Actions */}
              {(status === "Draft" || status === "Rejected") && (
                <>
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(sku)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Draft
                    </DropdownMenuItem>
                  )}
                  {onSubmitForApproval && (
                    <DropdownMenuItem onClick={() => onSubmitForApproval(id)}>
                      <Send className="h-4 w-4 mr-2" />
                      Submit for Approval
                    </DropdownMenuItem>
                  )}
                </>
              )}

              {/* Approval Process Actions */}
              {status === "For Approval" && (
                <>
                  {onApprove && (
                    <DropdownMenuItem onClick={() => onApprove(id)} className="text-primary focus:text-primary">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve SKU
                    </DropdownMenuItem>
                  )}
                  {onReject && (
                    <DropdownMenuItem onClick={() => onReject(id)}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject/Return
                    </DropdownMenuItem>
                  )}
                </>
              )}

              {/* Active Status Actions */}
              {status === "Active" && onEdit && (
                <DropdownMenuItem onClick={() => onEdit(sku)}>
                  <Edit className="h-4 w-4 mr-2" />
                  View 
                </DropdownMenuItem>
              )}

              {/* Common Actions */}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
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
