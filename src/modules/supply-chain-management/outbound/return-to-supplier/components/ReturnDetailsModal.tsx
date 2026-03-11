"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
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
  const { refs, inventory, loadInventory } = useReturnCreationData(isOpen);

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
              id: i.rfid_tag
                ? `${i.productId}-rfid-${i.rfid_tag}`
                : String(i.productId),
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
        } catch (err: any) {
          toast.error("Error", {
            description: err.message || "Failed to load details",
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

    const connectionMap = new Map<string, any>();
    refs.connections.forEach((c) =>
      connectionMap.set(`${c.product_id}-${c.supplier_id}`, c),
    );

    const discountMap = new Map<string, any>();
    refs.lineDiscounts.forEach((d) =>
      discountMap.set(String(d.id), d),
    );

    const enrichedItems = inventory
      .map((item: InventoryRecord) => {
        const connection = connectionMap.get(
          `${item.product_id}-${currentSupplierId}`,
        );

        let discountLabel: string | undefined;
        let computedDiscount = 0;

        if (connection?.discount_type) {
          const discountObj = discountMap.get(String(connection.discount_type));
          if (discountObj) {
            computedDiscount = parseFloat(discountObj.percentage);
            discountLabel = discountObj.line_discount;
          } else if (typeof connection.discount_type === "string") {
            discountLabel = connection.discount_type;
          }
        }

        return {
          id: String(item.product_id),
          masterId: String(item.familyId),
          code: item.product_code || "N/A",
          name: item.product_name,
          unit: item.unit_name,
          unitCount: item.unit_count,
          stock: item.running_inventory,
          price: item.price,
          uom_id: 0,
          discountType: discountLabel,
          supplierDiscount: computedDiscount,
        };
      })
      .filter((p) => p.stock > 0 || items.some((i) => i.id === p.id));

    // Group by familyId
    const groups: Record<string, any> = {};

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
      group.variants.sort((a: any, b: any) => a.unitCount - b.unitCount);
      if (group.variants.length > 0) {
        group.masterName = group.variants[0].name;
      }
      group.variants.sort((a: any, b: any) => b.unitCount - a.unitCount);
      return group;
    });
  }, [
    refs.connections,
    refs.lineDiscounts,
    currentSupplierId,
    inventory,
    items,
  ]);

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
        description:
          "Please select a 'Return Type' for all items before saving.",
      });
      return;
    }

    setSaving(true);
    try {
      const rts_items = items.map((item) => {
        const { gross, discountAmount, net } = calculateLineItem(item);
        return {
          product_id: Number(item.id),
          uom_id: item.uom_id,
          quantity: item.quantity * (item.unitCount || 1),
          gross_unit_price: item.customPrice || item.price,
          gross_amount: gross,
          discount_rate: item.discount,
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
    } catch (err: any) {
      toast.error("Error", {
        description: err.message || "Failed to update transaction.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!data) return null;

  // Map data for printing
  const printableItems: any[] = items.map((i) => {
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
      total: (i.customPrice || i.price) * i.quantity * (1 - i.discount / 100),
      returnType: returnTypeName,
    };
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-[1200px]! w-[90vw]! h-[90vh] bg-white p-0 gap-0 flex flex-col overflow-hidden shadow-2xl sm:rounded-xl border border-slate-200 [&>button]:hidden">
          {/* Header */}
          <div className="flex flex-row items-center justify-between px-8 py-6 bg-white shrink-0 border-b border-slate-100">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                {isEditable ? "Edit Return to Supplier" : "Return Details"}
              </DialogTitle>
              <div className="flex items-center gap-3 text-sm mt-1">
                <span className="text-slate-500">{data.returnNo}</span>
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
                className="h-9 w-9 bg-red-50 hover:bg-red-100 text-red-500 rounded-md transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-white p-6">
            <div className="bg-slate-50 rounded-xl p-6 h-full">
              {/* Header Info */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Supplier
                      </Label>
                      <div className="flex items-center px-3 h-10 rounded-md border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 shadow-sm">
                        {data.supplier}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Branch
                      </Label>
                      <div className="flex items-center px-3 h-10 rounded-md border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 shadow-sm">
                        {data.branch}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Return Date
                      </Label>
                      <div className="flex items-center px-3 h-10 rounded-md border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 shadow-sm">
                        {new Date(data.returnDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Document Ref No.
                      </Label>
                      <div className="flex items-center px-3 h-10 rounded-md border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 shadow-sm">
                        {data.returnNo}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
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
                <h3 className="text-base font-bold text-slate-800">
                  Products to Return
                </h3>
                {isEditable && (
                  <Button
                    size="sm"
                    onClick={() => setShowPicker(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Products
                  </Button>
                )}
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
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-8 py-4 border-t bg-white flex justify-end gap-2 shrink-0">
            <Button variant="outline" onClick={onClose}>
              {isEditable ? "Cancel" : "Close"}
            </Button>
            {isEditable && (
              <>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
                  className="bg-blue-600 hover:bg-blue-700 text-white"
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
        <DialogContent className="max-w-[95vw]! w-[95vw]! h-[95vh] p-0 overflow-hidden bg-white shadow-2xl border-none flex flex-col z-9999 [&>button]:hidden">
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
          <div className="flex-1 overflow-hidden">
            <ProductPicker
              isVisible={true}
              onClose={() => setShowPicker(false)}
              products={availableProducts}
              addedProducts={items}
              onAdd={(p, q) =>
                setItems((prev) => {
                  const exists = prev.find((i) => i.id === p.id);
                  if (exists)
                    return prev.map((i) =>
                      i.id === p.id
                        ? { ...i, quantity: i.quantity + (q || 1) }
                        : i,
                    );
                  return [
                    ...prev,
                    {
                      ...p,
                      quantity: q || 1,
                      discount: p.supplierDiscount || 0,
                      onHand: p.stock || 0,
                      customPrice: p.price,
                    },
                  ];
                })
              }
              onRemove={(id) =>
                setItems((prev) => prev.filter((i) => i.id !== id))
              }
              onUpdateQty={(id, q) =>
                setItems((prev) =>
                  prev.map((i) => (i.id === id ? { ...i, quantity: q } : i)),
                )
              }
              onClearAll={() => setItems([])}
              isLoading={loading}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
