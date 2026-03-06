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
  },
  {
    accessorKey: "totalAmount",
    header: "TOTAL AMOUNT",
    cell: ({ row }) => formatCurrency(row.getValue("totalAmount") || 0),
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
