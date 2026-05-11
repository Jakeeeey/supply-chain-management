"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, useFieldArray, useWatch, Control, UseFormSetValue, useFormState, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Package,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  StockAdjustmentManualFormSchema,
  StockAdjustmentManualFormValues,
  StockAdjustmentManualProduct,
  StockAdjustmentManualItem,
} from "../../types/stock-adjustment-manual.schema";
import { useStockAdjustmentManualForm } from "../../hooks/useStockAdjustmentManualForm";
import { isPostedStatus } from "../../utils/status-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";

// ——————————————————————————————————————————————————————————————————————————————
interface StockAdjustmentManualFormProps {
  id: number | null;
  onCancel: () => void;
  onSuccess: () => void;
}

// ——————————————————————————————————————————————————————————————————————————————
// Memoised item row (renders only when *its own* data changes)
interface ItemRowProps {
  index: number;
  control: Control<StockAdjustmentManualFormValues>;
  productOptions: { value: string; label: string; item: StockAdjustmentManualProduct }[];
  isProductsLoading: boolean;
  isLoadingDetails: boolean;
  onProductSelect: (index: number, product: StockAdjustmentManualProduct) => void;
  onRemove: (index: number) => void;
  setValue: UseFormSetValue<StockAdjustmentManualFormValues>;
  isReadOnly?: boolean;
}

