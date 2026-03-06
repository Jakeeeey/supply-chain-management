"use client";

import { useState } from "react";
import { useStockConversion } from "./hooks/useStockConversion";
import { StockConversionTable } from "./components/StockConversionTable";
import { StockConversionModal } from "./components/StockConversionModal";
import { RFIDManagementModal } from "./components/RFIDManagementModal";
import { StockConversionProduct, RFIDTag } from "./types";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";

export default function StockConversionPage() {
  const { data, isLoading, error, refresh, convertStock } = useStockConversion();
  
  const [selectedProduct, setSelectedProduct] = useState<StockConversionProduct | null>(null);
  
  // Modal states
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isRfidModalOpen, setIsRfidModalOpen] = useState(false);
  
  // Pending conversion details
  const [pendingConversion, setPendingConversion] = useState<{
    qtyToConvert: number;
    targetUnitId: number;
    convertedQuantity: number;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenConversion = (product: StockConversionProduct) => {
    setSelectedProduct(product);
    setPendingConversion(null);
    setIsUnitModalOpen(true);
  };

  const handleConfirmUnitConversion = (qtyToConvert: number, targetUnitId: number, convertedQuantity: number) => {
    setPendingConversion({ qtyToConvert, targetUnitId, convertedQuantity });
    setIsUnitModalOpen(false);
    
    // Open RFID Modal immediately after
    setTimeout(() => {
      setIsRfidModalOpen(true);
    }, 150);
  };

  const handleConfirmRFID = async (tags: RFIDTag[]) => {
    if (!selectedProduct || !pendingConversion) return;
    
    setIsSubmitting(true);
    try {
      await convertStock({
        productId: selectedProduct.productId,
        sourceUnitId: selectedProduct.currentUnitId || 11, // fallback to box
        targetUnitId: pendingConversion.targetUnitId,
        quantityToConvert: pendingConversion.qtyToConvert,
        convertedQuantity: pendingConversion.convertedQuantity,
        pricePerUnit: selectedProduct.pricePerUnit,
        branchId: 190, // We should get branchId from user session usually, using hardcoded for now or from env
        userId: 24, // Usually from user session
        rfidTags: tags
      });
      setIsRfidModalOpen(false);
      setSelectedProduct(null);
      setPendingConversion(null);
    } catch (e: any) {
      // Error handled by hook toast
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !data.length) {
    return <ModuleSkeleton hasActions={false} rowCount={8} />;
  }

  if (error) {
    return (
      <ErrorPage
        code="Error Fetching Stock"
        title="Conversion Data Unreachable"
        message={error}
        reset={refresh}
      />
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <StockConversionTable 
         data={data} 
         onConvertClick={handleOpenConversion} 
      />

      <StockConversionModal
        product={selectedProduct}
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        onConfirm={handleConfirmUnitConversion}
      />

      <RFIDManagementModal
        product={selectedProduct}
        conversionDetails={pendingConversion}
        isOpen={isRfidModalOpen}
        onClose={() => setIsRfidModalOpen(false)}
        onSubmit={handleConfirmRFID}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
