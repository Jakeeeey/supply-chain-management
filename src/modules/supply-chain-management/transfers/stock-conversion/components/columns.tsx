import { ColumnDef } from "@tanstack/react-table";
import { StockConversionProduct } from "../types";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, AlertTriangle, RefreshCw } from "lucide-react";

export const formatCurrency = (amount: number) =>
    `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const getColumns = (
  onConvertClick: (product: StockConversionProduct) => void,
  onRetryInventory: (productId: number) => void,
  canConvert: boolean = true,
  convertingId?: number | null
): ColumnDef<StockConversionProduct>[] => [
  {
    accessorKey: "supplierName",
    header: "SUPPLIER",
    cell: ({ row, table }) => {
      const prevRow = table.getRowModel().rows[row.index - 1];
      const isDuplicate = prevRow && prevRow.original.productName === row.original.productName && prevRow.original.brand === row.original.brand;
      return <span className={isDuplicate ? "opacity-0 select-none" : ""}>{row.getValue("supplierName")}</span>;
    }
  },
  {
    accessorKey: "brand",
    header: "BRAND",
    cell: ({ row, table }) => {
      const prevRow = table.getRowModel().rows[row.index - 1];
      const isDuplicate = prevRow && prevRow.original.productName === row.original.productName && prevRow.original.brand === row.original.brand;
      return <span className={isDuplicate ? "opacity-0 select-none" : ""}>{row.getValue("brand")}</span>;
    }
  },
  {
    accessorKey: "category",
    header: "CATEGORY",
    cell: ({ row, table }) => {
      const prevRow = table.getRowModel().rows[row.index - 1];
      const isDuplicate = prevRow && prevRow.original.productName === row.original.productName && prevRow.original.brand === row.original.brand;
      return <span className={isDuplicate ? "opacity-0 select-none" : ""}>{row.getValue("category")}</span>;
    }
  },
  {
    accessorKey: "productName",
    header: "PRODUCT NAME",
    cell: ({ row, table }) => {
      const prevRow = table.getRowModel().rows[row.index - 1];
      const isDuplicate = prevRow && prevRow.original.productName === row.original.productName && prevRow.original.brand === row.original.brand;
      const nextRow = table.getRowModel().rows[row.index + 1];
      const isNextDuplicate = nextRow && nextRow.original.productName === row.original.productName && nextRow.original.brand === row.original.brand;
      const isLastChild = isDuplicate && !isNextDuplicate;
      
      if (isDuplicate) {
        return (
          <div className="relative w-full h-full min-h-[3.5rem] flex flex-col justify-center py-2">
             {/* The vertical line coming from above. 
                 top-[-1px] overlaps the table row border for a seamless connection.
                 If it's the last child, it stops at the middle (h-1/2).
                 If it's a middle child, it goes all the way down (bottom-[-1px]).
             */}
             <div className={`absolute left-[1.5rem] top-[-1px] w-px border-l-2 border-blue-500/40 z-10 ${isLastChild ? 'h-1/2' : 'bottom-[-1px]'}`} />
             
             {/* The horizontal branch pointing to the unit */}
             <div className="absolute left-[1.5rem] top-1/2 w-6 border-t-2 border-blue-500/40 z-10" />

             {/* Faded text so the user knows what row this is */}
             <div className="pl-[3rem] select-none">
                <span className="font-medium line-clamp-1  text-xs block">
                  {row.getValue("productName")}
                </span>
                {row.original.productCode && (
                  <span className="text-[9px] text-muted-foreground/70 font-mono uppercase tracking-tighter block mt-0.5">
                    {row.original.productCode}
                  </span>
                )}
             </div>
          </div>
        );
      }

      return (
        <div className="relative flex flex-col justify-center py-2 h-full min-h-[3.5rem]">
          {/* If this parent has children, start the vertical line pointing down to them. 
              Starts at the vertical center of the parent and connects seamlessly to the first child */}
          {isNextDuplicate && (
             <div className="absolute left-[1.5rem] top-1/2 w-px bottom-[-1px] border-l-2 border-blue-500/40 z-10" />
          )}
          <div className="pl-[3rem]">
            <span className="font-semibold line-clamp-1 text-foreground block">
              {row.getValue("productName")}
            </span>
            {row.original.productCode && (
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter block mt-0.5">
                {row.original.productCode}
              </span>
            )}
          </div>
        </div>
      );
    },
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
          <div className="flex items-center space-x-2">
            <div className="h-4 w-12 bg-muted animate-pulse rounded" />
          </div>
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
      if (p.inventoryLoaded === false) return <div className="h-4 w-16 bg-muted animate-pulse rounded" />;
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
      const p = row.original;
      const isConverting = p.productId === convertingId;
      const hasStock = p.quantity > 0;
      let tooltip = "";
      if (!canConvert) {
        tooltip = "A Branch must be selected to process this stock conversion transaction.";
      } else if (!hasStock) {
        tooltip = "This product has no available stock to convert FROM. You can only convert INTO this product.";
      }

      return (
        <div title={tooltip || undefined}>
          <Button
            variant={isConverting ? "outline" : "default"}
            size="sm"
            className={`w-full sm:w-auto font-medium shadow-sm transition-all rounded-lg flex items-center gap-2 ${
              isConverting 
                ? "bg-blue-50 text-blue-600 border-blue-200 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40"
            }`}
            onClick={() => onConvertClick(p)}
            disabled={!canConvert || !hasStock || isConverting}
          >
            {isConverting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowLeftRight className="w-4 h-4" />
            )}
            {isConverting ? "Processing..." : "Convert"}
          </Button>
        </div>
      );
    },
  },
];

