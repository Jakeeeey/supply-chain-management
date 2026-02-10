"use client"

import { ColumnDef } from "@tanstack/react-table"
import { SKU, MasterData, SKUStatus } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import React from "react"

const statusVariants: Record<string, "outline" | "secondary" | "default" | "destructive"> = {
  Draft: "outline",
  "For Approval": "secondary",
  Rejected: "destructive",
  Active: "default",
  Inactive: "outline",
  DRAFT: "outline",
  "FOR APPROVAL": "secondary",
  FOR_APPROVAL: "secondary",
  REJECTED: "destructive",
  ACTIVE: "default",
  INACTIVE: "outline",
  PENDING: "secondary",
};

export const getApprovalColumns = (
  masterData: MasterData | null,
  onApprove?: (id: number | string) => void,
  onReject?: (id: number | string) => void,
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const rawStatus = (row.getValue("status") || "DRAFT") as string;
      const status = (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase()) as SKUStatus;
      
      // Replace underscores with spaces for a cleaner display (e.g., FOR_APPROVAL -> FOR APPROVAL)
      const displayStatus = rawStatus.replace(/_/g, " ");

      return (
        <Badge variant={statusVariants[rawStatus] || statusVariants[status] || "outline"} className="font-semibold uppercase px-3">
          {displayStatus}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const sku = row.original;
      const id = (sku as any).id || (sku as any).product_id;

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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
