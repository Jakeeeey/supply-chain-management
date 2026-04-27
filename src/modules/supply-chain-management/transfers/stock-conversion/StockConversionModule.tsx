"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { toast } from "sonner";
import { useStockConversion } from "./hooks/useStockConversion";
import { useRFIDScanner } from "./hooks/useRFIDScanner";
import { StockConversionTable } from "./components/StockConversionTable";
import { StockConversionModal } from "./components/StockConversionModal";
import { RFIDManagementModal } from "./components/RFIDManagementModal";
import type { StockConversionProduct, RFIDTag } from "./types/stock-conversion.types";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScanLine } from "lucide-react";

const MemoizedStockConversionTable = memo(StockConversionTable);

interface StockConversionModuleProps {
  userId?: number;
  userBranchId?: number;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
}

export default function StockConversionModule({
  userId = 0,
  userBranchId = 0,
}: StockConversionModuleProps) {
  // ── User data in a ref ───────────────────────────────────────────────────
  const userRef = useRef({ id: userId, branchId: userBranchId });
  userRef.current.id = userId;
  userRef.current.branchId = userBranchId;

  // ── Core state ────────────────────────────────────────────────────────────
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
    validateDuplicateTag,
    setFilters,
  } = useStockConversion(selectedBranchId > 0 ? selectedBranchId : undefined);

  const [selectedProduct, setSelectedProduct] = useState<StockConversionProduct | null>(null);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isRfidModalOpen, setIsRfidModalOpen] = useState(false);
  const [isSourceRfidModalOpen, setIsSourceRfidModalOpen] = useState(false);
  const [manualSourceRfid, setManualSourceRfid] = useState("");
  const [pendingSourceProduct, setPendingSourceProduct] = useState<StockConversionProduct | null>(null);
  const [scannedSourceRfid, setScannedSourceRfid] = useState<string | null>(null);
  const [pendingConversion, setPendingConversion] = useState<{
    qtyToConvert: number;
    targetUnitId: number;
    targetProductId: number;
    convertedQuantity: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Logic ─────────────────────────────────────────────────────────────────

  const handleOpenConversion = useCallback(async (product: StockConversionProduct, preScannedRfid?: string) => {
    if (preScannedRfid) {
       setSelectedProduct(product);
       setPendingConversion(null);
       setIsUnitModalOpen(true);
       return;
    }

    const isBoxSource = product.currentUnit?.toLowerCase().includes("box");

    if (isBoxSource) {
       setPendingSourceProduct(product);
       setManualSourceRfid("");
       setIsSourceRfidModalOpen(true);
       return;
    }

    // For non-box sources (Ties, Pieces, etc.), we don't strictly require 
    // an existing RFID in v_rfid_onhand to start the conversion process.
    setSelectedProduct(product);
    setPendingConversion(null);
    setIsUnitModalOpen(true);
  }, []);

  const handleManualSourceRfidSubmit = async () => {
     if (!manualSourceRfid.trim() || !pendingSourceProduct) return;
     
     setIsSubmitting(true);
     try {
       const branchId = selectedBranchId > 0 ? selectedBranchId : userRef.current.branchId;
       const res = await fetch(`/api/scm/warehouse-management/stock-transfer?action=lookup_rfid&rfid=${encodeURIComponent(manualSourceRfid.trim())}&branch_id=${branchId}`);
       
       if (!res.ok) {
         toast.error("Invalid Source RFID", { description: "The scanned Box RFID does not exist." });
         return;
       }
       
       const match = await res.json();
       if (Number(match.productId) !== pendingSourceProduct.productId) {
         toast.error("Product Mismatch", { description: "The scanned Box RFID belongs to a different product." });
         return;
       }

       setScannedSourceRfid(manualSourceRfid.trim());
       setIsSourceRfidModalOpen(false);
       setSelectedProduct(pendingSourceProduct);
       setPendingConversion(null);
       setIsUnitModalOpen(true);
     } catch {
       toast.error("Error validating source RFID");
     } finally {
       setIsSubmitting(false);
     }
  };

  // ── RFID Scanner Hook ─────────────────────────────────────────────────────
  useRFIDScanner({
    enabled: !isLoading && !isSubmitting && !isUnitModalOpen && !isRfidModalOpen && !isSourceRfidModalOpen,
    onScan: async (val) => {
      try {
        const branchId = selectedBranchId > 0 ? selectedBranchId : userRef.current.branchId;
        const res = await fetch(`/api/scm/warehouse-management/stock-transfer?action=lookup_rfid&rfid=${encodeURIComponent(val)}&branch_id=${branchId}`);
        if (!res.ok) {
          toast.error("RFID tag not recognized or unavailable.");
          return;
        }
        const match = await res.json();
        const product = data.find(p => p.productId === Number(match.productId));
        if (product) {
          toast.success(`Scanned: ${product.productName}`);
          setScannedSourceRfid(val);
          handleOpenConversion(product, val);
        } else {
          toast.error("Scanned product not found in current list.");
        }
      } catch {
        toast.error("Error reading RFID scanner.");
      }
    }
  });

  const handleConfirmUnitConversion = useCallback(async (
    qtyToConvert: number,
    targetUnit: { unitId: number; targetProductId?: number; name?: string },
    convertedQuantity: number
  ) => {
    setPendingConversion({
      qtyToConvert,
      targetUnitId: targetUnit.unitId,
      targetProductId: targetUnit.targetProductId ?? 0,
      convertedQuantity,
    });
    setIsUnitModalOpen(false);

    if (!selectedProduct) return;

    // Logic: 
    // 1. If TARGET is a Box, we NEED to assign new RFIDs.
    // 2. If TARGET is NOT a box, but SOURCE WAS a box, we just use the scannedSourceRfid.
    const isTargetBox = targetUnit.name?.toLowerCase().includes("box");

    if (isTargetBox) {
      setTimeout(() => setIsRfidModalOpen(true), 150);
      return;
    }

    // Execution for non-box targets (including Box -> Piece)
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
      rfidTags: [] as RFIDTag[],
      sourceRfidTags: scannedSourceRfid ? [scannedSourceRfid] : undefined,
    };

    setIsSubmitting(true);
    try {
      await convertStock(payload);
      setSelectedProduct(null);
      setPendingConversion(null);
      setScannedSourceRfid(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedProduct, selectedBranchId, scannedSourceRfid, convertStock]);

  const handleConfirmRFID = useCallback(async (tags: RFIDTag[]) => {
    if (!selectedProduct || !pendingConversion) return;

    const branchId = selectedBranchId > 0 ? selectedBranchId : (userRef.current.branchId || 190);
    const payload = {
      productId: selectedProduct.productId,
      sourceUnitId: selectedProduct.currentUnitId ?? 11,
      targetUnitId: pendingConversion.targetUnitId,
      targetProductId: pendingConversion.targetProductId || selectedProduct.productId,
      quantityToConvert: pendingConversion.qtyToConvert,
      convertedQuantity: pendingConversion.convertedQuantity,
      pricePerUnit: selectedProduct.pricePerUnit,
      branchId,
      userId: userRef.current.id || 24,
      rfidTags: tags,
      sourceRfidTags: scannedSourceRfid ? [scannedSourceRfid] : undefined,
    };

    setIsSubmitting(true);
    try {
      await convertStock(payload);
      setIsRfidModalOpen(false);
      setSelectedProduct(null);
      setPendingConversion(null);
      setScannedSourceRfid(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedProduct, pendingConversion, selectedBranchId, scannedSourceRfid, convertStock]);

  if (error) {
    return <ErrorPage code="500" title="Fetch Error" message={error} reset={refresh} />;
  }

  if (isLoading && data.length === 0) {
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

      <RFIDManagementModal
        product={selectedProduct}
        conversionDetails={pendingConversion}
        isOpen={isRfidModalOpen}
        onClose={() => setIsRfidModalOpen(false)}
        onSubmit={handleConfirmRFID}
        isSubmitting={isSubmitting}
        validateTag={validateDuplicateTag}
      />

      <Dialog open={isSourceRfidModalOpen} onOpenChange={setIsSourceRfidModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-blue-500" />
              Scan Source Box RFID
            </DialogTitle>
            <DialogDescription>
              Scan or enter the specific RFID of the box you wish to convert.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="text-sm font-semibold p-3 bg-muted rounded-md border text-center">
                {pendingSourceProduct?.productName}
             </div>
             <Input 
                value={manualSourceRfid}
                onChange={e => setManualSourceRfid(e.target.value)}
                placeholder="Scan or type Box RFID..."
                disabled={isSubmitting}
                className="w-full text-center font-bold tracking-widest text-lg"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleManualSourceRfidSubmit(); }}
             />
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsSourceRfidModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
             <Button onClick={handleManualSourceRfidSubmit} disabled={!manualSourceRfid.trim() || isSubmitting} className="bg-blue-600 hover:bg-blue-700">
               {isSubmitting ? "Validating..." : "Confirm"}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
