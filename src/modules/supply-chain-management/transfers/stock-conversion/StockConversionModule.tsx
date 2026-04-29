"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { toast } from "sonner";
import { useStockConversion } from "./hooks/useStockConversion";
import { StockConversionTable } from "./components/StockConversionTable";
import { StockConversionModal } from "./components/StockConversionModal";
import { RFIDManagementModal } from "./components/RFIDManagementModal";
import { StockConversionProduct, RFIDTag } from "./types";
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
  userName = "User",
  userEmail = "",
  userAvatar = "/avatars/shadcn.jpg",
}: StockConversionModuleProps) {
  // ── User data in a ref: never triggers re-renders ────────────────────────
  const userRef = useRef({
    id: userId,
    branchId: userBranchId,
    name: userName,
    email: userEmail,
    avatar: userAvatar,
  });
  userRef.current.id = userId;
  userRef.current.branchId = userBranchId;
  userRef.current.name = userName;
  userRef.current.email = userEmail;
  userRef.current.avatar = userAvatar;

  // ── Core state ────────────────────────────────────────────────────────────
  const [selectedBranchId, setSelectedBranchId] = useState<number>(
    userBranchId > 0 ? userBranchId : 0
  );
  const [branches, setBranches] = useState<{ id: number; branch_name: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/scm/inventory-management/branch-management");
        const json = await res.json();
        if (!cancelled && Array.isArray(json.branches)) {
          setBranches(json.branches);
        }
      } catch (err) {
        console.error("Failed to fetch branches", err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Scanner UI State ──────────────────────────────────────────────────────
  const [isScanning, setIsScanning] = useState(false);
  const [scannedSourceRfid, setScannedSourceRfid] = useState<string | null>(null);
  const rfidBuffer = useRef("");

  const {
    data,
    totalCount,
    page,
    pageSize,
    setPage,
    setPageSize,
    isLoading,
    error,
    refresh,
    loadInventory,
    loadProductsInventory,
    convertStock,
    checkProductRfids,
    validateDuplicateTag,
  } = useStockConversion(selectedBranchId > 0 ? selectedBranchId : undefined);


  const [selectedProduct, setSelectedProduct] = useState<StockConversionProduct | null>(null);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isRfidModalOpen, setIsRfidModalOpen] = useState(false);
  const [isSourceRfidModalOpen, setIsSourceRfidModalOpen] = useState(false);
  const [manualSourceRfid, setManualSourceRfid] = useState("");
  const [pendingSourceProduct, setPendingSourceProduct] = useState<StockConversionProduct | null>(null);
  const [pendingConversion, setPendingConversion] = useState<{
    qtyToConvert: number;
    targetUnitId: number;
    targetProductId: number;
    convertedQuantity: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── State mirror refs (for use inside stable callbacks) ───────────────────
  const selectedProductRef = useRef(selectedProduct);
  selectedProductRef.current = selectedProduct;

  const pendingConversionRef = useRef(pendingConversion);
  pendingConversionRef.current = pendingConversion;

  const selectedBranchIdRef = useRef(selectedBranchId);
  selectedBranchIdRef.current = selectedBranchId;

  // ── Stable callbacks ──────────────────────────────────────────────────────

  const handleOpenConversion = useCallback(async (product: StockConversionProduct, preScannedRfid?: string) => {
    // 1. If we already scanned a source RFID or it's provided, proceed to open conversion modal
    if (preScannedRfid) {
       setSelectedProduct(product);
       setPendingConversion(null);
       setIsUnitModalOpen(true);
       return;
    }

    const branchId = selectedBranchIdRef.current > 0 ? selectedBranchIdRef.current : userRef.current.branchId;

    // 2. Determine if it's a Box to Pieces conversion (source unit is Box)
    const isBoxSource = product.currentUnit?.toLowerCase().includes("box");

    if (isBoxSource) {
       // Demand source RFID for Box
       setPendingSourceProduct(product);
       setManualSourceRfid("");
       setIsSourceRfidModalOpen(true);
       return;
    }

    // 3. General Validation: Ensure the product has AT LEAST ONE RFID in the warehouse
    setIsSubmitting(true);
    try {
      const hasRfid = await checkProductRfids(product.productId, branchId);
      if (!hasRfid) {
        toast.error("Validation Failed", {
          description: "Cannot convert: No existing RFID tags detected for this product in this branch. Inventory mismatch."
        });
        return;
      }
    } finally {
      setIsSubmitting(false);
    }

    setSelectedProduct(product);
    setPendingConversion(null);
    setIsUnitModalOpen(true);
  }, [checkProductRfids]);

  const handleManualSourceRfidSubmit = async () => {
     if (!manualSourceRfid.trim() || !pendingSourceProduct) return;
     
     setIsSubmitting(true);
     try {
       const branchId = selectedBranchIdRef.current > 0 ? selectedBranchIdRef.current : userRef.current.branchId;
       const res = await fetch(`/api/scm/warehouse-management/stock-transfer?action=lookup_rfid&rfid=${encodeURIComponent(manualSourceRfid.trim())}&branch_id=${branchId}`);
       
       if (!res.ok) {
         toast.error("Invalid Source RFID", { description: "The scanned Box RFID does not exist in the warehouse." });
         return;
       }
       
       const match = await res.json();
       if (Number(match.productId) !== pendingSourceProduct.productId) {
         toast.error("Product Mismatch", { description: "The scanned Box RFID belongs to a different product." });
         return;
       }

       // Success: proceed
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

  const handleCloseUnitModal = useCallback(() => {
    setIsUnitModalOpen(false);
    setScannedSourceRfid(null);
  }, []);
  
  const handleCloseRfidModal = useCallback(() => {
    setIsRfidModalOpen(false);
    setScannedSourceRfid(null);
  }, []);

  // ── Global RFID listener ────────────────────────────────────────────────
  useEffect(() => {
    // We bind the listener globally, but exit early if busy.
    const handleGlobalKey = async (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Enter') {
        const val = rfidBuffer.current.trim();
        rfidBuffer.current = "";
        
        // Prevent action if modals are open or we're busy
        if (!val || isScanning || isSubmitting || isUnitModalOpen || isRfidModalOpen) return;

        setIsScanning(true);
        try {
          const branchId = selectedBranchIdRef.current > 0 ? selectedBranchIdRef.current : userRef.current.branchId;
          const res = await fetch(`/api/scm/warehouse-management/stock-transfer?action=lookup_rfid&rfid=${encodeURIComponent(val)}&branch_id=${branchId}`);
          
          if (!res.ok) {
            toast.error("RFID tags not recognized or not available.");
            return;
          }
          
          const match = await res.json();
          const pId = Number(match.productId);

          // Find product in current data table
          const product = data.find(p => p.productId === pId);
          if (product) {
            toast.success(`Scanned: ${product.productName || 'Product'}`, {
              description: "Select target unit to convert to."
            });
            setScannedSourceRfid(val);
            handleOpenConversion(product, val);
          } else {
            toast.error("Scanned product not loaded in the list.", {
              description: "Please load the product's inventory first."
            });
          }
        } catch {
          toast.error("Network error reading RFID.");
        } finally {
          setIsScanning(false);
        }
      } else if (e.key.length === 1) {
        rfidBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [data, isScanning, isSubmitting, isUnitModalOpen, isRfidModalOpen, handleOpenConversion]);

  // ✅ Fix: onBranchChange expects (branchId: number | undefined) => void
  // but setSelectedBranchId is Dispatch<SetStateAction<number>> which rejects undefined.
  // Wrap it so undefined maps to 0 (meaning "no branch selected").
  const handleBranchChange = useCallback((branchId: number | undefined) => {
    setSelectedBranchId(branchId ?? 0);
  }, []);

  const handleConfirmUnitConversion = useCallback(async (
    qtyToConvert: number,
    targetUnit: { unitId: number; targetProductId?: number },
    convertedQuantity: number
  ) => {
    console.log("[StockConversionModule] Confirming unit conversion:", {
      qtyToConvert,
      targetUnit,
      convertedQuantity,
    });

    setPendingConversion({
      qtyToConvert,
      targetUnitId: targetUnit.unitId,
      targetProductId: targetUnit.targetProductId ?? 0,
      convertedQuantity,
    });
    setIsUnitModalOpen(false);

    const current = selectedProductRef.current;
    if (!current) return;

    const targetUnitRecord = current.availableUnits?.find(
      (u) => u.unitId === targetUnit.unitId
    );
    const isBoxInvolved =
      current.currentUnit?.toLowerCase().includes("box") ||
      targetUnitRecord?.name?.toLowerCase().includes("box");

    if (isBoxInvolved) {
      setTimeout(() => {
        console.log("[StockConversionModule] Opening RFID Modal...");
        setIsRfidModalOpen(true);
      }, 150);
      return;
    }

    const user = userRef.current;
    const branchId = selectedBranchIdRef.current > 0
      ? selectedBranchIdRef.current
      : user.branchId > 0 ? user.branchId : 190;

    const payload = {
      productId: current.productId,
      sourceUnitId: current.currentUnitId ?? 11,
      targetUnitId: targetUnit.unitId,
      targetProductId: targetUnit.targetProductId ?? current.productId,
      quantityToConvert: qtyToConvert,
      convertedQuantity,
      pricePerUnit: current.pricePerUnit ?? 0,
      branchId,
      userId: user.id > 0 ? user.id : 24,
      rfidTags: [] as RFIDTag[],
      sourceRfidTags: scannedSourceRfid ? [scannedSourceRfid] : undefined,
    };

    setIsSubmitting(true);
    try {
      await convertStock(payload);
      setSelectedProduct(null);
      setPendingConversion(null);
      setScannedSourceRfid(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convertStock]);

  const handleConfirmRFID = useCallback(async (tags: RFIDTag[]) => {
    const currentProduct = selectedProductRef.current;
    const currentPending = pendingConversionRef.current;
    if (!currentProduct || !currentPending) return;

    const user = userRef.current;
    const branchId = selectedBranchIdRef.current > 0
      ? selectedBranchIdRef.current
      : user.branchId > 0 ? user.branchId : 190;

    const payload = {
      productId: currentProduct.productId,
      sourceUnitId: currentProduct.currentUnitId ?? 11,
      targetUnitId: currentPending.targetUnitId,
      targetProductId: currentPending.targetProductId ?? currentProduct.productId,
      quantityToConvert: currentPending.qtyToConvert,
      convertedQuantity: currentPending.convertedQuantity,
      pricePerUnit: currentProduct.pricePerUnit ?? 0,
      branchId,
      userId: user.id > 0 ? user.id : 24,
      rfidTags: tags,
      sourceRfidTags: scannedSourceRfid ? [scannedSourceRfid] : undefined,
    };

    console.log("[StockConversion] Confirming with payload:", payload);

    setIsSubmitting(true);
    try {
      await convertStock(payload);
      setIsRfidModalOpen(false);
      setSelectedProduct(null);
      setPendingConversion(null);
      setScannedSourceRfid(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convertStock]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
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
      <MemoizedStockConversionTable
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
        selectedBranchId={selectedBranchId > 0 ? selectedBranchId : undefined}
        onBranchChange={handleBranchChange}
      />

      <StockConversionModal
        product={selectedProduct}
        isOpen={isUnitModalOpen}
        onClose={handleCloseUnitModal}
        onConfirm={handleConfirmUnitConversion}
      />

      <RFIDManagementModal
        product={selectedProduct}
        conversionDetails={pendingConversion}
        isOpen={isRfidModalOpen}
        onClose={handleCloseRfidModal}
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
              You are converting a Box into pieces. Please scan or enter the specific RFID of the box you wish to convert.
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
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleManualSourceRfidSubmit();
                  }
                }}
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
