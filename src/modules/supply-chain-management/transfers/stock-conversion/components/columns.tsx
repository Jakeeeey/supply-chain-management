import { ColumnDef } from "@tanstack/react-table";
import { StockConversionProduct } from "../types/stock-conversion.schema";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, AlertTriangle, RefreshCw } from "lucide-react";

export const formatCurrency = (amount: number) =>
    `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const getColumns = (
  onConvertClick: (product: StockConversionProduct) => void,
  onRetryInventory: (productId: number) => void,
  canConvert: boolean = true
): ColumnDef<StockConversionProduct>[] => [
  {
    accessorKey: "supplierName",
    header: "SUPPLIER",
  },
  {
    accessorKey: "brand",
    header: "BRAND",
  },
  {
    accessorKey: "category",
    header: "CATEGORY",
  },
  {
    accessorKey: "productName",
    header: "PRODUCT NAME",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-semibold text-foreground line-clamp-1">
          {row.getValue("productName")}
        </span>
        {row.original.productCode && (
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">
            {row.original.productCode}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "currentUnit",
    header: "UNIT",
    cell: ({ row }) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
        {row.getValue("currentUnit")}
      </span>
    ),
  },
  {
    accessorKey: "quantity",
    header: "QUANTITY",
    cell: ({ row }) => {
      const p = row.original;
      if (p.inventoryError) {
        return (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded border border-destructive/20">
               <AlertTriangle className="w-3.5 h-3.5" /> Error
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-blue-500 rounded-full"
              onClick={() => onRetryInventory(p.productId)}
              title="Retry fetching inventory"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        );
      }
      if (p.inventoryLoaded === false) {
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            Loading...
          </span>
        );
      }
      const isNegative = p.quantity < 0;
      return (
        <span className={isNegative ? "font-black text-destructive" : "font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400"}>
           {p.quantity}
        </span>
      );
    }
  },
  {
    accessorKey: "totalAmount",
    header: "TOTAL AMOUNT",
    cell: ({ row }) => {
      const p = row.original;
      if (p.inventoryError) return <span className="text-muted-foreground italic text-xs">-</span>;
      if (p.inventoryLoaded === false) return <span className="text-muted-foreground italic text-xs">...</span>;
      return (
        <span className="font-black text-foreground tracking-tight">
          {formatCurrency(p.totalAmount || 0)}
        </span>
      );
    }
  },
  {
    id: "actions",
    header: "ACTIONS",
    cell: ({ row }) => {
      const hasStock = row.original.quantity > 0;
      let tooltip = "";
      if (!canConvert) {
        tooltip = "Select a Branch and at least one filter (Supplier, Brand, or Category) to enable conversion";
      } else if (!hasStock) {
        tooltip = "This product has no available stock to convert FROM. You can only convert INTO this product.";
      }

      return (
        <div title={tooltip || undefined}>
          <Button
            variant="default"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto font-medium shadow-sm transition-colors rounded-lg flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => onConvertClick(row.original)}
            disabled={!canConvert || !hasStock}
          >
            <ArrowLeftRight className="w-4 h-4" />
            Convert
          </Button>
        </div>
      );
    },
  },
];

