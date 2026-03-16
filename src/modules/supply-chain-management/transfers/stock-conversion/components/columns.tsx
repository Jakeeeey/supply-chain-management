import { ColumnDef } from "@tanstack/react-table";
import { StockConversionProduct } from "../types/stock-conversion.schema";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight } from "lucide-react";

export const formatCurrency = (amount: number) =>
    `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const getColumns = (
  onConvertClick: (product: StockConversionProduct) => void
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
    accessorKey: "productDescription",
    header: "PRODUCT DESCRIPTION",
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
      if (p.inventoryLoaded === false) {
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            Loading...
          </span>
        );
      }
      return (
        <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
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
    cell: ({ row }) => (
      <Button
        variant="default"
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto font-medium shadow-sm transition-colors rounded-lg flex items-center gap-1"
        onClick={() => onConvertClick(row.original)}
      >
        <ArrowLeftRight className="w-4 h-4" />
        Convert
      </Button>
    ),
  },
];