const StockAdjustmentManualItemRow = React.memo(function StockAdjustmentManualItemRow({
  index,
  control,
  productOptions,
  isProductsLoading,
  onProductSelect,
  onRemove,
  setValue,
  isReadOnly = false,
}: ItemRowProps) {
  // useWatch subscribes to specific fields — only this row re-renders when its own data changes.
  const product_name = useWatch({ control, name: `items.${index}.product_name` });
  const productId = useWatch({ control, name: `items.${index}.product_id` });
  const unitName = useWatch({ control, name: `items.${index}.unit_name` });
  const quantity = useWatch({ control, name: `items.${index}.quantity` });
  const costPerUnit = useWatch({ control, name: `items.${index}.cost_per_unit` });
  const brandName = useWatch({ control, name: `items.${index}.brand_name` });
  const barcode = useWatch({ control, name: `items.${index}.barcode` });
  const description = useWatch({ control, name: `items.${index}.description` });
  const dbId = useWatch({ control, name: `items.${index}.db_id` });

  const { errors } = useFormState({ control });
  const rowError = Array.isArray(errors.items)
    ? (errors.items[index] as FieldErrors<StockAdjustmentManualItem>)
    : undefined;

  const [productSearch, setProductSearch] = useState("");
  const [productInputValue, setProductInputValue] = useState(product_name || "");

  // Synchronize input value (e.g. for Edit mode) during render if name changed
  // This avoids the 'cascading renders' lint error from useEffect
  const [prevProductName, setPrevProductName] = useState(product_name);
  if (product_name !== prevProductName) {
    setPrevProductName(product_name);
    if (!productSearch) {
      setProductInputValue(product_name || "");
    }
  }



  const totalCost = Number(quantity || 0) * Number(costPerUnit || 0);

  return (
    <div
      className="border-b last:border-0 p-6 space-y-4 transition-colors duration-200 relative border-border/50"
    >
      <div className="flex items-start gap-4">
        {/* Product Selection */}
        <div className="flex-[3] space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Product <span className="text-red-500">*</span>
          </Label>
          <Combobox
            value={String(productId || "")}
            onValueChange={(val: string | null) => {
              if (!val) {
                setProductInputValue("");
                return;
              }
              const product = productOptions.find(
                (p) => String(p.value) === val
              )?.item;
              if (product) {
                setProductInputValue(product.product_name);
                onProductSelect(index, product);
              }
            }}
            inputValue={productInputValue}
            onInputValueChange={(v: string) => {
              // base-ui fires this with the raw ID after selection — show the product name instead
              const matched = productOptions.find(p => String(p.value) === v);
              if (matched) {
                setProductInputValue(matched.item.product_name);
                setProductSearch("");
              } else {
                setProductInputValue(v);
                setProductSearch(v);
              }
            }}
          >
            <ComboboxInput
              placeholder="Select Product"
              disabled={isProductsLoading || isReadOnly || !!dbId}
              showClear
              className={rowError?.product_id ? "border-red-500 bg-red-50 dark:bg-red-900/10" : ""}
            />
            <ComboboxContent>
              <ComboboxList>
                {(() => {
                  const filtered = productOptions.filter(opt =>
                    opt.label.toLowerCase().includes(productSearch.toLowerCase()) ||
                    opt.item.product_code?.toLowerCase().includes(productSearch.toLowerCase())
                  );
                  if (filtered.length === 0) return <ComboboxEmpty>No products found.</ComboboxEmpty>;
                  return filtered.map((option) => {
                    const p = option.item;
                    return (
                      <ComboboxItem key={option.value} value={option.value}>
                        <div className="flex items-center justify-between w-full gap-4 min-w-[300px]">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground line-clamp-1 text-xs">
                              {p.product_name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-muted-foreground font-mono">
                                {p.product_code}
                              </span>
                              {p.unit_name && (
                                <>
                                  <span className="text-[9px] text-muted-foreground/30">•</span>
                                  <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tight bg-blue-50 dark:bg-blue-900/20 px-1 rounded">
                                    {p.unit_name}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </ComboboxItem>
                    );
                  });
                })()}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          {rowError?.product_id && (
            <p className="text-[10px] text-red-500 font-bold mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
              {rowError.product_id.message}
            </p>
          )}
        </div>

        {/* Unit */}
        <div className="flex-1 space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Unit
          </Label>
          <div className="h-10 w-full bg-muted/30 border border-border rounded-md flex items-center px-3 text-sm text-muted-foreground font-medium overflow-hidden">
            <span className="truncate">{unitName || "-"}</span>
          </div>
        </div>

        {/* Qty */}
        <div className="flex-1 space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Qty <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            value={quantity ?? ""}
            onChange={(e) =>
              setValue(
                `items.${index}.quantity`,
                e.target.value === "" ? 0 : Number(e.target.value),
                { shouldValidate: true }
              )
            }
            readOnly={isReadOnly}
            className={`h-10 border-input focus:ring-blue-500 rounded-md text-sm ${isReadOnly
              ? "bg-muted text-muted-foreground cursor-not-allowed font-bold"
              : ""
              } ${rowError?.quantity ? "border-red-500 bg-red-50 dark:bg-red-900/10" : ""}`}
            min={0}
          />
          {rowError?.quantity && (
            <p className="text-[10px] text-red-500 font-bold mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
              {rowError.quantity.message}
            </p>
          )}
        </div>

        {/* Cost/Unit */}
        <div className="flex-1 space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Cost/Unit
          </Label>
          <Input
            value={`₱${Number(costPerUnit || 0).toFixed(2)}`}
            className="h-10 border-input bg-muted/30 rounded-md text-sm"
            readOnly
          />
        </div>

        {/* Total Cost */}
        <div className="flex-1 space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Total Cost
          </Label>
          <div className="h-10 border border-blue-100/20 dark:border-blue-900/20 bg-blue-50/30 dark:bg-blue-900/10 rounded-md flex items-center px-3 font-bold text-blue-600 text-sm">
            ₱
            {Number(totalCost || 0).toLocaleString(undefined, {
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
            disabled={isReadOnly}
            className={`shrink-0 self-end mb-0.5 rounded-full transition-all ${isReadOnly ? "hidden" : "hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500/50 hover:text-red-600"
              }`}
            title="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Metadata Section */}
      {productId ? (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-6 text-[11px] text-muted-foreground font-medium">
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground/70 font-bold uppercase tracking-tighter">
                Brand:
              </span>{" "}
              {brandName || "N/A"}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground/70 font-bold uppercase tracking-tighter">
                Barcode:
              </span>{" "}
              {barcode || "N/A"}
            </span>
          </div>


          <p className="text-[11px] text-muted-foreground/60 italic font-medium">
            {description || "No description available."}
          </p>
        </div>
      ) : null}

      {/* Remarks Section */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-muted-foreground">Item Remarks</Label>
        <Input
          placeholder="Enter remarks for this item..."
          value={useWatch({ control, name: `items.${index}.remarks` }) || ""}
          onChange={(e) => setValue(`items.${index}.remarks`, e.target.value)}
          className="h-10 border-input focus:ring-blue-500 rounded-md text-sm bg-background"
          readOnly={isReadOnly}
        />
      </div>
    </div>
  );
});

// ——————————————————————————————————————————————————————————————————————————————
function FormSummary({
  control,
  fieldCount,
}: {
  control: Control<StockAdjustmentManualFormValues>;
  fieldCount: number;
}) {
  const items = useWatch({ control, name: "items" });

  const { totalQuantity, totalAmount } = useMemo(() => {
    const currentItems = items || [];
    let qty = 0;
    let amt = 0;
    for (const item of currentItems) {
      const q = Number(item?.quantity || 0);
      const c = Number(item?.cost_per_unit || 0);
      qty += q;
      amt += q * c;
    }
    return { totalQuantity: qty, totalAmount: amt };
  }, [items]);

  return (
    <div className="border-t border-border px-8 py-5 flex justify-end bg-muted/30">
      <div className="w-full max-w-[400px] space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="font-bold text-muted-foreground">Total Items:</span>
          <span className="font-bold text-foreground">
            {fieldCount} product(s)
          </span>
        </div>
        <div className="h-px bg-border w-full" />
        <div className="flex justify-between items-center text-sm">
          <span className="font-bold text-muted-foreground">Total Quantity:</span>
          <span className="font-bold text-foreground">
            {totalQuantity} units
          </span>
        </div>
        <div className="h-px bg-border w-full" />
        <div className="flex justify-between items-center pt-1">
          <span className="font-bold text-muted-foreground text-sm">
            Total Amount:
          </span>
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
            ₱
            {Number(totalAmount || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

      </div>
    </div>
  );
}

// ——————————————————————————————————————————————————————————————————————————————

// ——————————————————————————————————————————————————————————————————————————————
export function StockAdjustmentManualForm({
  id,
  onCancel,
  onSuccess,
}: StockAdjustmentManualFormProps) {
  const {
    fetchById,
    createAdjustment,
    updateAdjustment,
    fetchProductsBySupplier,
    products = [],
    suppliers = [],
    isProductsLoading,
    isSuppliersLoading,
    branches,
    fetchInventory,
    fetchBranchInventory,
    inventoryMap,
    fetchNextDocNo,
    postAdjustment,
  } = useStockAdjustmentManualForm();

  const [loading, setLoading] = useState(false);
  const [loadingRows, setLoadingRows] = useState<Set<number>>(new Set());
  const [showPostConfirmation, setShowPostConfirmation] = useState(false);
  const [branchInputValue, setBranchInputValue] = useState("");
  const [supplierInputValue, setSupplierInputValue] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  // --- Memoize product options to prevent expensive re-mapping in every row ---
  const productOptions = useMemo(() => {
    return products.map((p) => ({
      // Use record PK (id) for absolute uniqueness, fallback to product_id
      value: String(p.id || p.product_id),
      // Include unit in label to prevent CommandItem collision and help user selection
      label: p.unit_name ? `${p.product_name} (${p.unit_name})` : p.product_name,
      item: p
    }));
  }, [products]);

  const form = useForm<StockAdjustmentManualFormValues>({
    mode: "all",
    resolver: zodResolver(StockAdjustmentManualFormSchema),
    defaultValues: {
      doc_no: "", // Will be fetched via effect
      branch_id: 0,
      supplier_id: 0,
      type: "IN",
      remarks: "",
      items: [],
      isPosted: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // ——————————————————————————————————————————————————————————————————————————————
  useEffect(() => {
    const unlock = () => {
      if (document.body.style.overflow === 'hidden') {
        document.body.style.setProperty('overflow', 'auto', 'important');
        document.body.style.removeProperty('pointer-events');
      }
    };
    unlock();
    const timer = setTimeout(unlock, 1000);
    const timer2 = setTimeout(unlock, 3000);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [loading]);

  useEffect(() => {
    if (id) {
      const loadData = async () => {
        setLoading(true);
        try {
          const data = await fetchById(id);

          // --- Auto-Infer Supplier ID ---
          let finalSupplierId = data.supplier_id
            ? (typeof data.supplier_id === "object" ? (data.supplier_id as { id: number }).id : data.supplier_id)
            : 0;

          // If header supplier is missing, try to get it from the first item with an inferred supplier
          // If header supplier is missing, try to get it from the first item with an inferred supplier
          if (!finalSupplierId && data.items && data.items.length > 0) {
            const firstWithInferred = data.items.find((item) => (item as StockAdjustmentManualItem).inferred_supplier_id);
            if (firstWithInferred) {
              finalSupplierId = (firstWithInferred as StockAdjustmentManualItem).inferred_supplier_id || 0;
            }
          }

          // Robust check for isPosted (handles boolean, number, string, or Directus Buffer)
          const resolvedIsPosted = isPostedStatus(data.isPosted);

          form.reset({
            doc_no: data.doc_no,
            branch_id:
              typeof data.branch_id === "object"
                ? data.branch_id?.id
                : (data.branch_id || 0),
            supplier_id: finalSupplierId,
            type: data.type,
            remarks: data.remarks || "",
            isPosted: resolvedIsPosted,
            postedAt: data.postedAt || "",
            items: data.items.map((item) => ({
              ...item,
              product_id: Number(
                (item.product_id as { id?: number; product_id?: number })?.id ||
                (item.product_id as { id?: number; product_id?: number })?.product_id ||
                item.product_id
              ),
              product_name:
                (item.product_id as { product_name?: string })?.product_name ||
                item.product_name ||
                "Unknown Product",
              product_code:
                (item.product_id as { product_code?: string })?.product_code ||
                item.product_code ||
                "",
              cost_per_unit:
                (item.product_id as { cost_per_unit?: number; price_per_unit?: number })?.cost_per_unit ||
                (item.product_id as { cost_per_unit?: number; price_per_unit?: number })?.price_per_unit ||
                item.cost_per_unit ||
                0,
              current_stock: item.current_stock || 0,
              unit_name:
                item.unit_name ||
                (item.product_id as { unit_name?: string })?.unit_name ||
                "pcs",
              unit_order: (item.product_id as { unit_of_measurement?: { order: number } })?.unit_of_measurement?.order || 1,
              db_id: item.id,
            })),
            posted_by: data.posted_by,
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

  // ——————————————————————————————————————————————————————————————————————————————
  // Auto-populate combobox display labels when editing (branch & supplier)
  // Runs whenever branches/suppliers load OR when the form values change.
  const watchedBranchId = useWatch({ control: form.control, name: "branch_id" });
  const watchedSupplierId = useWatch({ control: form.control, name: "supplier_id" });

  useEffect(() => {
    if (watchedBranchId && branches.length > 0) {
      const found = branches.find(b => b.id === Number(watchedBranchId));
      if (found) setBranchInputValue(`${found.branch_name} (${found.branch_code ?? ""})`);
    }
  }, [watchedBranchId, branches]);

  useEffect(() => {
    if (watchedSupplierId && suppliers.length > 0) {
      const found = suppliers.find(s => s.id === Number(watchedSupplierId));
      if (found) setSupplierInputValue(`${found.supplier_name}${found.supplier_shortcut ? ` (${found.supplier_shortcut})` : ""}`);
    }
  }, [watchedSupplierId, suppliers]);

  useEffect(() => {
    if (watchedBranchId) {
      fetchBranchInventory(Number(watchedBranchId));
    }
  }, [watchedBranchId, fetchBranchInventory]);

  // ——————————————————————————————————————————————————————————————————————————————
  useEffect(() => {
    if (!id) {
      const updateDocNo = async () => {
        const type = form.getValues("type");
        const nextDocNo = await fetchNextDocNo(type);
        form.setValue("doc_no", nextDocNo, { shouldValidate: true });
      };
      updateDocNo();
    }
  }, [id, fetchNextDocNo, form]);

  // ——————————————————————————————————————————————————————————————————————————————
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

  // ——————————————————————————————————————————————————————————————————————————————
  useEffect(() => {
    if (watchedSupplierId) {
      fetchProductsBySupplier(Number(watchedSupplierId));
    }
  }, [watchedSupplierId, fetchProductsBySupplier]);

  // ——————————————————————————————————————————————————————————————————————————————
  const isFormLoading = id ? loading : false;
  const isPosted = useWatch({ control: form.control, name: "isPosted" });
  const isReadOnly = !!isPosted;

  // ——————————————————————————————————————————————————————————————————————————————
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post adjustment");
    } finally {
      setLoading(false);
    }
  };

  const onInvalid = () => {
    toast.error("Please fill in all required fields correctly.");
  };

  // ——————————————————————————————————————————————————————————————————————————————
  const onSubmit = useCallback(
    async (values: StockAdjustmentManualFormValues) => {
      setLoading(true);
      try {
        if (id) {
          await updateAdjustment(id, values);
          toast.success("Adjustment Updated Successfully");
        } else {
          await createAdjustment(values);
          toast.success("Adjustment Created Successfully");
        }
        onSuccess();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to save adjustment";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [id, createAdjustment, updateAdjustment, onSuccess]
  );

  // ——————————————————————————————————————————————————————————————————————————————
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
      quantity: 1,
      branch_id: form.getValues("branch_id"),
      type: form.getValues("type"),
      cost_per_unit: 0,
      unit_name: "-",
      remarks: "",
    });
  }, [append, form]);


  // ——————————————————————————————————————————————————————————————————————————————
  const handleProductSelect = useCallback(
    async (index: number, product: StockAdjustmentManualProduct) => {
      if (!product) return;

      const productId = product.product_id || product.id;

      form.setValue(`items.${index}.product_id`, Number(productId), { shouldValidate: true });
      form.setValue(`items.${index}.product_name`, product.product_name);
      form.setValue(`items.${index}.product_code`, product.product_code);
      form.setValue(`items.${index}.cost_per_unit`, product.cost_per_unit || product.price_per_unit || 0);
      form.setValue(`items.${index}.unit_name`, product.unit_name || "pcs");
      form.setValue(`items.${index}.brand_name`, product.brand_name || "N/A");
      form.setValue(`items.${index}.barcode`, product.barcode || "N/A");
      form.setValue(`items.${index}.description`, product.description || "No description available.");
      form.setValue(`items.${index}.unit_order`, product.unit_of_measurement?.order || 1);

      const cachedStock = inventoryMap.get(Number(productId)) ?? 0;
      form.setValue(`items.${index}.current_stock`, cachedStock);

      const currentQty = form.getValues(`items.${index}.quantity`);
      if (!currentQty || currentQty <= 0) {
        form.setValue(`items.${index}.quantity`, 1, { shouldValidate: true });
      }


      (async () => {
        try {
          const branchId = form.getValues("branch_id");
          const currentStock = await (cachedStock === 0
            ? fetchInventory(productId, branchId)
            : Promise.resolve(cachedStock));

          form.setValue(`items.${index}.current_stock`, currentStock);

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


  const watchedBranchIdForSelect = useWatch({ control: form.control, name: "branch_id" });
  const watchedSupplierIdForSelect = useWatch({ control: form.control, name: "supplier_id" });
  const watchedType = useWatch({ control: form.control, name: "type" });

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto w-full bg-background">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground leading-tight">
              Stock Adjustment Module
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              Inventory Management System
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="gap-2 h-10 border-border bg-card shadow-sm font-bold text-muted-foreground hover:bg-muted rounded-lg"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1 mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {id ? "Edit Stock Adjustment" : "New Stock Adjustment"}
          </h1>
          {id && (
            <Badge
              variant="outline"
              className={`px-3 py-1 font-bold shadow-sm ${isPosted
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:blue-400 border-blue-200 dark:border-blue-800/50 uppercase tracking-wider'
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:amber-400 border-amber-200 dark:border-amber-800/50 uppercase tracking-wider'
                }`}
            >
              {isPosted ? 'Posted' : 'Draft / Unposted'}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Record stock movement and adjust inventory levels
        </p>

        {isPosted && (
          <div className="flex items-center gap-6 mt-2 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="flex items-center gap-2 bg-blue-50/50 dark:bg-blue-900/10 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/30">
              <span className="text-[10px] uppercase font-black text-blue-400">Posted At:</span>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                {form.getValues().postedAt ? format(new Date(form.getValues().postedAt as string), "MMMM d, yyyy, hh:mm a") : "-"}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-blue-50/50 dark:bg-blue-900/10 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/30">
              <span className="text-[10px] uppercase font-black text-blue-400">Posted By:</span>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                {(() => {
                  const postedBy = form.getValues("posted_by");
                  if (typeof postedBy === 'object' && postedBy !== null) {
                    const fname = postedBy.user_fname || "";
                    const lname = postedBy.user_lname || "";
                    const fullName = `${fname} ${lname}`.trim();
                    return fullName || "System User";
                  }
                  return postedBy || "System User";
                })()}
              </span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        <Card className="border-border shadow-sm bg-card">
          <CardHeader className="bg-card border-b border-border py-4 px-6">
            <CardTitle className="text-base font-bold text-foreground">
              Adjustment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="doc_no" className="text-sm font-bold text-muted-foreground">
                  Document Number
                </Label>
                <Input
                  id="doc_no"
                  {...form.register("doc_no")}
                  readOnly
                  className="bg-muted/50 border-input h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch" className="text-sm font-bold text-muted-foreground">
                  Branch <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  value={watchedBranchIdForSelect ? String(watchedBranchIdForSelect) : ""}
                  onValueChange={(v: string | null) => {
                    if (!v) {
                      setBranchInputValue("");
                      form.setValue("branch_id", 0, { shouldValidate: true });
                      return;
                    }
                    const found = branches.find(b => String(b.id) === v);
                    if (found) setBranchInputValue(`${found.branch_name} (${found.branch_code})`);
                    form.setValue("branch_id", Number(v), { shouldValidate: true });
                  }}
                  inputValue={branchInputValue}
                  onInputValueChange={(v: string) => {
                    const matched = branches.find(b => String(b.id) === v);
                    if (matched) {
                      setBranchInputValue(`${matched.branch_name} (${matched.branch_code})`);
                      setBranchSearch("");
                    } else {
                      setBranchInputValue(v);
                      setBranchSearch(v);
                    }
                  }}
                >
                  <ComboboxInput
                    placeholder="Select Branch"
                    disabled={isReadOnly || !!id}
                    className={form.formState.errors.branch_id ? "border-red-500 bg-red-50 dark:bg-red-900/10" : ""}
                    showTrigger={!id}
                    showClear={!id && !isReadOnly}
                  />
                  <ComboboxContent>
                    <ComboboxList>
                      {(() => {
                        const filtered = branches.filter(b =>
                          b.branch_name.toLowerCase().includes(branchSearch.toLowerCase()) ||
                          (b.branch_code ?? "").toLowerCase().includes(branchSearch.toLowerCase())
                        );
                        if (filtered.length === 0) return <ComboboxEmpty>No branches found.</ComboboxEmpty>;
                        return filtered.map(b => {
                          const bCode = b.branch_code ?? "";
                          return (
                            <ComboboxItem key={b.id} value={String(b.id)}>
                              <div className="flex items-center justify-between w-full">
                                <span className="font-medium">{b.branch_name}</span>
                                <span className="text-[10px] font-bold text-muted-foreground/40 font-mono">
                                  {bCode}
                                </span>
                              </div>
                            </ComboboxItem>
                          );
                        });
                      })()}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                {form.formState.errors.branch_id && (
                  <p className="text-xs text-red-500 font-medium">
                    {String(form.formState.errors.branch_id.message)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier" className="text-sm font-bold text-muted-foreground">
                  Supplier <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  value={watchedSupplierIdForSelect ? String(watchedSupplierIdForSelect) : ""}
                  onValueChange={(v: string | null) => {
                    if (!v) {
                      setSupplierInputValue("");
                      form.setValue("supplier_id", 0, { shouldValidate: true });
                      return;
                    }
                    const found = suppliers.find(s => String(s.id) === v);
                    if (found) setSupplierInputValue(`${found.supplier_name}${found.supplier_shortcut ? ` (${found.supplier_shortcut})` : ""}`);
                    form.setValue("supplier_id", Number(v), { shouldValidate: true });
                  }}
                  inputValue={supplierInputValue}
                  onInputValueChange={(v: string) => {
                    const matched = suppliers.find(s => String(s.id) === v);
                    if (matched) {
                      setSupplierInputValue(`${matched.supplier_name}${matched.supplier_shortcut ? ` (${matched.supplier_shortcut})` : ""}`);
                      setSupplierSearch("");
                    } else {
                      setSupplierInputValue(v);
                      setSupplierSearch(v);
                    }
                  }}
                >
                  <ComboboxInput
                    placeholder={isSuppliersLoading ? "Loading suppliers..." : "Select Supplier"}
                    disabled={isReadOnly || !!id}
                    className={form.formState.errors.supplier_id ? "border-red-500 bg-red-50 dark:bg-red-900/10" : ""}
                    showTrigger={!id}
                    showClear={!id && !isReadOnly}
                  />
                  <ComboboxContent>
                    <ComboboxList>
                      {(() => {
                        const filtered = suppliers.filter(s =>
                          s.supplier_name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
                          (s.supplier_shortcut ?? "").toLowerCase().includes(supplierSearch.toLowerCase())
                        );
                        if (filtered.length === 0) {
                          return (
                            <ComboboxEmpty>
                              {isSuppliersLoading ? "Fetching supplier list..." : "No suppliers found."}
                            </ComboboxEmpty>
                          );
                        }
                        return filtered.map(s => (
                          <ComboboxItem key={s.id} value={String(s.id)}>
                            <span className="font-medium">{s.supplier_name}</span>
                            <span className="text-[10px] font-bold text-muted-foreground/40 font-mono italic ml-2">
                              {s.supplier_shortcut || ""}
                            </span>
                          </ComboboxItem>
                        ));
                      })()}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                {form.formState.errors.supplier_id && (
                  <p className="text-xs text-red-500 font-medium">
                    {String(form.formState.errors.supplier_id.message)}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-muted-foreground">
                Adjustment Type <span className="text-red-500">*</span>
              </Label>
              <RadioGroup
                value={watchedType}
                onValueChange={(v) => form.setValue("type", v as "IN" | "OUT")}
                className="flex gap-4 pt-1"
                disabled={isReadOnly}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="IN"
                    id="type-in"
                    className="border-blue-500 text-blue-600 h-4 w-4"
                  />
                  <Label htmlFor="type-in" className="text-sm font-bold text-foreground/80">
                    Stock In
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="OUT"
                    id="type-out"
                    className="border-input text-blue-600 h-4 w-4"
                  />
                  <Label htmlFor="type-out" className="text-sm font-bold text-foreground/80">
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
              <Label htmlFor="remarks" className="text-sm font-bold text-muted-foreground">
                Remarks
              </Label>
              <Textarea
                id="remarks"
                {...form.register("remarks")}
                placeholder="Additional information about this adjustment..."
                className="min-h-[120px] bg-background border-input focus:ring-blue-500 rounded-xl p-4 text-sm"
                disabled={isReadOnly}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm bg-card">
          <CardHeader className="bg-card border-b border-border flex flex-row items-center justify-between py-4 px-6">
            <CardTitle className="text-base font-bold text-foreground">
              Product Items
            </CardTitle>
            <Button
              type="button"
              onClick={handleAddProduct}
              disabled={!watchedSupplierIdForSelect || isReadOnly}
              className={`${(!watchedSupplierIdForSelect || isReadOnly)
                ? "bg-muted text-muted-foreground border-border"
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
                  <div className="bg-muted/10 border-2 border-dashed border-border rounded-xl p-16 text-center">
                    <div className="flex justify-center mb-4">
                      <div className={`p-5 rounded-full border border-dashed ${watchedSupplierIdForSelect ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50" : "bg-muted border-border"
                        }`}>
                        <Package className={`h-10 w-10 ${watchedSupplierIdForSelect ? "text-blue-400" : "text-muted-foreground/30"
                          }`} />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {watchedSupplierIdForSelect ? "Ready to add products" : "Supplier required"}
                    </h3>
                    <p className="text-muted-foreground font-medium max-w-xs mx-auto text-sm">
                      {watchedSupplierIdForSelect
                        ? "Click 'Add Product' to start building your adjustment from this supplier."
                        : "Select a supplier first to see the products linked to them."}
                    </p>
                    {form.formState.errors.items &&
                      form.formState.errors.items.message && (
                        <p className="text-sm text-red-500 font-bold mt-4">
                          {form.formState.errors.items.message}
                        </p>
                      )}
                  </div>
                ) : (
                  <div className="p-0">
                    {fields.map((field, index) => (
                      <StockAdjustmentManualItemRow
                        key={field.id}
                        index={index}
                        control={form.control}
                        productOptions={productOptions}
                        isProductsLoading={isProductsLoading}
                        isLoadingDetails={loadingRows.has(index)}
                        onProductSelect={handleProductSelect}
                        onRemove={(idx) => setDeletingIndex(idx)}
                        setValue={form.setValue}
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
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-10 px-8 font-bold border-border text-muted-foreground hover:bg-card rounded-lg"
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
                <span className="animate-spin mr-2">â—Œ</span>
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
                <span className="animate-spin mr-2">â—Œ</span>
              ) : (
                <Send className="h-4 w-4" />
              )}
              Post Adjustment
            </Button>
          )}
        </div>
      </form>


      {/* Post Confirmation Modal */}
      <AlertDialog open={showPostConfirmation} onOpenChange={setShowPostConfirmation}>
        <AlertDialogContent className="max-w-md bg-card p-6 rounded-xl shadow-2xl border-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Confirm Post Adjustment
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground py-4">
              Are you sure you want to post this adjustment? Once posted, the record will become **READ-ONLY** and inventory levels will be updated across the system.
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowPostConfirmation(false)}
              className="flex-1 h-11 font-bold text-muted-foreground border-border hover:bg-muted rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPost}
              className="flex-1 h-11 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100 dark:shadow-none rounded-lg"
            >
              Confirm and Post
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Item Delete Confirmation */}
      <AlertDialog
        open={deletingIndex !== null}
        onOpenChange={(open) => !open && setDeletingIndex(null)}
      >
        <AlertDialogContent className="max-w-md bg-card p-6 rounded-xl shadow-2xl border-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Remove Item
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground py-4">
              Are you sure you want to remove this item from the adjustment list?
              {deletingIndex !== null && form.getValues(`items.${deletingIndex}.db_id`) && (
                <span className="block mt-2 font-bold text-red-500/80">
                  Note: This is an existing record. Removing it will delete it from this adjustment once you save.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeletingIndex(null)}
              className="flex-1 h-11 font-bold text-muted-foreground border-border hover:bg-muted rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (deletingIndex !== null) {
                  remove(deletingIndex);
                  setDeletingIndex(null);
                  toast.success("Item removed from list");
                }
              }}
              className="flex-1 h-11 font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-100 dark:shadow-none rounded-lg"
            >
              Confirm and Remove
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

