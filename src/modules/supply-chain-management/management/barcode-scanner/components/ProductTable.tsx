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
import { ScanBarcode, Edit } from "lucide-react"; // Assuming lucide-react is available via shadcn setup
import { Product, Category, Unit } from "../types";

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
}

export function ProductTable({ products, onEdit }: ProductTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-37.5">Barcode</TableHead>
            <TableHead>Product Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center h-24">
                No products found.
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

              return (
                <TableRow key={product.product_id}>
                  <TableCell className="font-mono">
                    {product.barcode ? (
                      <span className="text-foreground">{product.barcode}</span>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Missing
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {product.product_name}
                  </TableCell>
                  <TableCell>{categoryName}</TableCell>
                  <TableCell>{unitName}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={product.barcode ? "ghost" : "default"}
                      size="sm"
                      onClick={() => onEdit(product)}
                    >
                      {product.barcode ? (
                        <Edit className="h-4 w-4 mr-1" />
                      ) : (
                        <ScanBarcode className="h-4 w-4 mr-1" />
                      )}
                      {product.barcode ? "Edit" : "Scan"}
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
