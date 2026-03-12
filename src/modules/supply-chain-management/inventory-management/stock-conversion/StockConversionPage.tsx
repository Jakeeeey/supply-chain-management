"use client";

import { useState } from "react";
import { useStockConversion } from "./hooks/useStockConversion";
import { StockConversionTable } from "./components/StockConversionTable";
import { StockConversionModal } from "./components/StockConversionModal";
import { RFIDManagementModal } from "./components/RFIDManagementModal";
import { StockConversionProduct, RFIDTag } from "./types";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";

interface StockConversionPageProps {
  user?: {
    id?: number;
    branchId?: number;
    name?: string;
    email?: string;
  };
}

export default function StockConversionPage({ user }: StockConversionPageProps) {
  const { data, isLoading, error, refresh, convertStock } = useStockConversion();
  
  const [selectedProduct, setSelectedProduct] = useState<StockConversionProduct | null>(null);
  
  // Modal states
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isRfidModalOpen, setIsRfidModalOpen] = useState(false);
  
  // Pending conversion details
  const [pendingConversion, setPendingConversion] = useState<{
    qtyToConvert: number;
    targetUnitId: number;
    targetProductId: number;
    convertedQuantity: number;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenConversion = (product: StockConversionProduct) => {
    setSelectedProduct(product);
    setPendingConversion(null);
    setIsUnitModalOpen(true);
  };

  const handleConfirmUnitConversion = (qtyToConvert: number, targetUnit: { unitId: number, targetProductId?: number }, convertedQuantity: number) => {
    console.log("[StockConversionPage] Confirming unit conversion:", { qtyToConvert, targetUnit, convertedQuantity });
    setPendingConversion({ 
      qtyToConvert, 
      targetUnitId: targetUnit.unitId, 
      targetProductId: targetUnit.targetProductId || 0,
      convertedQuantity 
    });
    setIsUnitModalOpen(false);
    
    // Open RFID Modal immediately after
    setTimeout(() => {
      console.log("[StockConversionPage] Opening RFID Modal...");
      setIsRfidModalOpen(true);
    }, 150);
  };

  const handleConfirmRFID = async (tags: RFIDTag[]) => {
    if (!selectedProduct || !pendingConversion) return;
    
    setIsSubmitting(true);
    const payload = {
      productId: selectedProduct.productId,
      sourceUnitId: selectedProduct.currentUnitId || 11, // fallback to box
      targetUnitId: pendingConversion.targetUnitId,
      targetProductId: pendingConversion.targetProductId || selectedProduct.productId,
      quantityToConvert: pendingConversion.qtyToConvert,
      convertedQuantity: pendingConversion.convertedQuantity,
      pricePerUnit: selectedProduct.pricePerUnit || 0,
      branchId: user?.branchId || 190, // Use branchId from session or fallback
      userId: user?.id || 24, // Use userId from session or fallback
      rfidTags: tags
    };

    console.log("[StockConversion] Confirming with payload:", payload);
    
    setIsSubmitting(true);
    try {
      await convertStock(payload);
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
         onRefresh={refresh}
         isLoading={isLoading}
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
