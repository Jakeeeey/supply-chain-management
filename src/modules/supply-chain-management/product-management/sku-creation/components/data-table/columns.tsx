"use client"

import { ColumnDef } from "@tanstack/react-table"
import { SKU, MasterData, SKUStatus } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Send, CheckCircle, Clock, FileText, Ban, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const statusConfig = {
  Draft: { label: "Draft", icon: FileText, color: "bg-slate-100 text-slate-700 border-slate-200" },
  "For Approval": { label: "Pending", icon: Clock, color: "bg-amber-50 text-amber-700 border-amber-200" },
  Active: { label: "Active", icon: CheckCircle, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  Inactive: { label: "Inactive", icon: Ban, color: "bg-rose-50 text-rose-700 border-rose-200" },
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
        <span className="font-semibold text-foreground group-hover:text-primary transition-colors cursor-default">
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
      
      return (
        <span className="text-sm font-medium text-slate-700">{categoryName}</span>
      );
    },
  },
  {
    accessorKey: "product_brand",
    header: "Brand",
    cell: ({ row }) => {
      const sku = row.original;
      const brand = masterData?.brands.find(b => (b.id == sku.product_brand));
      const brandName = brand ? (brand.name || (brand as any).brand || (brand as any).brand_name || (brand as any).title || (brand as any).code) : "—";
      
      return (
        <span className="text-sm font-medium text-slate-700">{brandName}</span>
      );
    },
  },
  {
    accessorKey: "product_supplier",
    header: "Suppliers",
    cell: ({ row }) => {
      const sku = row.original;
    // Check multiple potential field names for the relation ID
    const rawSupplier = sku.product_supplier || (sku as any).supplier || (sku as any).supplier_id || (sku as any).vendor;
    
    // Handle both number ID and object (if expanded)
    const supplierId = (typeof rawSupplier === 'object' && rawSupplier !== null) 
      ? (rawSupplier as any).id 
      : rawSupplier;

      const supplier = masterData?.suppliers?.find(s => (s.id == supplierId));
      const supplierName = supplier ? (supplier.name || (supplier as any).supplier_name) : "—";
      
      return (
        <span className="text-sm text-slate-600 truncate max-w-[150px] block" title={supplierName}>{supplierName}</span>
      );
    },
  },
  {
    accessorKey: "product_code",
    header: "SKU Code",
    cell: ({ row }) => {
      const code = row.getValue("product_code") as string;
      return (
        <code className="px-2 py-1 bg-slate-100 rounded text-slate-600 font-mono text-[11px] font-bold border border-slate-200">
          {code || "GENERATING..."}
        </code>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = (row.getValue("status") || "Draft") as keyof typeof statusConfig;
      const config = statusConfig[status];
      const StatusIcon = config.icon;
      return (
        <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-black shadow-sm uppercase tracking-tight", config.color)}>
          <StatusIcon className="h-3.5 w-3.5" />
          {config.label}
        </div>
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
                className="h-8 gap-1.5 text-xs font-bold hover:bg-primary/5 hover:text-primary border-primary/20 rounded-lg"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => onSubmitForApproval(id)}
                className="h-8 gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 shadow-md shadow-primary/10 rounded-lg"
              >
                <Send className="h-3.5 w-3.5" />
                Submit
              </Button>
            </>
          )}

          {status === "For Approval" && (
            <Button 
              variant="default" 
              size="sm"
              onClick={() => onApprove(id)}
              className="h-8 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 rounded-lg text-white"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Approve
            </Button>
          )}

          {status === "Active" && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onEdit(sku)}
              className="h-8 gap-1.5 text-xs font-bold rounded-lg"
            >
              <Edit className="h-3.5 w-3.5" />
              View
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted rounded-lg">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuLabel className="font-bold">Operations</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(id)}
                className="text-destructive font-bold focus:text-destructive rounded-lg"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Record
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
