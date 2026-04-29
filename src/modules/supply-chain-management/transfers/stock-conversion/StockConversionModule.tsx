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
import { Cuboid, ScanLine, X } from "lucide-react";

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
  const [scannedSourceRfids, setScannedSourceRfids] = useState<string[]>([]);
  const [pendingConversion, setPendingConversion] = useState<{
    qtyToConvert: number;
    targetUnitId: number;
    targetProductId: number;
    convertedQuantity: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Logic ─────────────────────────────────────────────────────────────────

  const handleOpenConversion = useCallback(async (product: StockConversionProduct, preScannedRfid?: string) => {
    const isBoxSource = product.currentUnit?.toLowerCase().includes("box") || product.currentUnit?.toLowerCase().includes("pack");

    if (isBoxSource) {
       setPendingSourceProduct(product);
       setScannedSourceRfids(preScannedRfid ? [preScannedRfid] : []);
       setManualSourceRfid("");
       setIsSourceRfidModalOpen(true);
       return;
    }

    // For non-RFID sources (Ties, Pieces, etc.)
    if (preScannedRfid) setScannedSourceRfids([preScannedRfid]);
    setSelectedProduct(product);
    setPendingConversion(null);
    setIsUnitModalOpen(true);
  }, []);

  const handleManualSourceRfidSubmit = async () => {
      const tag = manualSourceRfid.trim();
      if (!tag || !pendingSourceProduct) return;

      if (scannedSourceRfids.includes(tag)) {
        toast.error("Duplicate Scan", { description: "You have already scanned this box in the current batch." });
        setManualSourceRfid("");
        return;
      }
      
      setIsSubmitting(true);
      try {
        const branchId = selectedBranchId > 0 ? selectedBranchId : userRef.current.branchId;
        const res = await fetch(`/api/scm/warehouse-management/stock-transfer?action=lookup_rfid&rfid=${encodeURIComponent(tag)}&branch_id=${branchId}&_t=${Date.now()}`);
        
        if (!res.ok) {
          toast.error("Invalid Source RFID", { description: "The scanned Box RFID does not exist." });
          return;
        }
        
        const match = await res.json();
        if (Number(match.productId) !== pendingSourceProduct.productId) {
          toast.error("Product Mismatch", { description: "The scanned Box RFID belongs to a different product." });
          return;
        }

        // DOUBLE-CHECK HISTORY: Ensure this source tag hasn't been "spent" already
        const historyCheck = await validateDuplicateTag(tag, "source");
        if (historyCheck.exists && historyCheck.reason === "history") {
          toast.error("RFID Already Used", { 
            description: "This tag has already been converted or adjusted out. Please use an active tag." 
          });
          return;
        }

        setScannedSourceRfids(prev => [...prev, tag]);
        setManualSourceRfid("");
        toast.success("Box Added", { description: `Batch size: ${scannedSourceRfids.length + 1}` });
      } catch {
        toast.error("Error validating source RFID");
      } finally {
        setIsSubmitting(false);
      }
  };

  const handleConfirmSourceBatch = () => {
    if (scannedSourceRfids.length === 0 || !pendingSourceProduct) return;
    setIsSourceRfidModalOpen(false);
    setSelectedProduct(pendingSourceProduct);
    setPendingConversion(null);
    setIsUnitModalOpen(true);
  };

  // ── RFID Scanner Hook ─────────────────────────────────────────────────────
  useRFIDScanner({
    enabled: !isLoading && !isSubmitting && !isUnitModalOpen && !isRfidModalOpen && !isSourceRfidModalOpen,
    onScan: async (val) => {
      try {
        const branchId = selectedBranchId > 0 ? selectedBranchId : userRef.current.branchId;
        const res = await fetch(`/api/scm/warehouse-management/stock-transfer?action=lookup_rfid&rfid=${encodeURIComponent(val)}&branch_id=${branchId}&_t=${Date.now()}`);
        if (!res.ok) {
          toast.error("RFID tag not recognized or unavailable.");
          return;
        }
        const match = await res.json();
        const product = data.find((p: StockConversionProduct) => p.productId === Number(match.productId));
        if (product) {
          // Double-check history for background scans too
          const historyCheck = await validateDuplicateTag(val, "source");
          if (historyCheck.exists && historyCheck.reason === "history") {
             toast.error("RFID Already Used", { description: "This tag has already been converted." });
             return;
          }

          toast.success(`Scanned: ${product.productName}`);
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
    // 1. If TARGET is a Box or Pack, we NEED to assign new RFIDs.
    // 2. If TARGET is NOT a box/pack, but SOURCE WAS a box/pack, we just use the scannedSourceRfid.
    const isTargetBoxOrPack = targetUnit.name?.toLowerCase().includes("box") || targetUnit.name?.toLowerCase().includes("pack");

    if (isTargetBoxOrPack) {
      setTimeout(() => setIsRfidModalOpen(true), 150);
      return;
    }

    // Execution for non-rfid targets (e.g. converting to Pieces)
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
      sourceRfidTags: scannedSourceRfids.length > 0 ? scannedSourceRfids : undefined,
    };

    setIsSubmitting(true);
    try {
      await convertStock(payload);
      setSelectedProduct(null);
      setPendingConversion(null);
      setScannedSourceRfids([]);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedProduct, selectedBranchId, scannedSourceRfids, convertStock]);

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
      sourceRfidTags: scannedSourceRfids.length > 0 ? scannedSourceRfids : undefined,
    };

    setIsSubmitting(true);
    try {
      await convertStock(payload);
      setIsRfidModalOpen(false);
      setSelectedProduct(null);
      setPendingConversion(null);
      setScannedSourceRfids([]);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedProduct, pendingConversion, selectedBranchId, scannedSourceRfids, convertStock]);

  // Track if we've successfully loaded data at least once
  const hasLoadedOnce = useRef(false);
  if (!isLoading && data.length > 0) {
    hasLoadedOnce.current = true;
  }

  if (error) {
    return <ErrorPage code="500" title="Fetch Error" message={error} reset={refresh} />;
  }

  // Only show the big skeleton on the very first mount. 
  // Subsequent refreshes (like searching) will handle loading inside the table.
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
        sourceQuantity={scannedSourceRfids.length > 0 ? scannedSourceRfids.length : undefined}
      />

      <RFIDManagementModal
        product={selectedProduct}
        conversionDetails={pendingConversion}
        isOpen={isRfidModalOpen}
        onClose={() => setIsRfidModalOpen(false)}
        onSubmit={handleConfirmRFID}
        isSubmitting={isSubmitting}
        validateTag={validateDuplicateTag}
        sourceRfidTags={scannedSourceRfids}
      />

      <Dialog open={isSourceRfidModalOpen} onOpenChange={(open) => {
          if (!open && !isSubmitting) {
             setIsSourceRfidModalOpen(false);
             setScannedSourceRfids([]); // Clear the batch if cancelled
             setManualSourceRfid("");
          }
      }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-blue-500" />
              Scan Source Box RFIDs
            </DialogTitle>
            <DialogDescription>
              Scan the RFIDs of the boxes you want to convert. You can scan multiple boxes to batch them together.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-4">
             <div className="text-sm font-semibold p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md border border-blue-500/20 text-center flex items-center justify-center gap-2">
                <Cuboid className="w-4 h-4" />
                {pendingSourceProduct?.productName}
             </div>
             
             <Input 
                value={manualSourceRfid}
                onChange={e => setManualSourceRfid(e.target.value)}
                placeholder="Scan or type Box RFID..."
                disabled={isSubmitting}
                className="w-full text-center font-bold tracking-widest text-lg h-12"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleManualSourceRfidSubmit(); }}
             />

             {/* Scanned Batch List */}
             <div className="border border-border rounded-lg bg-muted/20 shadow-inner" style={{ height: "200px" }}>
                {scannedSourceRfids.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-muted-foreground animate-in fade-in duration-500">
                      <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-2 border border-border/50">
                         <ScanLine className="w-5 h-5 text-muted-foreground/50" />
                      </div>
                      <p className="font-bold text-primary tracking-tight text-sm">No Boxes Scanned</p>
                      <p className="text-[11px] font-medium opacity-70">Scan boxes to build a batch</p>
                   </div>
                ) : (
                   <div className="h-full overflow-y-auto p-2 space-y-2">
                       {scannedSourceRfids.map((tag, index) => (
                         <div key={tag} className="flex items-center justify-between bg-card p-2.5 rounded-md border border-border shadow-sm">
                            <div className="flex items-center gap-3 min-w-0">
                               <div className="w-6 h-6 shrink-0 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold text-[10px] border border-blue-500/20">
                                  {index + 1}
                               </div>
                               <div className="font-bold text-foreground text-sm tracking-tight truncate">{tag}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-6 h-6 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              onClick={() => setScannedSourceRfids(prev => prev.filter(t => t !== tag))}
                              disabled={isSubmitting}
                            >
                               <X className="w-3.5 h-3.5" />
                            </Button>
                         </div>
                       ))}
                   </div>
                )}
             </div>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-4">
             <div className="text-sm font-bold text-muted-foreground">
                Total Boxes: <span className="text-foreground text-lg">{scannedSourceRfids.length}</span>
             </div>
             <div className="flex gap-2">
                 <Button variant="outline" onClick={() => setIsSourceRfidModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
                 <Button onClick={handleConfirmSourceBatch} disabled={scannedSourceRfids.length === 0 || isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                   {isSubmitting ? "Processing..." : "Confirm Batch"}
                 </Button>
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
