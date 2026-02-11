import React from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox"; // Shadcn Checkbox
import { ChevronRight } from "lucide-react";
import { Product, Unit } from "../types";

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  // New Props for Selection
  isSelectionMode: boolean;
  selectedIds: string[]; // List of selected product_ids
  onToggleSelect: (product: Product) => void;
  onToggleAll: (allIds: string[]) => void;
}

export function ProductTable({
  products,
  onEdit,
  isSelectionMode,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: ProductTableProps) {
  // Helper to handle safe selection
  const handleCheckboxChange = (product: Product) => {
    // STRICT VALIDATION: Check for SKU and Barcode
    if (!product.barcode) {
      toast.error("Incomplete Record", {
        description: "Cannot select product without Barcode.",
      });
      return;
    }
    onToggleSelect(product);
  };

  const handleSelectAll = () => {
    // Filter only valid items for "Select All"
    const validIds = products
      .filter((p) => p.product_code && p.barcode)
      .map((p) => String(p.product_id));

    if (validIds.length === 0) {
      toast.warning("No valid records to select.");
      return;
    }

    // If all valid items are already selected, unselect all. Otherwise select valid ones.
    const allValidSelected = validIds.every((id) => selectedIds.includes(id));
    onToggleAll(allValidSelected ? [] : validIds);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {/* Selection Column */}
            {isSelectionMode && (
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={
                    products.length > 0 &&
                    products.every(
                      (p) =>
                        !p.product_code ||
                        !p.barcode ||
                        selectedIds.includes(String(p.product_id)),
                    ) &&
                    selectedIds.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}

            <TableHead className="w-[150px]">SKU Code</TableHead>
            <TableHead className="min-w-[300px]">Product Name</TableHead>
            <TableHead>Inventory Type</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead>Attributes</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={isSelectionMode ? 7 : 6}
                className="text-center h-24 text-muted-foreground"
              >
                No products found matching your filters.
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

              const displayName = product.description || product.product_name;
              const inventoryType = "Regular";
              const attributes = "-";

              const isSelected = selectedIds.includes(
                String(product.product_id),
              );

              return (
                <TableRow
                  key={product.product_id}
                  className="hover:bg-muted/50"
                  data-state={isSelected ? "selected" : undefined}
                >
                  {/* Checkbox Cell */}
                  {isSelectionMode && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleCheckboxChange(product)}
                      />
                    </TableCell>
                  )}

                  {/* SKU Code */}
                  <TableCell
                    className="font-medium text-blue-600 cursor-pointer"
                    onClick={() => onEdit(product)}
                  >
                    {product.product_code || "-"}
                  </TableCell>

                  {/* Product Name */}
                  <TableCell
                    className="font-medium cursor-pointer"
                    onClick={() => onEdit(product)}
                  >
                    <div className="truncate max-w-[350px]" title={displayName}>
                      {displayName}
                    </div>
                  </TableCell>

                  {/* Inventory Type */}
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                    >
                      {inventoryType}
                    </Badge>
                  </TableCell>

                  {/* UOM */}
                  <TableCell className="text-muted-foreground">
                    {unitName}
                  </TableCell>

                  {/* Attributes */}
                  <TableCell className="text-muted-foreground text-sm font-mono">
                    {attributes}
                  </TableCell>

                  {/* Action */}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => onEdit(product)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
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
