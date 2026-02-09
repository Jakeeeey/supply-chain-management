"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ProductTable } from "./components/ProductTable";
import { ScannerModal } from "./components/ScannerModal";
import { useBarcodeScanner } from "./hooks/useBarcodeScanner";
import { Spinner } from "@/components/ui/spinner"; // Assuming a Spinner component exists based on list

export default function BarCodeScannerModule() {
  const {
    products,
    isLoading,
    selectedProduct,
    setSelectedProduct,
    handleUpdateBarcode,
  } = useBarcodeScanner();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Barcode Management
        </h1>
        <p className="text-muted-foreground">
          Scan or manually enter barcodes to assign them to existing products.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product List</CardTitle>
          <CardDescription>
            Showing {products.length} products. Items without barcodes are
            prioritized.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Spinner className="h-8 w-8 text-primary" />
            </div>
          ) : (
            <ProductTable
              products={products}
              onEdit={(product) => setSelectedProduct(product)}
            />
          )}
        </CardContent>
      </Card>

      <ScannerModal
        open={!!selectedProduct}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onSave={handleUpdateBarcode}
      />
    </div>
  );
}
