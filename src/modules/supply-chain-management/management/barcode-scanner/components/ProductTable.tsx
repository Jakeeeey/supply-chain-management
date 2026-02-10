import React from "react";
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
import { ScanBarcode, Edit } from "lucide-react";
import { Product, Category, Unit, getSupplierName } from "../types";

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
}

export function ProductTable({ products, onEdit }: ProductTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-32.5">Barcode</TableHead>
            <TableHead className="w-45">Supplier</TableHead>
            <TableHead className="max-w-75">Product Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center h-24 text-muted-foreground"
              >
                No products found matching your filters.
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => {
              const categoryName =
                typeof product.product_category === "object" &&
                product.product_category
                  ? (product.product_category as Category).category_name
                  : "-";

              const unitName =
                typeof product.unit_of_measurement === "object" &&
                product.unit_of_measurement
                  ? (product.unit_of_measurement as Unit).unit_shortcut ||
                    (product.unit_of_measurement as Unit).unit_name
                  : "-";

              const supplierName = getSupplierName(product);
              const displayName = product.description || product.product_name;

              return (
                <TableRow
                  key={product.product_id}
                  className="hover:bg-muted/50"
                >
                  {/* Barcode */}
                  <TableCell className="text-sm font-mono py-3">
                    {product.barcode ? (
                      <span>{product.barcode}</span>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        Missing
                      </Badge>
                    )}
                  </TableCell>

                  {/* Supplier - Truncated */}
                  <TableCell className="py-3">
                    <div
                      className="text-sm text-muted-foreground truncate max-w-42.5"
                      title={supplierName}
                    >
                      {supplierName}
                    </div>
                  </TableCell>

                  {/* Product Name - Truncated, ID removed */}
                  <TableCell className="py-3">
                    <div
                      className="text-sm font-medium truncate max-w-70"
                      title={displayName}
                    >
                      {displayName}
                    </div>
                  </TableCell>

                  {/* Category */}
                  <TableCell className="text-sm py-3">{categoryName}</TableCell>

                  {/* Unit */}
                  <TableCell className="text-sm py-3">{unitName}</TableCell>

                  {/* Action */}
                  <TableCell className="text-right py-3">
                    <Button
                      variant={product.barcode ? "ghost" : "default"}
                      size="sm"
                      className="h-8 px-2 lg:px-3"
                      onClick={() => onEdit(product)}
                    >
                      {product.barcode ? (
                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                      ) : (
                        <ScanBarcode className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      <span className="text-xs">
                        {product.barcode ? "Edit" : "Scan"}
                      </span>
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
