"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, useFieldArray, useWatch, Control, UseFormSetValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Tag,
  Info,
  ArrowLeft,
  Package,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RFIDScannerModal } from "../modals/RFIDScannerModal";
import {
  StockAdjustmentFormSchema,
  StockAdjustmentFormValues,
} from "../../types/stock-adjustment.schema";
import { useStockAdjustmentForm } from "../../hooks/useStockAdjustmentForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Combobox } from "@/components/ui/combobox";

// ─── Types ───────────────────────────────────────────────────────────
interface StockAdjustmentFormProps {
  id: number | null;
  onCancel: () => void;
  onSuccess: () => void;
}

// ─── Memoised item row (renders only when *its own* data changes) ───
interface ItemRowProps {
  index: number;
  control: Control<any>;
  productOptions: any[];
  rfidProductIds: Set<number>;
  isProductsLoading: boolean;
  isRfidLoading: boolean;
  isLoadingDetails: boolean;
  unitOrder?: number;
  onProductSelect: (index: number, product: any) => void;
  onRemove: (index: number) => void;
  setValue: UseFormSetValue<any>;
  onOpenScanner: (index: number) => void;
  isReadOnly?: boolean;
}

const StockAdjustmentItemRow = React.memo(function StockAdjustmentItemRow({
  index,
  control,
  productOptions,
  rfidProductIds,
  isProductsLoading,
  isRfidLoading,
  isLoadingDetails,
  onProductSelect,
  onRemove,
  setValue,
  onOpenScanner,
  isReadOnly = false,
}: ItemRowProps) {
  // useWatch subscribes to specific fields — only this row re-renders when its own data changes.
  const productId = useWatch({ control, name: `items.${index}.product_id` });
  const productName = useWatch({ control, name: `items.${index}.product_name` });
  const unitName = useWatch({ control, name: `items.${index}.unit_name` });
  const quantity = useWatch({ control, name: `items.${index}.quantity` });
  const costPerUnit = useWatch({ control, name: `items.${index}.cost_per_unit` });
  const hasRfid = useWatch({ control, name: `items.${index}.has_rfid` });
  const rfidCount = useWatch({ control, name: `items.${index}.rfid_count` });
  const brandName = useWatch({ control, name: `items.${index}.brand_name` });
  const barcode = useWatch({ control, name: `items.${index}.barcode` });
  const description = useWatch({ control, name: `items.${index}.description` });
  const unitOrder = useWatch({ control, name: `items.${index}.unit_order` });

  const dbId = useWatch({ control, name: `items.${index}.db_id` });

  const totalCost = (quantity || 0) * (costPerUnit || 0);

  return (
    <div
      className={`border-b last:border-0 p-6 space-y-4 transition-colors duration-200 relative ${
        hasRfid ? "bg-amber-50/20 border-amber-200/50" : "border-slate-100"
      }`}
    >
      {/* Per-row loading overlay for RFID/inventory lookup */}
      {isLoadingDetails && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-md">
          <div className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm px-4 py-2.5 rounded-lg">
            <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-xs font-bold text-slate-600">Checking RFID data...</span>
          </div>
        </div>
      )}
      <div className="flex items-start gap-4">
        {/* Product Selection */}
        <div className="flex-[3] space-y-2">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Product <span className="text-red-500">*</span>
          </Label>
          <Combobox
            options={productOptions}
            value={String(productId || "")}
            onValueChange={(val) => {
              const product = productOptions.find(
                (p) => String(p.value) === val
              )?.item;
              if (product) onProductSelect(index, product);
            }}
            placeholder="Select Product"
            disabled={isProductsLoading || isReadOnly || !!dbId}
            renderItem={(option: any) => {
              const p = option.item;
              const pId = p.product_id || p.id;
              const pHasRfid = rfidProductIds.has(Number(pId));
              return (
                <div className="flex items-center justify-between w-full gap-4 min-w-[300px]">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900 line-clamp-1 text-xs">
                      {p.product_name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-500 font-mono">
                        {p.product_code}
                      </span>
                      {p.unit_name && (
                        <>
                          <span className="text-[9px] text-slate-300">•</span>
                          <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tight bg-blue-50 px-1 rounded">
                            {p.unit_name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {pHasRfid && (
                    <div className="bg-amber-100 text-amber-700 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter flex items-center gap-1 shrink-0">
                      <Tag className="h-2 w-2 fill-amber-700" />
                      RFID
                    </div>
                  )}
                </div>
              );
            }}
          />
        </div>

        {/* Unit */}
        <div className="flex-1 space-y-2">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Unit
          </Label>
          <div className="h-10 w-full bg-slate-50/50 border border-slate-200 rounded-md flex items-center px-3 text-sm text-slate-600 font-medium overflow-hidden">
            <span className="truncate">{unitName || "-"}</span>
          </div>
        </div>

        {/* Qty */}
        <div className="flex-1 space-y-2">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Qty <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            value={quantity ?? ""}
            onChange={(e) =>
              setValue(
                `items.${index}.quantity`,
                e.target.value === "" ? 0 : Number(e.target.value)
              )
            }
            readOnly={isReadOnly || !!(rfidCount && rfidCount > 0) || unitOrder === 3}
            className={`h-10 border-slate-200 focus:ring-blue-500 rounded-md text-sm ${
              isReadOnly || (rfidCount && rfidCount > 0) || unitOrder === 3 
                ? "bg-slate-50 text-slate-500 cursor-not-allowed font-bold" 
                : ""
            }`}
            min={0}
          />
        </div>

        {/* RFID Scanner Trigger for Unit Order 3 */}
        {unitOrder === 3 && (
          <div className="flex items-end pb-0.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenScanner(index)}
              className="h-10 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 font-bold gap-2 px-3 transition-all duration-200 shadow-sm"
            >
              <Tag className="h-4 w-4" />
              Scan RFID
            </Button>
          </div>
        )}

        {/* Cost/Unit */}
        <div className="flex-1 space-y-2">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Cost/Unit
          </Label>
          <Input
            type="text"
            value={`₱${(costPerUnit || 0).toFixed(2)}`}
            className="h-10 border-slate-200 bg-slate-50/50 rounded-md text-sm"
            readOnly
          />
        </div>

        {/* Total Cost */}
        <div className="flex-1 space-y-2">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Cost
          </Label>
          <div className="h-10 border border-blue-50 bg-blue-50/30 rounded-md flex items-center px-3 font-bold text-blue-600 text-sm">
            ₱
            {totalCost.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        {/* Delete */}
        <div className="pt-8">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(index)}
            disabled={isReadOnly || !!dbId}
            className={`shrink-0 self-end mb-0.5 rounded-full transition-all ${
              isReadOnly ? "hidden" : "hover:bg-red-50 hover:text-red-500 text-slate-400"
            } ${!!dbId && !isReadOnly ? "opacity-50 cursor-not-allowed grayscale" : ""}`}
            title={!!dbId && !isReadOnly ? "Existing items cannot be deleted" : "Remove item"}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
    </div>

      {/* Metadata Section */}
      {productId ? (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-6 text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <span className="text-slate-400 font-bold uppercase tracking-tighter">
                Brand:
              </span>{" "}
              {brandName || "N/A"}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-slate-400 font-bold uppercase tracking-tighter">
                Barcode:
              </span>{" "}
              {barcode || "N/A"}
            </span>
          </div>

          {hasRfid && (
            <div className="flex items-center gap-2 bg-amber-50/80 border border-amber-100/50 w-fit px-2.5 py-1 rounded-md">
              <Tag className="h-3 w-3 text-amber-500 fill-amber-500" />
              <span className="text-[10px] font-black text-amber-700">
                {rfidCount || 0} RFID tag(s) tracked system-wide
              </span>
            </div>
          )}

          <p className="text-[11px] text-slate-400 italic font-medium">
            {description || "No description available."}
          </p>
        </div>
      ) : null}

      {/* Remarks Section */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-slate-600">Item Remarks</Label>
        <Input
          placeholder="Enter remarks for this item..."
          value={useWatch({ control, name: `items.${index}.remarks` }) || ""}
          onChange={(e) => setValue(`items.${index}.remarks`, e.target.value)}
          className="h-10 border-slate-200 focus:ring-blue-500 rounded-md text-sm bg-white"
          readOnly={isReadOnly}
        />
      </div>
    </div>
  );
});

// ─── Summary bar (subscribes only to items array) ────────────────────
function FormSummary({
  control,
  fieldCount,
  isRfidLoading,
}: {
  control: Control<any>;
  fieldCount: number;
  isRfidLoading: boolean;
}) {
  const items = useWatch({ control, name: "items" }) || [];

  const { totalQuantity, totalAmount, rfidItemsCount } = useMemo(() => {
    let qty = 0;
    let amt = 0;
    let rfid = 0;
    for (const item of items) {
      const q = item?.quantity || 0;
      const c = item?.cost_per_unit || 0;
      qty += q;
      amt += q * c;
      if (item?.has_rfid) rfid++;
    }
    return { totalQuantity: qty, totalAmount: amt, rfidItemsCount: rfid };
  }, [items]);

  return (
    <div className="border-t border-slate-100 px-8 py-5 flex justify-end bg-slate-50/20">
      <div className="w-full max-w-[400px] space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="font-bold text-slate-600">Total Items:</span>
          <span className="font-bold text-slate-900">
            {fieldCount} product(s)
          </span>
        </div>
        <div className="h-px bg-slate-100 w-full" />
        <div className="flex justify-between items-center text-sm">
          <span className="font-bold text-slate-600">Total Quantity:</span>
          <span className="font-bold text-slate-900">
            {totalQuantity} units
          </span>
        </div>
        <div className="h-px bg-slate-100 w-full" />
        <div className="flex justify-between items-center pt-1">
          <span className="font-bold text-slate-600 text-sm">
            Total Amount:
          </span>
          <span className="text-xl font-bold text-blue-600">
            ₱
            {totalAmount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        {(rfidItemsCount > 0 || isRfidLoading) && (
          <>
            <div className="h-px bg-slate-100 w-full" />
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-amber-600">
                Items with RFID:
              </span>
              {isRfidLoading ? (
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16 bg-amber-100/50 animate-pulse" />
                  <span className="text-[10px] text-amber-400 animate-pulse">
                    Checking...
                  </span>
                </div>
              ) : (
                <span className="font-bold text-amber-700">
                  {rfidItemsCount} product(s)
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── RFID warning banner (subscribes only to items array) ───────────
function RfidBanner({ control }: { control: Control<any> }) {
  const items = useWatch({ control, name: "items" }) || [];
  const rfidItemsCount = useMemo(
    () => items.filter((item: any) => item?.has_rfid).length,
    [items]
  );

  if (rfidItemsCount === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 px-6 py-4 rounded-xl flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="p-2 bg-amber-100 rounded-lg">
        <AlertCircle className="h-5 w-5 text-amber-600" />
      </div>
      <div>
        <h4 className="font-bold text-amber-900">
          RFID Tracked Items Detected
        </h4>
        <p className="text-sm text-amber-800 opacity-90">
          {rfidItemsCount} item(s) in this adjustment have RFID tags in
          inventory. Please ensure proper RFID tag management during stock
          adjustment.
        </p>
      </div>
    </div>
  );
}

// ─── Main form component ─────────────────────────────────────────────
export function StockAdjustmentForm({
  id,
  onCancel,
  onSuccess,
}: StockAdjustmentFormProps) {
  const {
    fetchById,
    createAdjustment,
    updateAdjustment,
    checkRFID,
    fetchProducts,
    fetchProductsBySupplier,
    products = [],
    suppliers = [],
    isProductsLoading,
    isSuppliersLoading,
    isRfidLoading,
    isInventoryLoading,
    branches,
    fetchInventory,
    fetchBranchRfidData,
    fetchBranchInventory,
    rfidProductIds,
    inventoryMap,
    fetchNextDocNo,
    postAdjustment,
  } = useStockAdjustmentForm();

  const [loading, setLoading] = useState(false);
  const [loadingRows, setLoadingRows] = useState<Set<number>>(new Set());
  const [showRFIDWarning, setShowRFIDWarning] = useState(false);
  const [showRFIDScanner, setShowRFIDScanner] = useState(false);
  const [showPostConfirmation, setShowPostConfirmation] = useState(false);
  const [scannerContext, setScannerContext] = useState<{ index: number; productName: string } | null>(null);
  const [pendingRFIDProduct, setPendingRFIDProduct] = useState<any>(null);
  const [isScannerPreparing, setIsScannerPreparing] = useState(false);

  // --- Memoize product options to prevent expensive re-mapping in every row ---
  const productOptions = useMemo(() => {
    return products.map((p) => ({
      value: String(p.product_id || p.id),
      label: p.product_name,
      item: p
    }));
  }, [products]);

  const form = useForm<any>({
    resolver: zodResolver(StockAdjustmentFormSchema),
    defaultValues: {
      doc_no: "", // Will be fetched via effect
      branch_id: undefined,
      supplier_id: undefined,
      type: "IN",
      remarks: "",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // ── Load data for edit mode ────────────────────────────────────────
  useEffect(() => {
    if (id) {
      const loadData = async () => {
        setLoading(true);
        try {
          const data = await fetchById(id);
          
          // --- Auto-Infer Supplier ID ---
          let finalSupplierId = data.supplier_id 
            ? (typeof data.supplier_id === "object" ? (data.supplier_id as any).id : data.supplier_id)
            : undefined;

          // If header supplier is missing, try to get it from the first item with an inferred supplier
          if (!finalSupplierId && data.items && data.items.length > 0) {
            const firstWithInferred = data.items.find((item: any) => item.inferred_supplier_id);
            if (firstWithInferred) {
              finalSupplierId = firstWithInferred.inferred_supplier_id;
              console.log("[FORM] Inferred supplier_id from items:", finalSupplierId);
            }
          }

          form.reset({
            doc_no: data.doc_no,
            branch_id:
              typeof data.branch_id === "object"
                ? data.branch_id?.id
                : data.branch_id,
            supplier_id: finalSupplierId,
            type: data.type,
            remarks: data.remarks || "",
            isPosted: data.isPosted === true || (typeof data.isPosted === 'object' && (data.isPosted as any)?.data?.[0] === 1),
            items: data.items.map((item) => ({
              ...item,
              product_id: String(
                (item.product_id as any)?.product_id ||
                  (item.product_id as any)?.id ||
                  item.product_id
              ),
              product_name:
                (item.product_id as any)?.product_name ||
                item.product_name ||
                "Unknown Product",
              product_code:
                (item.product_id as any)?.product_code ||
                item.product_code ||
                "",
              cost_per_unit:
                (item.product_id as any)?.cost_per_unit ||
                (item.product_id as any)?.price_per_unit ||
                item.cost_per_unit ||
                0,
              current_stock: item.current_stock || 0,
              unit_name:
                item.unit_name ||
                (item.product_id as any)?.unit_name ||
                "pcs",
              unit_order: (item.product_id as any)?.unit_of_measurement?.order || 1,
              rfid_tags: item.rfid_tags || [],
              rfid_count: item.rfid_count || 0,
              db_id: item.id,
              has_rfid: (item.rfid_tags && item.rfid_tags.length > 0) || rfidProductIds.has(Number((item.product_id as any)?.product_id || (item.product_id as any)?.id || item.product_id)),
            })),
            posted_by: data.posted_by,
            postedAt: data.postedAt,
          });
        } catch (error) {
          toast.error("Failed to load adjustment details");
          console.error("Load error:", error);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Stable branch_id watcher (no infinite loop) ───────────────────
  const watchedBranchId = useWatch({ control: form.control, name: "branch_id" });
  const watchedSupplierId = useWatch({ control: form.control, name: "supplier_id" });

  useEffect(() => {
    if (watchedBranchId) {
      fetchBranchRfidData(Number(watchedBranchId));
      fetchBranchInventory(Number(watchedBranchId));
    }
  }, [watchedBranchId, fetchBranchRfidData, fetchBranchInventory]);

  // ── Smart Document Numbering Effect ──────────────────────────────
  useEffect(() => {
    if (!id) {
      const updateDocNo = async () => {
        const type = form.getValues("type");
        const nextDocNo = await fetchNextDocNo(type);
        form.setValue("doc_no", nextDocNo);
      };
      updateDocNo();
    }
  }, [id, fetchNextDocNo, form]);

  // ── Watch type change to update doc_no ─────────────────────────────
  const watchedTypeToUpdateDocNo = useWatch({ control: form.control, name: "type" });
  useEffect(() => {
    if (!id && watchedTypeToUpdateDocNo) {
      const updateDocNo = async () => {
        const nextDocNo = await fetchNextDocNo(watchedTypeToUpdateDocNo);
        form.setValue("doc_no", nextDocNo);
      };
      updateDocNo();
    }
  }, [id, watchedTypeToUpdateDocNo, fetchNextDocNo, form]);

  // ── Fetch products when supplier changes ───────────────────────────
  useEffect(() => {
    if (watchedSupplierId) {
      fetchProductsBySupplier(Number(watchedSupplierId));
    }
  }, [watchedSupplierId, fetchProductsBySupplier]);

  // ── Form loading state ─────────────────────────────────────────────
  const isFormLoading = id ? loading : false;
  const isPosted = useWatch({ control: form.control, name: "isPosted" });
  const isReadOnly = !!isPosted;

  // ── Post handler ───────────────────────────────────────────────────
  const handlePost = async () => {
    if (!id) return;
    setShowPostConfirmation(true);
  };

  const confirmPost = async () => {
    setShowPostConfirmation(false);
    if (!id) return;
    setLoading(true);
    try {
      await postAdjustment(id);
      toast.success("Adjustment Posted Successfully");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to post adjustment");
    } finally {
      setLoading(false);
    }
  };

  // ── Submit handler ─────────────────────────────────────────────────
  const onSubmit = useCallback(
    async (values: any) => {
      console.log("!!! SUBMIT TRIGGERED !!!", values);
      setLoading(true);
      try {
        if (id) {
          console.log("Updating adjustment:", id);
          await updateAdjustment(id, values);
          toast.success("Adjustment Updated Successfully");
        } else {
          console.log("Creating adjustment...");
          await createAdjustment(values);
          toast.success("Adjustment Created Successfully");
        }
        onSuccess();
      } catch (error: any) {
        console.error("SUBMIT ERROR:", error);
        toast.error(error.message || "Failed to save adjustment");
      } finally {
        setLoading(false);
      }
    },
    [id, createAdjustment, updateAdjustment, onSuccess]
  );

  // ── Add empty item row ─────────────────────────────────────────────
  const handleAddProduct = useCallback(() => {
    const supplierId = form.getValues("supplier_id");
    if (!supplierId) {
      toast.error("Please select a supplier first");
      return;
    }

    append({
      product_id: 0,
      product_name: "",
      product_code: "",
      quantity: 0,
      branch_id: form.getValues("branch_id"),
      type: form.getValues("type"),
      cost_per_unit: 0,
      unit_name: "-",
      remarks: "",
      rfid_tags: [],
    });
  }, [append, form]);

  const handleRFIDSave = useCallback((tags: string[]) => {
    if (scannerContext) {
      const { index } = scannerContext;
      form.setValue(`items.${index}.rfid_tags`, tags);
      form.setValue(`items.${index}.quantity`, tags.length);
      setScannerContext(null);
    }
  }, [scannerContext, form]);

  // ── Product selection (optimistic + background RFID/inventory) ─────
  const handleProductSelect = useCallback(
    async (index: number, product: any) => {
      if (!product) return;

      // ① Optimistically show product info IMMEDIATELY
      const productId = product.product_id || product.id;
      form.setValue(`items.${index}.product_id`, productId);
      form.setValue(`items.${index}.product_name`, product.product_name);
      form.setValue(`items.${index}.product_code`, product.product_code);
      form.setValue(`items.${index}.cost_per_unit`, product.cost_per_unit || product.price_per_unit || 0);
      form.setValue(`items.${index}.unit_name`, product.unit_name || "pcs");
      form.setValue(`items.${index}.brand_name`, product.brand_name || "N/A");
      form.setValue(`items.${index}.barcode`, product.barcode || "N/A");
      form.setValue(`items.${index}.description`, product.description || "No description available.");
      form.setValue(`items.${index}.unit_order`, product.unit_of_measurement?.order || 1);

      // ② Use cached inventoryMap for instant current stock lookup
      const cachedStock = inventoryMap.get(Number(productId)) ?? 0;
      form.setValue(`items.${index}.current_stock`, cachedStock);

      const unitOrder = product.unit_of_measurement?.order;
      const unitId = product.unit_of_measurement?.unit_id || product.unit_id;
      const hasRfid = rfidProductIds.has(Number(productId));

      // ③ Update RFID status instantly from pre-fetched data
      form.setValue(`items.${index}.has_rfid`, hasRfid);
      form.setValue(`items.${index}.rfid_count`, 0); // Reset count until scanned for order 3

      // --- Optimization: Trigger scanner logic before awaiting anything ---
      if (unitOrder === 3) {
        setScannerContext({ index, productName: product.product_name });
        setIsScannerPreparing(true);
        
        toast.info(`RFID Scan Required`, {
          description: `Preparing scanner for ${product.product_name}...`,
          duration: 1500,
          icon: <Tag className="h-4 w-4 text-blue-500" />,
        });

        // Reduced delay for faster response
        setTimeout(() => {
          setIsScannerPreparing(false);
          setShowRFIDScanner(true);
        }, 300);
      }

      // Background data fetching (non-blocking for the scanner)
      (async () => {
        try {
          const branchId = form.getValues("branch_id");
          const currentStock = await (cachedStock === 0 
            ? fetchInventory(productId, branchId) 
            : Promise.resolve(cachedStock));

          form.setValue(`items.${index}.current_stock`, currentStock);

          if (!unitOrder && !hasRfid) {
              // ...
          } else if (unitOrder !== 3 && hasRfid) {
            setPendingRFIDProduct({
              ...product,
              rfidData: { quantity: 1 },
              current_stock: currentStock,
              index,
            });
            setShowRFIDWarning(true);
          }
        } catch (err) {
          console.error("Background fetch error:", err);
        } finally {
          setLoadingRows((prev) => {
            const next = new Set(prev);
            next.delete(index);
            return next;
          });
        }
      })();
    },
    [fetchInventory, form, inventoryMap]
  );

  const handleOpenScanner = useCallback((index: number) => {
    const productName = form.getValues(`items.${index}.product_name`);
    setScannerContext({ index, productName });

    setIsScannerPreparing(true);
    toast.info(`Opening RFID Scanner`, {
      description: `Preparing scanner for ${productName}...`,
      duration: 1500,
    });

    setTimeout(() => {
      setIsScannerPreparing(false);
      setShowRFIDScanner(true);
    }, 600);
  }, [form]);

  // ── Stable form watcher values ──────────────────────────────────────
  const watchedBranchIdForSelect = useWatch({ control: form.control, name: "branch_id" });
  const watchedSupplierIdForSelect = useWatch({ control: form.control, name: "supplier_id" });
  const watchedType = useWatch({ control: form.control, name: "type" });

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto w-full overflow-y-auto bg-slate-50/30 min-h-screen">
      {/* Module Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">
              Stock Adjustment Module
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Inventory Management System
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="gap-2 h-10 border-slate-200 bg-white shadow-sm font-bold text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1 mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {id ? "Edit Stock Adjustment" : "New Stock Adjustment"}
          </h1>
          {id && (
            <Badge 
              variant="outline" 
              className={`px-3 py-1 font-bold shadow-sm ${
                isPosted 
                  ? 'bg-blue-50 text-blue-700 border-blue-200 uppercase tracking-wider' 
                  : 'bg-amber-50 text-amber-700 border-amber-200 uppercase tracking-wider'
              }`}
            >
              {isPosted ? 'Posted' : 'Draft / Unposted'}
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-500">
          Record stock movement and adjust inventory levels
        </p>
        
        {isPosted && (
          <div className="flex items-center gap-6 mt-2 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="flex items-center gap-2 bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100">
              <span className="text-[10px] uppercase font-black text-blue-400">Posted At:</span>
              <span className="text-xs font-bold text-blue-700">
                {form.getValues("postedAt") ? format(new Date(form.getValues("postedAt")), "MMMM d, yyyy, hh:mm a") : "-"}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100">
              <span className="text-[10px] uppercase font-black text-blue-400">Posted By:</span>
              <span className="text-xs font-bold text-blue-700">
                {(() => {
                  const postedBy = form.getValues("posted_by");
                  return typeof postedBy === 'object' ? `${postedBy?.user_fname} ${postedBy?.user_lname}` : postedBy || "System User";
                })()}
              </span>
            </div>
          </div>
        )}
      </div>

      <RfidBanner control={form.control} />

      {/* RFID Scanner Preparation Overlay */}
      {isScannerPreparing && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[100] flex items-center justify-center animate-in fade-in duration-300">
          <Card className="w-full max-w-sm border-none shadow-2xl bg-white overflow-hidden p-0">
            <div className="bg-blue-600 h-1.5 w-full">
              <div className="bg-blue-400 h-full animate-[loading_1.5s_infinite_linear]" style={{ width: '40%' }} />
            </div>
            <CardContent className="p-8 flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-blue-500 animate-spin" />
                <Tag className="h-6 w-6 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-bold text-slate-900">Preparing RFID Scanner</h3>
                <p className="text-sm text-slate-500">Please wait a moment...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border-slate-200 shadow-sm border-none bg-white">
          <CardHeader className="bg-white border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-base font-bold text-slate-800">
              Adjustment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="doc_no" className="text-sm font-bold text-slate-600">
                  Document Number
                </Label>
                <Input
                  id="doc_no"
                  {...form.register("doc_no")}
                  readOnly
                  className="bg-slate-50/50 border-slate-200 h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch" className="text-sm font-bold text-slate-600">
                  Branch <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  options={branches.map(b => ({
                    value: String(b.id),
                    label: `${b.branch_name} (${b.branch_code})`
                  }))}
                  value={watchedBranchIdForSelect ? String(watchedBranchIdForSelect) : ""}
                  onValueChange={(v) => form.setValue("branch_id", v ? Number(v) : undefined)}
                  placeholder="Select Branch"
                  disabled={isReadOnly}
                  className={form.formState.errors.branch_id ? "border-red-500 bg-red-50" : ""}
                />
                {form.formState.errors.branch_id && (
                  <p className="text-xs text-red-500 font-medium">
                    {String(form.formState.errors.branch_id.message)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier" className="text-sm font-bold text-slate-600">
                  Supplier <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  options={suppliers.map(s => ({
                    value: String(s.id),
                    label: `${s.supplier_name} ${s.supplier_shortcut ? `(${s.supplier_shortcut})` : ""}`
                  }))}
                  value={watchedSupplierIdForSelect ? String(watchedSupplierIdForSelect) : ""}
                  onValueChange={(v) => form.setValue("supplier_id", v ? Number(v) : undefined)}
                  placeholder={isSuppliersLoading ? "Loading suppliers..." : "Select Supplier"}
                  disabled={isReadOnly}
                  className={form.formState.errors.supplier_id ? "border-red-500 bg-red-50" : ""}
                />
                {form.formState.errors.supplier_id && (
                  <p className="text-xs text-red-500 font-medium">
                    {String(form.formState.errors.supplier_id.message)}
                  </p>
                )}
                {id && !watchedSupplierIdForSelect && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 mt-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <p className="text-xs text-amber-700 font-medium">
                      Supplier information is missing for this record. Please select the correct supplier to unlock product management.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-600">
                Adjustment Type <span className="text-red-500">*</span>
              </Label>
              <RadioGroup
                value={watchedType}
                onValueChange={(v) => form.setValue("type", v)}
                className="flex gap-4 pt-1"
                disabled={isReadOnly}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="IN"
                    id="type-in"
                    className="border-blue-500 text-blue-600 h-4 w-4"
                  />
                  <Label htmlFor="type-in" className="text-sm font-bold text-slate-700">
                    Stock In
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="OUT"
                    id="type-out"
                    className="border-slate-300 text-blue-600 h-4 w-4"
                  />
                  <Label htmlFor="type-out" className="text-sm font-bold text-slate-700">
                    Stock Out
                  </Label>
                </div>
              </RadioGroup>
              {form.formState.errors.type && (
                <p className="text-xs text-red-500 font-medium">
                  {String(form.formState.errors.type.message)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks" className="text-sm font-bold text-slate-600">
                Remarks
              </Label>
              <Textarea
                id="remarks"
                {...form.register("remarks")}
                placeholder="Additional information about this adjustment..."
                className="min-h-[120px] bg-white border-slate-200 focus:ring-blue-500 rounded-xl p-4 text-sm"
                disabled={isReadOnly}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm border-none bg-white">
          <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between py-4 px-6">
            <CardTitle className="text-base font-bold text-slate-800">
              Product Items
            </CardTitle>
            <Button
              type="button"
              onClick={handleAddProduct}
              disabled={!watchedSupplierIdForSelect || isReadOnly}
              className={`${
                (!watchedSupplierIdForSelect || isReadOnly)
                  ? "bg-slate-100 text-slate-400 border-slate-200" 
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              } font-bold h-9 px-4 rounded-lg shadow-sm flex items-center gap-2 text-sm transition-all`}
            >
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
                {isFormLoading || (isProductsLoading && fields.length === 0) ? (
                  <div className="p-6 space-y-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-4">
                        <Skeleton className="h-10 flex-[3]" />
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 flex-1" />
                      </div>
                    ))}
                  </div>
                ) : fields.length === 0 ? (
                  <div className="bg-slate-50/30 border-2 border-dashed border-slate-100 rounded-xl p-16 text-center">
                    <div className="flex justify-center mb-4">
                      <div className={`p-5 rounded-full border border-dashed ${
                        watchedSupplierIdForSelect ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"
                      }`}>
                        <Package className={`h-10 w-10 ${
                          watchedSupplierIdForSelect ? "text-blue-400" : "text-slate-300"
                        }`} />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                      {watchedSupplierIdForSelect ? "Ready to add products" : "Supplier required"}
                    </h3>
                    <p className="text-slate-500 font-medium max-w-xs mx-auto text-sm">
                      {watchedSupplierIdForSelect 
                        ? "Click 'Add Product' to start building your adjustment from this supplier." 
                        : "Select a supplier first to see the products linked to them."}
                    </p>
                    {form.formState.errors.items &&
                      (form.formState.errors.items as any).message && (
                        <p className="text-sm text-red-500 font-bold mt-4">
                          {(form.formState.errors.items as any).message}
                        </p>
                      )}
                    {!watchedSupplierIdForSelect && (
                      <div className="mt-8">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                            Supplier selection filter active
                         </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-0">
                    {fields.map((field, index) => (
                      <StockAdjustmentItemRow
                        key={field.id}
                        index={index}
                        control={form.control}
                        productOptions={productOptions}
                        rfidProductIds={rfidProductIds}
                        isProductsLoading={isProductsLoading}
                        isRfidLoading={isRfidLoading}
                        isLoadingDetails={loadingRows.has(index)}
                        onProductSelect={handleProductSelect}
                        onRemove={remove}
                        setValue={form.setValue}
                        onOpenScanner={handleOpenScanner}
                        isReadOnly={isReadOnly}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Summary Block */}
            <FormSummary
              control={form.control}
              fieldCount={fields.length}
              isRfidLoading={isRfidLoading}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-10 px-8 font-bold border-slate-200 text-slate-600 hover:bg-white rounded-lg"
          >
            Cancel
          </Button>
          {!isReadOnly && (
            <Button
              type="submit"
              disabled={loading}
              className="h-10 px-8 font-bold bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm rounded-lg"
            >
              {loading ? (
                <span className="animate-spin mr-2">◌</span>
              ) : (
                <Save className="h-4 w-4" />
              )}
              {id ? "Update Adjustment" : "Save Adjustment"}
            </Button>
          )}

          {id && !isReadOnly && (
            <Button
              type="button"
              onClick={handlePost}
              disabled={loading}
              className="h-10 px-8 font-bold bg-green-600 hover:bg-green-700 text-white gap-2 shadow-sm rounded-lg animate-in fade-in zoom-in-95 duration-200"
            >
              {loading ? (
                <span className="animate-spin mr-2">◌</span>
              ) : (
                <Send className="h-4 w-4" />
              )}
              Post Adjustment
            </Button>
          )}
        </div>
      </form>

      {scannerContext && (
        <RFIDScannerModal
          open={showRFIDScanner}
          onOpenChange={setShowRFIDScanner}
          productName={scannerContext.productName}
          onSave={handleRFIDSave}
          type={form.getValues("type")}
          initialTags={form.getValues(`items.${scannerContext.index}.rfid_tags`) || []}
        />
      )}

      {/* RFID Warning Modal */}
      <AlertDialog open={showRFIDWarning} onOpenChange={setShowRFIDWarning}>
        <AlertDialogContent className="max-w-md bg-white p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-amber-50 p-6 flex items-start gap-4">
            <div className="p-2 bg-amber-100 rounded-full">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg font-bold text-amber-900">
                  RFID Tracking Detected
                </AlertDialogTitle>
                <AlertDialogDescription className="text-amber-700/80 text-sm mt-1">
                  Product has existing RFID tags
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowRFIDWarning(false)}
              className="rounded-full h-8 w-8 text-amber-400 hover:text-amber-600 hover:bg-amber-100/50"
            >
              ✕
            </Button>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="font-black text-slate-900">
                  {pendingRFIDProduct?.product_name}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <span className="text-slate-500">Branch:</span>
                <span className="text-slate-900 font-bold text-right">
                  {branches.find(
                    (b) =>
                      String(b.id) === String(form.getValues("branch_id"))
                  )?.branch_name || "Selected Branch"}
                </span>
                <span className="text-slate-500">Current Stock:</span>
                <span className="text-slate-900 font-bold text-right">
                  {pendingRFIDProduct?.current_stock || 0}{" "}
                  {pendingRFIDProduct?.unit_name || "units"}
                </span>
                <span className="text-slate-500 font-bold">
                  RFID Tags On Hand:
                </span>
                <span className="text-slate-900 font-black text-right text-amber-600">
                  {pendingRFIDProduct?.rfidData?.quantity ||
                    pendingRFIDProduct?.rfidData?.count ||
                    1}{" "}
                  tags
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                Important Notice:
              </h4>
              <ul className="text-xs text-slate-600 space-y-2.5 list-disc pl-4 font-medium opacity-90">
                <li>
                  This product has RFID tags currently in inventory
                </li>
                <li>
                  Stock adjustments may require RFID tag management
                </li>
                <li>Ensure RFID tags are properly scanned or updated</li>
                <li>
                  Mismatch between physical stock and RFID count may cause
                  discrepancies
                </li>
              </ul>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl">
              <div className="flex gap-3">
                <div className="p-1 bg-blue-100 rounded-md h-fit mt-0.5">
                  <AlertCircle className="h-3 w-3 text-blue-600" />
                </div>
                <p className="text-[11px] leading-relaxed text-blue-700 font-medium">
                  <span className="font-black">Recommendation:</span> For
                  products with RFID tracking, use the RFID scanner to ensure
                  accurate inventory management.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowRFIDWarning(false)}
                className="flex-1 h-11 font-bold text-slate-600 border-slate-200 hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (
                    pendingRFIDProduct &&
                    typeof pendingRFIDProduct.index === "number"
                  ) {
                    const { index, rfidData, ...product } = pendingRFIDProduct;
                    form.setValue(`items.${index}.product_id`, product.product_id || product.id);
                    form.setValue(`items.${index}.product_name`, product.product_name);
                    form.setValue(`items.${index}.product_code`, product.product_code);
                    form.setValue(`items.${index}.cost_per_unit`, product.cost_per_unit || product.price_per_unit || 0);
                    form.setValue(`items.${index}.current_stock`, product.current_stock || 0);
                    form.setValue(`items.${index}.unit_name`, product.unit_name || "pcs");
                    form.setValue(`items.${index}.has_rfid`, true);
                    form.setValue(`items.${index}.rfid_count`, rfidData?.quantity || rfidData?.count || 0);
                    form.setValue(`items.${index}.brand_name`, product.brand_name || "N/A");
                    form.setValue(`items.${index}.barcode`, product.barcode || "N/A");
                    form.setValue(`items.${index}.description`, product.description || "No description available.");
                  }
                  setShowRFIDWarning(false);
                }}
                className="flex-1 h-11 font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-100 rounded-lg"
              >
                Continue Anyway
              </Button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Post Confirmation Modal */}
      <AlertDialog open={showPostConfirmation} onOpenChange={setShowPostConfirmation}>
        <AlertDialogContent className="max-w-md bg-white p-6 rounded-xl shadow-2xl border-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Confirm Post Adjustment
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 py-4">
              Are you sure you want to post this adjustment? Once posted, the record will become **READ-ONLY** and inventory levels will be updated across the system. 
              <br/><br/>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowPostConfirmation(false)}
              className="flex-1 h-11 font-bold text-slate-600 border-slate-200 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPost}
              className="flex-1 h-11 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100 rounded-lg"
            >
              Confirm and Post
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
