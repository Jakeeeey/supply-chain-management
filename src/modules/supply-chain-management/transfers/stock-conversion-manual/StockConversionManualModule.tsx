"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useStockConversionManual } from "./hooks/useStockConversionManual";
import { StockConversionTable } from "../stock-conversion/components/StockConversionTable";
import { StockConversionModal } from "../stock-conversion/components/StockConversionModal";
import type { StockConversionProduct } from "./types/stock-conversion-manual.types";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";

const MemoizedStockConversionTable = memo(StockConversionTable);

interface StockConversionManualModuleProps {
  userId?: number;
  userBranchId?: number;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
}

export default function StockConversionManualModule({
  userId = 0,
  userBranchId = 0,
}: StockConversionManualModuleProps) {
  const userRef = useRef({ id: userId, branchId: userBranchId });
  userRef.current.id = userId;
  userRef.current.branchId = userBranchId;

  const [selectedBranchId, setSelectedBranchId] = useState<number>(userBranchId);
  const [branches, setBranches] = useState<{ id: number; branch_name: string }[]>([]);

  useEffect(() => {
    fetch("/api/scm/inventory-management/branch-management")
      .then(res => res.json())
      .then(json => {
        if (Array.isArray(json.branches)) setBranches(json.branches);
      })
      .catch(err => console.error("Failed to fetch branches", err));
  }, []);

  const {
    data,
    totalCount,
    page,
    pageSize,
    setPage,
    setPageSize,
    options,
    isLoading,
    convertingId,
    error,
    refresh,
    loadProductsInventory,
    convertStock,
    setFilters,
  } = useStockConversionManual(selectedBranchId > 0 ? selectedBranchId : undefined);

  const [selectedProduct, setSelectedProduct] = useState<StockConversionProduct | null>(null);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);

  const handleOpenConversion = useCallback((product: StockConversionProduct) => {
    setSelectedProduct(product);
    setIsUnitModalOpen(true);
  }, []);

  const handleConfirmUnitConversion = useCallback(async (
    qtyToConvert: number,
    targetUnit: { unitId: number; targetProductId?: number; name?: string },
    convertedQuantity: number
  ) => {
    if (!selectedProduct) return;

    const branchId = selectedBranchId > 0 ? selectedBranchId : (userRef.current.branchId || 190);
    const payload = {
      productId: selectedProduct.productId,
      sourceUnitId: selectedProduct.currentUnitId ?? 11,
      targetUnitId: targetUnit.unitId,
      targetProductId: targetUnit.targetProductId ?? selectedProduct.productId,
      quantityToConvert: qtyToConvert,
      convertedQuantity,
      pricePerUnit: selectedProduct.pricePerUnit,
      branchId,
      userId: userRef.current.id || 24,
    };

    try {
      await convertStock(payload);
      setIsUnitModalOpen(false);
      setSelectedProduct(null);
    } finally {
      // Cleaned up
    }
  }, [selectedProduct, selectedBranchId, convertStock]);

  const hasLoadedOnce = useRef(false);
  if (!isLoading && data.length > 0) {
    hasLoadedOnce.current = true;
  }

  if (error) {
    return <ErrorPage code="500" title="Fetch Error" message={error} reset={refresh} />;
  }

  if (isLoading && !hasLoadedOnce.current) {
    return <ModuleSkeleton rowCount={10} />;
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <MemoizedStockConversionTable
        data={data}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        setPage={setPage}
        setPageSize={setPageSize}
        onConvertClick={handleOpenConversion}
        onRefresh={refresh}
        options={options}
        convertingId={convertingId}
        onFilterChange={setFilters}
        loadProductsInventory={loadProductsInventory}
        isLoading={isLoading}
        branches={branches}
        selectedBranchId={selectedBranchId > 0 ? selectedBranchId : undefined}
        onBranchChange={val => setSelectedBranchId(val ?? 0)}
      />

      <StockConversionModal
        product={selectedProduct}
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        onConfirm={handleConfirmUnitConversion}
      />
    </div>
  );
}
