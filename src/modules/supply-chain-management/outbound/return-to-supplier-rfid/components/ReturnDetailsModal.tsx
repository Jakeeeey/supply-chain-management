"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Printer, X, Loader2, Save, Send, Plus, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  ReturnToSupplier,
  CartItem,
  InventoryRecord,
} from "../types/rts.schema";
import {
  getTransactionDetails,
  updateTransaction,
  lookupRfid,
} from "../providers/fetchProviders";
import { useGlobalScanner } from "../hooks/useGlobalScanner";
import { validateBarcode, detectScanType } from "../utils/barcodeUtils";
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

  // Scanning state
  const [lastScannedRfid, setLastScannedRfid] = useState("");
  const [rfidScanning, setRfidScanning] = useState(false);
  const rfidInputRef = useRef<HTMLInputElement>(null);

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
              id: String(i.id), // Use the unique Database Line ID to prevent duplicate React keys
              productId: i.productId,
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
              rfid_tag: i.rfid_tag,
            };
          });
          setItems(cartItems);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Failed to load details";
          toast.error("Error", {
            description: message,
          });
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
            (r) => r.product_id === item.productId,
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

    const unitOrderMap = new Map<string, number>();
    refs.units.forEach((u) => {
      unitOrderMap.set(u.unit_name, u.order);
      unitOrderMap.set(u.unit_shortcut, u.order);
    });

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
            computedDiscount = parseFloat(discountObj.percentage);
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
          id: String(item.product_id),
          productId: item.product_id,
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
          parentId: item.familyId || null,
        };
      })
      .filter((p) => {
        const order = unitOrderMap.get(p.unit) ?? 0;
        const isAlreadyInCart = items.some((i) => i.id === p.id);
        // Manual add in detail modal: only allow order 1 or 2 (small units)
        return (p.stock > 0 && (order === 1 || order === 2)) || isAlreadyInCart;
      });

    // Group by familyId
    interface VariantItem {
      id: string;
      code: string;
      name: string;
      unit: string;
      unitCount: number;
      stock: number;
      price: number;
      uom_id: number;
      supplierDiscount: number;
      discountType?: string;
      discountId?: number;
      productId: number;
    }

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
      const v = group.variants;
      v.sort((a, b) => a.unitCount - b.unitCount);
      if (v.length > 0) {
        group.masterName = v[0].name;
      }
      v.sort((a, b) => b.unitCount - a.unitCount);
      return group;
    });
  }, [
    refs,
    currentSupplierId,
    inventory,
    items,
  ]);

  /**
   * HANDLERS: RFID & Barcode Scanning
   */
  const addToCartInternal = useCallback((p_raw: unknown, qty = 1) => {
    const p = p_raw as CartItem;
    setItems((prev) => {
      // For RFID items, never merge — always add as a new line
      if (p.rfid_tag) {
        return [
          ...prev,
          {
            ...p,
            id: `${p.id}-rfid-${p.rfid_tag}`, // Unique key per RFID
            quantity: 1,
            onHand: p.stock || 0,
            discount: (p.supplierDiscount || 0) / 100,
            discountId: p.discountId,
            customPrice: p.price,
            rfid_tag: p.rfid_tag,
          } as CartItem,
        ];
      }

      // For non-RFID items, merge quantity as usual
      const exists = prev.find((i) => i.productId === p.productId && !i.rfid_tag);
      if (exists)
        return prev.map((i) =>
          i.productId === p.productId && !i.rfid_tag
            ? { ...i, quantity: i.quantity + qty }
            : i,
        );
      return [
        ...prev,
        {
          ...p,
          quantity: qty,
          onHand: p.stock || 0,
          discount: (p.supplierDiscount || 0) / 100,
          discountId: p.discountId,
          customPrice: p.price,
        },
      ];
    });
  }, []);

  const handleRfidScan = useCallback(
    async (rfidTag: string) => {
      if (!rfidTag.trim() || !isEditable) return;
      if (!currentBranchId) {
        return;
      }

      if (rfidTag.length > 24) {
        toast.error("Invalid RFID", { description: "RFID tag must be <= 24 chars." });
        return;
      }

      if (items.some((i) => i.rfid_tag === rfidTag)) {
        toast.warning("Duplicate RFID", { description: `RFID "${rfidTag}" is already added.` });
        return;
      }

      setLastScannedRfid(rfidTag);
      setRfidScanning(true);
      try {
        const result = await lookupRfid(rfidTag, currentBranchId);
        if (!result || !result.productId) {
          toast.error("RFID Not Found", { description: `No product found for RFID "${rfidTag}" at this branch.` });
          return;
        }

        const productIdNumeric = Number(result.productId);
        const invRecord = inventory.find((r) => r.product_id === productIdNumeric);
        
        if (!invRecord) {
          toast.error("Stock Error", { description: "Product not in current supplier inventory." });
          return;
        }

        // Validate RFID eligibility (order 3)
        const matchedUnit = refs.units.find((u) => u.unit_name === invRecord.unit_name);
        if (!matchedUnit || matchedUnit.order !== 3) {
          toast.error("Ineligible Unit", { description: `${invRecord.unit_name} is not eligible for RFID. (Order 3 only)` });
          return;
        }

        const product = {
          id: String(productIdNumeric),
          productId: productIdNumeric,
          code: invRecord.product_code,
          name: invRecord.product_name,
          unit: invRecord.unit_name,
          unitCount: invRecord.unit_count,
          stock: invRecord.running_inventory,
          price: invRecord.price,
          uom_id: matchedUnit.unit_id,
          supplierDiscount: 0,
          rfid_tag: rfidTag,
          parentId: invRecord.familyId || null,
        };

        // Inherit discount
        const connection = refs.connections.find(
          (c) =>
            c.product_id === productIdNumeric &&
            c.supplier_id === currentSupplierId,
        );
        if (connection?.discount_type) {
          const disc = refs.lineDiscounts.find((d) => String(d.id) === String(connection.discount_type));
          if (disc) {
            product.supplierDiscount = parseFloat(disc.percentage);
            (product as any).discountId = disc.id;
          }
        }

        addToCartInternal(product, 1);
        toast.success("RFID Added", { description: `Added "${product.name}"` });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        toast.error("Scan Error", { description: message });
      } finally {
        setRfidScanning(false);
      }
    },
    [currentBranchId, currentSupplierId, inventory, items, refs, isEditable, addToCartInternal],
  );

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
      id: String(inv.product_id),
      productId: inv.product_id,
      code: inv.product_code,
      name: inv.product_name,
      unit: inv.unit_name,
      unitCount: inv.unit_count,
      stock: inv.running_inventory,
      price: inv.price,
      uom_id: matchedUnit?.unit_id || 0,
      supplierDiscount: 0,
      parentId: inv.familyId || null,
    }, 1);

    if (!matchedUnit) {
      toast.error("UOM Error", { description: `Could not resolve UOM for unit "${inv.unit_name}"` });
      return;
    }

    toast.success("Barcode Added", { description: `Added "${inv.product_name}"` });
  }, [inventory, isEditable, refs.units, addToCartInternal]);

  /**
   * GLOBAL SCAN CAPTURE
   */
  useGlobalScanner({
    enabled: isOpen && isEditable && !showPicker,
    onScan: (val) => {
      if (detectScanType(val) === "rfid") {
        handleRfidScan(val);
      } else {
        handleBarcodeScan(val);
      }
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
          product_id: item.productId,
          uom_id: item.uom_id,
          quantity: item.quantity * (item.unitCount || 1),
          gross_unit_price: item.customPrice || item.price,
          gross_amount: gross,
          discount_rate: item.discount * 100,
          discount_amount: discountAmount,
          net_amount: net,
          return_type_id: item.return_type_id || null,
          item_remarks: "",
          rfid_tag: item.rfid_tag,
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
      const message = err instanceof Error ? err.message : "Failed to update transaction.";
      toast.error("Error", {
        description: message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!data) return null;

  // Map data for printing
  const printableItems: (Record<string, unknown> & {
    code: string;
    name: string;
    unit: string;
    quantity: number;
    price: number;
    discount: number;
    total: number;
    returnType: string;
  })[] = items.map((i) => {
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
              {loading ? (
                /* ===== FULL-COMPONENT SKELETON ===== */
                <div className="space-y-8">
                  {/* Header Info Skeleton */}
                  <div className="bg-card rounded-xl border p-6 shadow-sm">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-14" />
                          <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-28" />
                          <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-12" />
                          <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Products to Return Label + RFID Skeleton */}
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-36" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-9 w-[220px] rounded-md" />
                      <Skeleton className="h-9 w-32 rounded-md" />
                    </div>
                  </div>

                  {/* Table Skeleton */}
                  <div className="rounded-md border overflow-hidden bg-card shadow-sm">
                    <div className="bg-muted/50 border-b px-4 py-3 flex gap-4">
                      <Skeleton className="h-3 w-[80px]" />
                      <Skeleton className="h-3 w-[60px]" />
                      <Skeleton className="h-3 w-[160px]" />
                      <Skeleton className="h-3 w-[50px]" />
                      <Skeleton className="h-3 w-[70px]" />
                      <Skeleton className="h-3 w-[80px]" />
                      <Skeleton className="h-3 w-[100px]" />
                      <Skeleton className="h-3 w-[80px]" />
                      <Skeleton className="h-3 w-[100px]" />
                      <Skeleton className="h-3 w-[80px]" />
                    </div>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="px-4 py-3 flex gap-4 items-center border-b last:border-0">
                        <Skeleton className="h-4 w-[80px]" />
                        <Skeleton className="h-4 w-[60px]" />
                        <Skeleton className="h-4 w-[160px]" />
                        <Skeleton className="h-6 w-[50px] rounded" />
                        <Skeleton className="h-8 w-[70px] rounded" />
                        <Skeleton className="h-4 w-[80px]" />
                        <Skeleton className="h-8 w-[100px] rounded" />
                        <Skeleton className="h-4 w-[80px]" />
                        <Skeleton className="h-8 w-[100px] rounded" />
                        <Skeleton className="h-4 w-[80px]" />
                      </div>
                    ))}
                  </div>

                  {/* Remarks & Summary Skeleton */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-3">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-40 w-full rounded-md" />
                    </div>
                    <div className="lg:col-span-1">
                      <div className="bg-card rounded-xl border p-6 shadow-sm h-full space-y-4">
                        <Skeleton className="h-4 w-28 mb-4" />
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-3 w-8" />
                          </div>
                          <div className="flex justify-between">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                          <div className="border-t border-dashed my-3" />
                          <div className="flex justify-between">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                          <Skeleton className="h-6 w-full rounded" />
                        </div>
                        <div className="border-t pt-4 mt-4">
                          <div className="flex justify-between items-end">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-8 w-32" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
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
                  {/* RFID Scan Field — scanner-only (no manual typing) */}
                  {isEditable && (
                    <div className="relative">
                      <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                      <input
                        ref={rfidInputRef}
                        type="text"
                        className="absolute inset-0 opacity-0 cursor-default"
                        tabIndex={-1}
                        autoComplete="off"
                        disabled={rfidScanning || !currentBranchId || !currentSupplierId}
                      />
                      <div
                        className={cn(
                          "pl-9 pr-3 h-9 w-[220px] text-xs border rounded-md font-mono flex items-center cursor-pointer select-none transition-all",
                          !currentBranchId || !currentSupplierId
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/5 text-primary hover:border-primary/30",
                        )}
                        onClick={() => rfidInputRef.current?.focus()}
                      >
                        {rfidScanning
                          ? "Looking up..."
                          : lastScannedRfid
                            ? lastScannedRfid
                            : "Scan RFID..."}
                      </div>
                      {rfidScanning && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-emerald-500" />
                      )}
                    </div>
                  )}
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
                  onUpdateItem={(id, field, val) =>
                    setItems((prev) =>
                      prev.map((i) =>
                        i.id === id ? { ...i, [field]: val } : i,
                      ),
                    )
                  }
                  onRemoveItem={(id) =>
                    setItems((prev) => prev.filter((i) => i.id !== id))
                  }
                  remarks={remarks}
                  setRemarks={setRemarks}
                  readOnly={!isEditable}
                />
              </div>
                </>
              )}
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
        <DialogContent className="max-w-[95vw]! w-[95vw]! h-[95vh] p-0 overflow-hidden bg-background shadow-2xl border-none flex flex-col z-9999 [&>button]:hidden">
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
                onRemove={(id) =>
                  setItems((prev) => prev.filter((i) => i.id !== id))
                }
                onUpdateQty={(id, q) =>
                  setItems((prev) =>
                    prev.map((i) => (i.id === id ? { ...i, quantity: q } : i)),
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
