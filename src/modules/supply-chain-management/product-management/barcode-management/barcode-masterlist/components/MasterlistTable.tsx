import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Product, Unit } from "../types";

interface MasterlistTableProps {
  products: Product[];
  isSelectionMode: boolean;
  selectedIds: string[];
  onToggleSelect: (product: Product) => void;
  onToggleAll: (allIds: string[]) => void;
  // ✅ FIX: Added missing prop definition
  onViewDetails: (product: Product) => void;
}

export function MasterlistTable({
  products,
  isSelectionMode,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onViewDetails, // ✅ FIX: Destructure prop here
}: MasterlistTableProps) {
  const handleSelectAll = () => {
    const ids = products.map((p) => String(p.product_id));
    const allSelected = ids.every((id) => selectedIds.includes(id));
    onToggleAll(allSelected ? [] : ids);
  };

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {isSelectionMode && (
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={
                    products.length > 0 &&
                    products.every((p) =>
                      selectedIds.includes(String(p.product_id)),
                    )
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}
            <TableHead className="w-[150px]">SKU Code</TableHead>
            <TableHead className="w-[180px]">Barcode</TableHead>
            <TableHead className="min-w-[250px]">Product Name</TableHead>
            <TableHead>Inventory Type</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead>Date Linked</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={isSelectionMode ? 7 : 6}
                className="text-center h-24 text-muted-foreground"
              >
                No records found.
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => {
              const unitName =
                typeof product.unit_of_measurement === "object" &&
                  product.unit_of_measurement
                  ? (product.unit_of_measurement as Unit).unit_shortcut ||
                  (product.unit_of_measurement as Unit).unit_name
                  : "PCS";

              const isSelected = selectedIds.includes(
                String(product.product_id),
              );
              const dateLinked = product.barcode_date
                ? new Date(product.barcode_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })
                : "-";

              return (
                <TableRow
                  key={product.product_id}
                  className="hover:bg-muted/50 cursor-pointer transition-colors"
                  data-state={isSelected ? "selected" : undefined}
                  // ✅ FIX: Added click handler for the row
                  onClick={(e) => {
                    // Prevent opening modal if clicking the checkbox
                    if ((e.target as HTMLElement).closest('[role="checkbox"]'))
                      return;
                    onViewDetails(product);
                  }}
                >
                  {isSelectionMode && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect(product)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium text-primary">
                    {product.product_code}
                  </TableCell>
                  <TableCell className="font-mono font-semibold">
                    {product.barcode}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {product.description || product.product_name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        product.record_type === "bundle"
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          : "bg-primary/10 text-primary border-primary/20"
                      }
                    >
                      {product.record_type === "bundle" ? "Bundle" : "Regular"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {unitName}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {dateLinked}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
