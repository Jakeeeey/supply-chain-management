"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Printer, X, Loader2, Save, Send, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type {
  ReturnToSupplier,
  CartItem,
  InventoryRecord,
} from "../types/rts.schema";
import {
  getTransactionDetails,
  updateTransaction,
} from "../providers/fetchProviders";
import { useGlobalScanner } from "../hooks/useGlobalScanner";
import { validateBarcode } from "../utils/barcodeUtils";
import { PrintableReturnSlip } from "./PrintableReturnSlip";
import { ReturnReviewPanel } from "./ReturnReviewPanel";
import { ProductPicker } from "./ProductPicker";
import { useReturnCreationData } from "../hooks/useReturnCreationData";
import { calculateLineItem } from "../utils/calculations";

interface ReturnDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReturnToSupplier | null;
  onUpdateSuccess?: () => void;
}

interface VariantItem {
  id: string;
  masterId: string;
  code: string;
  name: string;
  unit: string;
  unitCount: number;
  stock: number;
  price: number;
  uom_id: number;
  discountType?: string;
  supplierDiscount: number;
  discountId?: number;
}

export function ReturnDetailsModal({
  isOpen,
  onClose,
  data,
  onUpdateSuccess,
}: ReturnDetailsModalProps) {
  const componentRef = useRef<HTMLDivElement>(null);
  const {
    refs,
    inventory,
    loadInventory,
    isLoading: isLoadingInventory,
  } = useReturnCreationData(isOpen);

  const [items, setItems] = useState<CartItem[]>([]);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isEditable, setIsEditable] = useState(false);

  const [currentSupplierId, setCurrentSupplierId] = useState<number | null>(
    null,
  );
  const [currentBranchId, setCurrentBranchId] = useState<number | null>(null);

  // 1. Initialize Data
  useEffect(() => {
    if (isOpen && data) {
      const isPending = data.status === "Pending";
      setIsEditable(isPending);
      setRemarks(data.remarks || "");

      const supplierObj = refs.suppliers.find(
        (s) => s.supplier_name === data.supplier,
      );
      const branchObj = refs.branches.find(
        (b) => b.branch_name === data.branch,
      );

      if (supplierObj) setCurrentSupplierId(supplierObj.id);
      if (branchObj) setCurrentBranchId(branchObj.id);

      const fetchDetails = async () => {
        setLoading(true);
        try {
          const fetched = await getTransactionDetails(String(data.id));
          const cartItems: CartItem[] = fetched.map((i) => {
            const validUnitCount = i.unitCount > 0 ? i.unitCount : 1;
            return {
              cartId: crypto.randomUUID(),
              id: String(i.productId), // Simple ID for matching logic
              product_id: i.productId, // actual DB item reference
              code: i.code,
              name: i.name,
              price: i.price,
              unit: i.unit,
              uom_id: i.uomId,
              quantity: i.quantity / validUnitCount,
              onHand: 0,
              discount: i.discountRate,
              customPrice: i.price,
              unitCount: validUnitCount,
              return_type_id: i.returnTypeId,
              parentId: null,
            };
          });
          setItems(cartItems);
        } catch (err: unknown) {
          const msg = (err as { message?: string })?.message || "Failed to load details";
          toast.error("Error", { description: msg });
        } finally {
          setLoading(false);
        }
      };
      fetchDetails();
    } else {
      setItems([]);
      setCurrentSupplierId(null);
      setCurrentBranchId(null);
    }
  }, [isOpen, data, refs.suppliers, refs.branches]);

  // 2. Trigger Inventory Load
  useEffect(() => {
    if (isOpen && currentSupplierId && currentBranchId) {
      loadInventory(currentBranchId, currentSupplierId);
    }
  }, [isOpen, currentSupplierId, currentBranchId, loadInventory]);

  // 3. Sync Items with Inventory
  useEffect(() => {
    if (inventory.length > 0 && items.length > 0) {
      setItems((prevItems) => {
        let hasChanges = false;
        const nextItems = prevItems.map((item) => {
          const invRecord = inventory.find(
            (r) => String(r.product_id) === item.id,
          );

          if (invRecord) {
            const realStock = invRecord.running_inventory;
            const needsUpdate =
              item.unit !== invRecord.unit_name ||
              item.onHand !== realStock ||
              item.unitCount !== invRecord.unit_count;

            if (needsUpdate) {
              hasChanges = true;
              return {
                ...item,
                unit: invRecord.unit_name || item.unit,
                unitCount: invRecord.unit_count || item.unitCount,
                onHand: realStock,
              };
            }
          }
          return item;
        });
        return hasChanges ? nextItems : prevItems;
      });
    }
  }, [inventory, items.length]);

  // 4. Group Items for Picker
  const availableProducts = useMemo(() => {
    if (!currentSupplierId || inventory.length === 0) return [];

    const connectionMap = new Map<string, (typeof refs.connections)[0]>();
    refs.connections.forEach((c) =>
      connectionMap.set(`${c.product_id}-${c.supplier_id}`, c),
    );

    const discountMap = new Map<string, (typeof refs.lineDiscounts)[0]>();
    refs.lineDiscounts.forEach((d) => discountMap.set(String(d.id), d));

    const enrichedItems = inventory
      .map((item: InventoryRecord) => {
        const connection = connectionMap.get(
          `${item.product_id}-${currentSupplierId}`,
        );

        let discountLabel: string | undefined;
        let computedDiscount = 0;
        let currentDiscountId: number | undefined;

        if (connection?.discount_type) {
          const discountObj = discountMap.get(String(connection.discount_type));
          if (discountObj) {
            computedDiscount = parseFloat(discountObj.percentage) / 100;
            discountLabel = discountObj.line_discount;
            currentDiscountId = discountObj.id;
          } else {
            discountLabel = String(connection.discount_type);
            currentDiscountId = connection.discount_type;
          }
        }

        const matchedUnit = refs.units.find(
          (u) => u.unit_name === item.unit_name,
        );

        return {
          id: String(item.product_id), // Search ID (for quantity increment logic)
          product_id: item.product_id, // actual DB item reference
          masterId: String(item.familyId),
          code: item.product_code || "N/A",
          name: item.product_name,
          unit: item.unit_name,
          unitCount: item.unit_count,
          stock: item.running_inventory,
          price: item.price,
          uom_id: matchedUnit?.unit_id || 0,
          discountType: discountLabel,
          supplierDiscount: computedDiscount,
          discountId: currentDiscountId,
        } as VariantItem;
      })
      .filter((p) => {
        const isAlreadyInCart = items.some((i) => i.id === p.id);
        return p.stock > 0 || isAlreadyInCart;
      });

    const groups: Record<string, {
      masterId: string;
      masterCode: string;
      masterName: string;
      variants: VariantItem[];
    }> = {};

    enrichedItems.forEach((item) => {
      const groupKey = item.masterId;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          masterId: groupKey,
          masterCode: item.code,
          masterName: item.name,
          variants: [],
        };
      }
      groups[groupKey].variants.push(item);
    });

    return Object.values(groups).map((group) => {
      group.variants.sort((a, b) => a.unitCount - b.unitCount);
      if (group.variants.length > 0) {
        group.masterName = group.variants[0].name;
      }
      group.variants.sort((a, b) => b.unitCount - a.unitCount);
      return group;
    });
  }, [
    refs.connections,
    refs.lineDiscounts,
    refs.units,
    currentSupplierId,
    inventory,
    items,
  ]);

  /**
   * HANDLERS: Barcode Scanning
   */
  const addToCartInternal = useCallback((p_raw: unknown, qty = 1) => {
    const p = p_raw as CartItem & { stock?: number; supplierDiscount?: number };
    setItems((prev) => {
      // Find exact same product variant to increment quantity
      const exists = prev.find((i) => String(i.id) === String(p.id) && i.uom_id === p.uom_id);
      if (exists)
        return prev.map((i) =>
          String(i.id) === String(p.id) && i.uom_id === p.uom_id
            ? { ...i, quantity: i.quantity + qty }
            : i,
        );
      return [
        ...prev,
        {
          ...p,
          cartId: crypto.randomUUID(),
          quantity: qty,
          onHand: p.stock || 0,
          discount: p.supplierDiscount || 0,
          discountId: p.discountId,
          customPrice: p.price,
        } as CartItem,
      ];
    });
  }, []);

  const handleBarcodeScan = useCallback((barcode: string) => {
    if (!barcode.trim() || !isEditable) return;
    
    const validation = validateBarcode(barcode);
    if (!validation.isValid) {
      toast.error("Barcode Error", { description: validation.error });
      return;
    }

    const inv = inventory.find((r) => r.product_barcode === barcode || r.product_code === barcode);
    if (!inv) {
      toast.error("Product Not Found", { description: "Barcode matches no products for this Supplier/Branch." });
      return;
    }

    const matchedUnit = refs.units.find((u) => u.unit_name === inv.unit_name);

    addToCartInternal({
      id: String(inv.product_id), // Standard Identity
      cartId: crypto.randomUUID(),
      product_id: inv.product_id,
      code: inv.product_code,
      name: inv.product_name,
      unit: inv.unit_name,
      unitCount: inv.unit_count,
      stock: inv.running_inventory,
      price: inv.price,
      uom_id: matchedUnit?.unit_id || 0,
      supplierDiscount: 0,
    }, 1);

    if (!matchedUnit) {
      toast.error("UOM Error", { description: `Could not resolve UOM for unit "${inv.unit_name}"` });
      return;
    }

    toast.success("Barcode Added", { description: `Added "${inv.product_name}"` });
  }, [inventory, isEditable, refs.units, addToCartInternal]);

  /**
   * GLOBAL SCAN CAPTURE: Routes barcode scans to the handler.
   */
  useGlobalScanner({
    enabled: isOpen && isEditable && !showPicker,
    onScan: (val) => {
      handleBarcodeScan(val);
    }
  });

  // Print/Preview handler
  const handlePreview = () => {
    if (!componentRef.current) return;

    const content = componentRef.current.innerHTML;
    const printWindow = window.open("", "_blank");

    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Return Slip Preview - ${data?.returnNo}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body { background-color: #f8fafc; padding: 40px; }
              @media print {
                body { background-color: white; padding: 0; }
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div class="no-print" style="margin-bottom: 20px; display: flex; gap: 10px; justify-content: flex-end;">
               <button onclick="window.print()" style="background-color: #0f172a; color: white; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; border: none;">🖨️ Print Now</button>
               <button onclick="window.close()" style="background-color: white; color: #64748b; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer;">Close</button>
            </div>
            <div style="background: white; padding: 40px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border-radius: 8px;">
              ${content}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleSave = async (post: boolean = false) => {
    if (!data) return;

    const missingReturnType = items.some((item) => !item.return_type_id);
    if (missingReturnType) {
      toast.error("Validation Error", {
        description: "Please select a 'Return Type' for all items before saving.",
      });
      return;
    }

    const missingUom = items.find((item) => !item.uom_id);
    if (missingUom) {
      toast.error("Validation Error", {
        description: `Product "${missingUom.name}" is missing a valid Unit of Measure (UOM). Please re-add the item.`,
      });
      return;
    }

    setSaving(true);
    try {
      const rts_items = items.map((item) => {
        const { gross, discountAmount, net } = calculateLineItem(item);
        return {
          product_id: Number(item.product_id), // Clean mapping
          uom_id: item.uom_id,
          quantity: item.quantity * (item.unitCount || 1),
          gross_unit_price: item.customPrice || item.price,
          gross_amount: gross,
          discount_rate: item.discount * 100,
          discount_amount: discountAmount,
          net_amount: net,
          return_type_id: item.return_type_id || null,
          item_remarks: "",
        };
      });

      const payload = {
        supplier_id: currentSupplierId ?? 0,
        branch_id: currentBranchId ?? 0,
        transaction_date: data.returnDate,
        is_posted: post ? 1 : 0,
        remarks: remarks,
        rts_items: rts_items,
      };

      await updateTransaction(String(data.id), payload);

      toast.success("Success", {
        description: "Transaction updated successfully.",
      });
      if (onUpdateSuccess) onUpdateSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Failed to update transaction.";
      toast.error("Error", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  if (!data) return null;

  // Map data for printing
  const printableItems = items.map((i) => {
    const returnTypeObj = refs.returnTypes.find(
      (rt) => String(rt.id) === String(i.return_type_id),
    );
    const returnTypeName = returnTypeObj
      ? returnTypeObj.return_type_name || "-"
      : "-";

    return {
      code: i.code,
      name: i.name,
      unit: i.unit,
      quantity: i.quantity,
      price: i.customPrice || i.price,
      discount: i.discount,
      total: (i.customPrice || i.price) * i.quantity * (1 - i.discount),
      returnType: returnTypeName,
    };
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-[1200px]! w-[90vw]! h-[90vh] bg-background p-0 gap-0 flex flex-col overflow-hidden shadow-2xl sm:rounded-xl border border-border [&>button]:hidden">
          {/* Header */}
          <div className="flex flex-row items-center justify-between px-8 py-6 bg-background shrink-0 border-b">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                {isEditable ? "Edit Return to Supplier" : "Return Details"}
              </DialogTitle>
              <div className="flex items-center gap-3 text-sm mt-1">
                <span className="text-muted-foreground">{data.returnNo}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handlePreview()}
                className="h-9"
              >
                <Printer className="h-4 w-4 mr-2" /> Print / Preview
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-9 w-9 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-md transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-background p-6">
            <div className="bg-muted/30 rounded-xl p-6 h-full">
              {/* Header Info */}
              <div className="bg-card rounded-xl border p-6 shadow-sm mb-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Supplier
                      </Label>
                      <div className="flex items-center px-3 h-10 rounded-md border bg-muted/50 text-sm font-medium shadow-sm">
                        {data.supplier}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Branch
                      </Label>
                      <div className="flex items-center px-3 h-10 rounded-md border bg-muted/50 text-sm font-medium shadow-sm">
                        {data.branch}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Return Date
                      </Label>
                      <div className="flex items-center px-3 h-10 rounded-md border bg-muted/50 text-sm font-medium shadow-sm">
                        {new Date(data.returnDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Document Ref No.
                      </Label>
                      <div className="flex items-center px-3 h-10 rounded-md border bg-muted/50 text-sm font-medium shadow-sm">
                        {data.returnNo}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Status
                      </Label>
                      <div
                        className={`flex items-center px-3 h-10 rounded-md border text-sm font-bold shadow-sm ${
                          data.status === "Posted"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}
                      >
                        {data.status}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products to Return */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold">
                  Products to Return
                </h3>
                <div className="flex items-center gap-2">
                  {isEditable && (
                    <Button
                      size="sm"
                      onClick={() => setShowPicker(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Products
                    </Button>
                  )}
                </div>
              </div>

              {/* Review Panel */}
              <div>
                <ReturnReviewPanel
                  items={items}
                  lineDiscounts={refs.lineDiscounts}
                  returnTypes={refs.returnTypes || []}
                  onUpdateItem={(cartId, field, val) =>
                    setItems((prev) =>
                      prev.map((i) =>
                        i.cartId === cartId ? { ...i, [field]: val } : i,
                      ),
                    )
                  }
                  onRemoveItem={(cartId) =>
                    setItems((prev) => prev.filter((i) => i.cartId !== cartId))
                  }
                  remarks={remarks}
                  setRemarks={setRemarks}
                  readOnly={!isEditable}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-8 py-4 border-t bg-background flex justify-end gap-2 shrink-0">
            <Button variant="outline" onClick={onClose}>
              {isEditable ? "Cancel" : "Close"}
            </Button>
            {isEditable && (
              <>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}{" "}
                  Save Changes
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}{" "}
                  POST Return
                </Button>
              </>
            )}
          </div>
        </DialogContent>

        <div
          style={{
            position: "absolute",
            top: "-10000px",
            left: "-10000px",
            zIndex: -10,
          }}
        >
          <PrintableReturnSlip
            ref={componentRef}
            data={data}
            items={printableItems}
            lineDiscounts={refs.lineDiscounts}
          />
        </div>
      </Dialog>

      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-[95vw]! w-[95vw]! h-[95vh] p-0 overflow-hidden bg-background shadow-2xl border-none flex flex-col z-[9999] [&>button]:hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <DialogTitle>Select Products</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPicker(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-[calc(95vh-72px)] overflow-hidden">
            <ProductPicker
              isVisible={true}
              onClose={() => setShowPicker(false)}
              products={availableProducts}
              addedProducts={items}
              onAdd={(p, q) => addToCartInternal(p, q)}
              onRemove={(cartId) =>
                setItems((prev) => prev.filter((i) => (i.cartId || i.id) !== cartId))
              }
              onUpdateQty={(cartId, q) =>
                setItems((prev) =>
                  prev.map((i) => ((i.cartId || i.id) === cartId ? { ...i, quantity: q } : i)),
                )
              }
              onClearAll={() => setItems([])}
              onBarcodeScan={handleBarcodeScan}
              isLoading={loading || isLoadingInventory}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
