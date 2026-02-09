import { useState, useEffect, useMemo } from "react";
import { Product } from "../types";
import { getProducts, updateProductBarcode } from "../providers/fetchProviders";
import { sortProductsByBarcodeStatus } from "../utils/sortUtils";
import { toast } from "sonner"; // Assuming sonner is the toast provider as per component list

export function useBarcodeScanner() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const sortedProducts = useMemo(() => {
    return sortProductsByBarcodeStatus(products);
  }, [products]);

  const handleUpdateBarcode = async (barcode: string) => {
    if (!selectedProduct) return;

    try {
      await updateProductBarcode(selectedProduct.product_id, { barcode });
      toast.success(`Barcode updated for ${selectedProduct.product_name}`);

      // Optimistic update locally to reflect changes instantly
      setProducts((prev) =>
        prev.map((p) =>
          p.product_id === selectedProduct.product_id ? { ...p, barcode } : p,
        ),
      );
    } catch (error) {
      toast.error("Failed to update barcode");
      throw error;
    }
  };

  return {
    products: sortedProducts,
    isLoading,
    selectedProduct,
    setSelectedProduct,
    handleUpdateBarcode,
    refreshData,
  };
}
