"use client";

import { useState, useEffect } from "react";
import { useStockConversion } from "./hooks/useStockConversion";
import { StockConversionTable } from "./components/StockConversionTable";
import { StockConversionModal } from "./components/StockConversionModal";
import { RFIDManagementModal } from "./components/RFIDManagementModal";
import { StockConversionProduct, RFIDTag } from "./types";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";

interface StockConversionModuleProps {
  user?: {
    id?: number;
    branchId?: number;
    name?: string;
    email?: string;
  };
}

export default function StockConversionModule({ user }: StockConversionModuleProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(user?.branchId);
  const [branches, setBranches] = useState<{ id: number; branch_name: string }[]>([]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await fetch("/api/scm/inventory-management/branch-management");
        const json = await res.json();
        if (json.branches) {
          setBranches(json.branches);
        }
      } catch (e) {
        console.error("Failed to fetch branches", e);
      }
    };
    fetchBranches();
  }, []);

  const { 
    data, totalCount, page, pageSize, setPage, setPageSize,
    isLoading, error, refresh, loadInventory, loadProductsInventory, convertStock 
  } = useStockConversion(selectedBranchId);
  
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

  const handleConfirmUnitConversion = async (qtyToConvert: number, targetUnit: { unitId: number, targetProductId?: number }, convertedQuantity: number) => {
    console.log("[StockConversionModule] Confirming unit conversion:", { qtyToConvert, targetUnit, convertedQuantity });
    setPendingConversion({ 
      qtyToConvert, 
      targetUnitId: targetUnit.unitId, 
      targetProductId: targetUnit.targetProductId || 0,
      convertedQuantity 
    });
    setIsUnitModalOpen(false);
    
    const targetUnitRecord = selectedProduct?.availableUnits?.find(u => u.unitId === targetUnit.unitId);
    const isBoxInvolved = 
      selectedProduct?.currentUnit?.toLowerCase().includes('box') ||
      targetUnitRecord?.name?.toLowerCase().includes('box');

    if (isBoxInvolved) {
      // Open RFID Modal immediately after
      setTimeout(() => {
        console.log("[StockConversionModule] Opening RFID Modal...");
        setIsRfidModalOpen(true);
      }, 150);
    } else {
      if (!selectedProduct) return;
      const payload = {
        productId: selectedProduct.productId,
        sourceUnitId: selectedProduct.currentUnitId || 11,
        targetUnitId: targetUnit.unitId,
        targetProductId: targetUnit.targetProductId || selectedProduct.productId,
        quantityToConvert: qtyToConvert,
        convertedQuantity: convertedQuantity,
        pricePerUnit: selectedProduct.pricePerUnit || 0,
        branchId: selectedBranchId || user?.branchId || 190,
        userId: user?.id || 24,
        rfidTags: []
      };

      setIsSubmitting(true);
      try {
        await convertStock(payload);
        setSelectedProduct(null);
        setPendingConversion(null);
      } catch (e: unknown) {
        console.error(e);
      } finally {
        setIsSubmitting(false);
      }
    }
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
      branchId: selectedBranchId || user?.branchId || 190, // Use selected or fallback
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
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = e as any;
      // Error handled by hook toast
      console.error(err);
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
         totalCount={totalCount}
         page={page}
         pageSize={pageSize}
         setPage={setPage}
         setPageSize={setPageSize}
         onConvertClick={handleOpenConversion} 
         onRefresh={loadInventory}
         loadProductsInventory={loadProductsInventory}
         isLoading={isLoading}
         branches={branches}
         selectedBranchId={selectedBranchId}
         onBranchChange={setSelectedBranchId}
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
