"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch, Control, UseFormSetValue, useFormState, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Trash2,
  Save,
  AlertCircle,
  ArrowLeft,
  Package,
  Send,
  Search,
  Minus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProductSelectionModal } from "../modals/ProductSelectionModal";
import {
  StockAdjustmentFormSchema,
  StockAdjustmentFormValues,
  StockAdjustmentItem,
} from "../../types/stock-adjustment.schema";
import { useStockAdjustmentForm } from "../../hooks/useStockAdjustmentForm";
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
  ComboboxTrigger,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import { AttachmentUpload } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-registration/components/AttachmentUpload";

// ——————————————————————————————————————————————————————————————————————————————
interface StockAdjustmentFormProps {
  id: number | null;
  onCancel?: () => void;
  onSuccess: () => void;
  mode?: "creation" | "posting";
  unpostedList?: { id?: number; doc_no: string }[];
  onSelectId?: (id: number) => void;
}

// ——————————————————————————————————————————————————————————————————————————————
// Memoised item row (renders only when *its own* data changes)
interface ItemRowProps {
  index: number;
  control: Control<StockAdjustmentFormValues>;
  setValue: UseFormSetValue<StockAdjustmentFormValues>;
  isReadOnly?: boolean;
}

const StockAdjustmentItemRow = React.memo(function StockAdjustmentItemRow({
  index,
  control,
  setValue,
  isReadOnly = false,
}: ItemRowProps) {
  const product_name = useWatch({ control, name: `items.${index}.product_name` });
  const unitName = useWatch({ control, name: `items.${index}.unit_name` });
  const quantity = useWatch({ control, name: `items.${index}.quantity` });
  const costPerUnit = useWatch({ control, name: `items.${index}.cost_per_unit` });
  const brandName = useWatch({ control, name: `items.${index}.brand_name` });
  const barcode = useWatch({ control, name: `items.${index}.barcode` });

  const { errors } = useFormState({ control });
  const rowError = Array.isArray(errors.items)
    ? (errors.items[index] as FieldErrors<StockAdjustmentItem>)
    : undefined;

  const totalCost = Number(quantity || 0) * Number(costPerUnit || 0);

  return (
    <tr className="border-b border-border/50 hover:bg-muted/10 transition-colors bg-card">
      <td className="p-3 text-xs text-muted-foreground text-center font-bold w-12 border-r border-border/50">{index + 1}</td>
      <td className="p-3">
        <span className="text-xs font-bold text-foreground">{brandName || "—"}</span>
      </td>
      <td className="p-3 min-w-[250px]">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-foreground leading-tight">{product_name || "—"}</span>
          <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{barcode || "N/A"}</span>
        </div>
      </td>
      <td className="p-3">
        <span className="text-xs font-bold text-foreground">
          ₱{Number(costPerUnit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-primary bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded uppercase shrink-0">
            {unitName || "-"}
          </span>
        </div>
      </td>
      <td className="p-3 w-40 text-center">
        {isReadOnly ? (
          <span className="text-xs font-bold px-3 py-1 bg-muted rounded-md border border-border/50 inline-block text-center min-w-10">{quantity}</span>
        ) : (
          <div className="flex items-center gap-0 w-min bg-background border border-border rounded-md overflow-hidden mx-auto">
            <button 
              type="button"
              className="w-7 h-7 flex items-center justify-center hover:bg-muted text-muted-foreground disabled:opacity-50 transition-colors"
              onClick={() => setValue(`items.${index}.quantity`, Math.max(1, Number(quantity || 0) - 1), { shouldValidate: true })}
              disabled={Number(quantity || 0) <= 1}
            >
              <Minus className="h-3 w-3" />
            </button>
            <input
              type="number"
              value={quantity === 0 ? "" : quantity}
              onChange={(e) => {
                let val = parseInt(e.target.value, 10);
                if (isNaN(val) || val < 1) val = 1;
                setValue(`items.${index}.quantity`, val, { shouldValidate: true });
              }}
              className="w-12 h-7 text-center text-xs font-bold border-x border-border focus:outline-none focus:ring-0 bg-transparent p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min={1}
            />
            <button 
              type="button"
              className="w-7 h-7 flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
              onClick={() => setValue(`items.${index}.quantity`, Number(quantity || 0) + 1, { shouldValidate: true })}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        )}
        {rowError?.quantity && (
          <p className="text-[10px] text-red-500 font-bold mt-1 text-center">{rowError.quantity.message}</p>
        )}
      </td>
      <td className="p-3">
        <span className="text-xs font-bold text-primary dark:text-primary/70">
          ₱{Number(totalCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </td>
    </tr>
  );
});

// ——————————————————————————————————————————————————————————————————————————————
function FormSummary({
  control,
  fieldCount,
}: {
  control: Control<StockAdjustmentFormValues>;
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
          <span className="text-xl font-bold text-primary dark:text-primary/70">
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
export function StockAdjustmentForm({
  id,
  onCancel,
  onSuccess,
  mode = "creation",
  unpostedList,
  onSelectId,
}: StockAdjustmentFormProps) {
  const router = useRouter();
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
    fetchBranchRfidData,
    fetchBranchInventory,
    rfidProductIds,
    inventoryMap,
    fetchNextDocNo,
    postAdjustment,
    deleteAdjustment,
  } = useStockAdjustmentForm();

  const [loading, setLoading] = useState(false);
  const [showPostConfirmation, setShowPostConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [branchInputValue, setBranchInputValue] = useState("");
  const [supplierInputValue, setSupplierInputValue] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [docSearch, setDocSearch] = useState("");
  const [sourceType, setSourceType] = useState<string>("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [pendingExitAction, setPendingExitAction] = useState<string | (() => void) | null>(null);
  const initialValuesRef = useRef<string>("");


  const form = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(StockAdjustmentFormSchema),
    defaultValues: {
      doc_no: "", 
      branch_id: 0,
      supplier_id: 0,
      type: "IN",
      remarks: "",
      items: [],
      isPosted: false,
      stock_adjustment_attachment: [],
    },
  });

  const { fields, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

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

          let finalSupplierId = data.supplier_id
            ? (typeof data.supplier_id === "object" ? (data.supplier_id as { id: number }).id : data.supplier_id)
            : 0;

          if (!finalSupplierId && data.items && data.items.length > 0) {
            const firstWithInferred = data.items.find((item) => (item as StockAdjustmentItem).inferred_supplier_id);
            if (firstWithInferred) {
              finalSupplierId = (firstWithInferred as StockAdjustmentItem).inferred_supplier_id || 0;
            }
          }

          const resolvedIsPosted = isPostedStatus(data.isPosted);

          // Determine the source type (RFID vs MANUAL vs SERIAL)
          const srcType = (data as { source_type?: string }).source_type || (data.remarks?.includes("MANUAL") ? "MANUAL" : /-(SERIAL)-/i.test(data.doc_no) ? "SERIAL" : "RFID");
          setSourceType(srcType);

          const resetObj = {
            doc_no: data.doc_no || "",
            branch_id:
              typeof data.branch_id === "object"
                ? Number(data.branch_id?.id || 0)
                : Number(data.branch_id || 0),
            supplier_id: Number(finalSupplierId || 0),
            type: (data.type?.toUpperCase() as "IN" | "OUT") || "IN",
            remarks: data.remarks || "",
            isPosted: resolvedIsPosted,
            postedAt: data.postedAt || undefined,
            posted_by: data.posted_by || undefined,
            stock_adjustment_attachment: (data as { stock_adjustment_attachment?: unknown[] }).stock_adjustment_attachment || [],
            items: data.items.map((item) => ({
              ...item,
              quantity: Number(item.quantity || 0),
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
              cost_per_unit: Number(
                (item.product_id as { cost_per_unit?: number; price_per_unit?: number })?.cost_per_unit ||
                (item.product_id as { cost_per_unit?: number; price_per_unit?: number })?.price_per_unit ||
                item.cost_per_unit ||
                0
              ),
              current_stock: Number(item.current_stock || 0),
              unit_name:
                item.unit_name ||
                (item.product_id as { unit_name?: string })?.unit_name ||
                "pcs",
              unit_order: (item.product_id as { unit_of_measurement?: { order: number } })?.unit_of_measurement?.order || 1,
              rfid_tags: item.rfid_tags || [],
              rfid_count: item.rfid_count || 0,
              db_id: Number(item.id || 0),
              has_rfid: (item.rfid_tags && item.rfid_tags.length > 0) || rfidProductIds.has(Number((item.product_id as { id?: number; product_id?: number })?.product_id || (item.product_id as { id?: number; product_id?: number })?.id || item.product_id)),
            })),
          };

          form.reset(resetObj);
          initialValuesRef.current = JSON.stringify(resetObj);
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

  const watchedBranchId = useWatch({ control: form.control, name: "branch_id" });
  const watchedSupplierId = useWatch({ control: form.control, name: "supplier_id" });
  const watchedDocNo = useWatch({ control: form.control, name: "doc_no" });

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
      fetchBranchRfidData(Number(watchedBranchId));
      fetchBranchInventory(Number(watchedBranchId));
    }
  }, [watchedBranchId, fetchBranchRfidData, fetchBranchInventory]);

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

  useEffect(() => {
    if (watchedSupplierId) {
      fetchProductsBySupplier(Number(watchedSupplierId));
    }
  }, [watchedSupplierId, fetchProductsBySupplier]);

  const isFormLoading = id ? loading : false;
  const isPosted = useWatch({ control: form.control, name: "isPosted" });
  const isReadOnly = !!isPosted || mode === "posting";

  const isFormModified = useCallback(() => {
    if (isReadOnly) return false;
    if (form.formState.isDirty) return true;

    try {
      const current = form.getValues();
      const initialStr = initialValuesRef.current;
      if (!initialStr) return false;

      const initial = JSON.parse(initialStr);

      if (Number(current.branch_id) !== Number(initial.branch_id)) return true;
      if (Number(current.supplier_id) !== Number(initial.supplier_id)) return true;
      if (current.type !== initial.type) return true;
      if ((current.remarks || "") !== (initial.remarks || "")) return true;

      const currentItems = current.items || [];
      const initialItems = initial.items || [];
      if (currentItems.length !== initialItems.length) return true;

      for (let i = 0; i < currentItems.length; i++) {
        const cItem = currentItems[i];
        const iItem = initialItems[i];
        if (Number(cItem?.product_id) !== Number(iItem?.product_id)) return true;
        if (Number(cItem?.quantity) !== Number(iItem?.quantity)) return true;

        const cTags = cItem?.rfid_tags || [];
        const iTags = iItem?.rfid_tags || [];
        if (cTags.length !== iTags.length) return true;
        if (cTags.some((tag, idx) => tag !== iTags[idx])) return true;
      }
    } catch (e) {
      console.error("Error checking form modifications:", e);
    }

    return false;
  }, [form, isReadOnly]);

  const handleCancelOrExit = useCallback((action: string | (() => void)) => {
    if (isFormModified()) {
      setPendingExitAction(() => action);
      setShowUnsavedChangesModal(true);
    } else {
      if (typeof action === "function") {
        action();
      } else {
        router.push(action);
      }
    }
  }, [isFormModified, router]);

  const confirmDiscardAndExit = useCallback(() => {
    setShowUnsavedChangesModal(false);
    if (typeof pendingExitAction === "function") {
      pendingExitAction();
    } else if (typeof pendingExitAction === "string") {
      router.push(pendingExitAction);
    } else {
      router.push("/scm/inventory-management/stock-adjustment-summary");
    }
    setPendingExitAction(null);
  }, [pendingExitAction, router]);

  const handlePost = async () => {
    if (!id) return;
    setShowPostConfirmation(true);
  };

  const confirmPost = async () => {
    setShowPostConfirmation(false);
    if (!id) return;

    form.handleSubmit(
      async (values) => {
        setLoading(true);
        try {
          // 1. Save/update the adjustment with current form values (e.g. added products)
          await updateAdjustment(id, values);

          // 2. Post the adjustment to finalize and update inventory
          await postAdjustment(id);
          toast.success("Adjustment Posted Successfully");
          onSuccess();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to post adjustment");
        } finally {
          setLoading(false);
        }
      },
      onInvalid
    )();
  };

  const confirmDelete = async () => {
    setShowDeleteConfirmation(false);
    if (!id) return;
    setLoading(true);
    try {
      await deleteAdjustment(id);
      toast.success("Adjustment Deleted Successfully");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete adjustment");
    } finally {
      setLoading(false);
    }
  };

  const onInvalid = () => {
    toast.error("Please fill in all required fields correctly.");
  };

  const onSubmit = useCallback(
    async (values: StockAdjustmentFormValues) => {
      if (mode === "posting") return;
      setLoading(true);
      try {
        if (id) {
          await updateAdjustment(id, values);
          // Reset the "initial" snapshot so the form is no longer considered
          // modified — prevents the unsaved-changes modal from appearing after saving.
          initialValuesRef.current = JSON.stringify(values);
          form.reset(values, { keepValues: true });
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
    [id, createAdjustment, updateAdjustment, onSuccess, form, mode]
  );

  const handleSaveAndExit = useCallback(async () => {
    setShowUnsavedChangesModal(false);
    await form.handleSubmit(
      async (values: StockAdjustmentFormValues) => {
        setLoading(true);
        try {
          if (id) {
            await updateAdjustment(id, values);
            toast.success("Adjustment Saved Successfully");
          } else {
            await createAdjustment(values);
            toast.success("Adjustment Created Successfully");
          }

          if (typeof pendingExitAction === "function") {
            pendingExitAction();
          } else if (typeof pendingExitAction === "string") {
            router.push(pendingExitAction);
          } else {
            router.push("/scm/inventory-management/stock-adjustment-summary");
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Failed to save adjustment";
          toast.error(message);
        } finally {
          setLoading(false);
          setPendingExitAction(null);
        }
      },
      onInvalid
    )();
  }, [id, createAdjustment, updateAdjustment, router, form, pendingExitAction]);

  const handleConfirmModalItems = useCallback(
    (newItems: StockAdjustmentItem[]) => {
      const branchId = form.getValues("branch_id");
      const currentType = form.getValues("type");
      
      const mapped = newItems.map((item) => ({
        ...item,
        branch_id: branchId,
        type: currentType
      }));
      
      form.setValue("items", mapped, { shouldValidate: true });
      
      // Async stock fetch
      mapped.forEach((item, idx) => {
        const pid = Number(item.product_id);
        const cachedStock = inventoryMap.get(pid) ?? 0;
        if (cachedStock === 0) {
           fetchInventory(pid, branchId).then(stock => {
              form.setValue(`items.${idx}.current_stock`, stock);
           }).catch(console.error);
        } else {
           form.setValue(`items.${idx}.current_stock`, cachedStock);
        }
      });
    },
    [form, fetchInventory, inventoryMap]
  );



  const watchedBranchIdForSelect = useWatch({ control: form.control, name: "branch_id" });
  const watchedSupplierIdForSelect = useWatch({ control: form.control, name: "supplier_id" });
  const watchedType = useWatch({ control: form.control, name: "type" });

  const watchedItemsList = useWatch({ control: form.control, name: "items" });

  const filteredFields = useMemo(() => {
    return fields.map((field, index) => ({ field, index })).filter(({ index }) => {
      if (!tableSearch.trim()) return true;
      const s = tableSearch.toLowerCase();
      const item = watchedItemsList?.[index];
      return (
        item?.product_name?.toLowerCase().includes(s) ||
        item?.product_code?.toLowerCase().includes(s) ||
        item?.barcode?.toLowerCase().includes(s) ||
        item?.brand_name?.toLowerCase().includes(s)
      );
    });
  }, [fields, tableSearch, watchedItemsList]);

  const totalPages = Math.max(1, Math.ceil(filteredFields.length / rowsPerPage));
  const paginatedFields = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredFields.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredFields, currentPage, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto w-full bg-background">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg shadow-sm">
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
          {onCancel && (
            <Button
              variant="outline"
              onClick={() => handleCancelOrExit(onCancel)}
              className="gap-2 h-10 border-border bg-card shadow-sm font-bold text-muted-foreground hover:bg-muted rounded-lg transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to List
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {mode === "posting"
              ? id
                ? "Review & Post Stock Adjustment"
                : "Select Stock Adjustment"
              : id
              ? "Edit Stock Adjustment"
              : "New Stock Adjustment"}
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
          {id && sourceType && (
            <Badge
              variant="outline"
              className={`px-3 py-1 font-bold shadow-sm ${
                sourceType === "RFID"
                  ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800/50"
                  : "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50"
              } uppercase tracking-wider`}
            >
              {sourceType === "RFID" ? "RFID Base" : "Non-RFID"}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {mode === "posting"
            ? "Review unposted stock adjustment details before posting to inventory"
            : "Record stock movement and adjust inventory levels"}
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
                  return typeof postedBy === 'object' ? `${postedBy?.user_fname} ${postedBy?.user_lname}` : postedBy || "System User";
                })()}
              </span>
            </div>
          </div>
        )}
      </div>



      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        <Card className="border-border shadow-sm bg-card border border-border/40">
          <CardHeader className="bg-card border-b border-border py-4 px-6">
            <CardTitle className="text-base font-bold text-foreground">
              Adjustment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="doc_no" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {unpostedList ? "Review Document" : "Document Number"}
                </Label>
                {unpostedList && onSelectId ? (
                  <Combobox
                    value={id ? String(id) : ""}
                    onValueChange={(v: string | null) => {
                      if (v) {
                        onSelectId(Number(v));
                        setDocSearch("");
                      }
                    }}
                  >
                    <ComboboxTrigger className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-xs font-bold shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring select-none text-left">
                      <span>{watchedDocNo || "Select Document"}</span>
                    </ComboboxTrigger>
                    <ComboboxContent className="min-w-[240px]">
                      <div className="p-2 border-b border-border/50">
                        <Input
                          placeholder="Search document..."
                          value={docSearch}
                          onChange={(e) => setDocSearch(e.target.value)}
                          className="h-8 text-xs bg-muted/30"
                          autoFocus
                        />
                      </div>
                      <ComboboxList>
                        {(() => {
                          const filtered = unpostedList.filter((item) =>
                            item.doc_no.toLowerCase().includes(docSearch.toLowerCase())
                          );
                          if (filtered.length === 0) {
                            return <ComboboxEmpty>No documents found.</ComboboxEmpty>;
                          }
                          return filtered.map((item) => (
                            <ComboboxItem key={item.id} value={String(item.id)}>
                              <span className="font-bold text-xs">{item.doc_no}</span>
                            </ComboboxItem>
                          ));
                        })()}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                ) : (
                  <Input
                    id="doc_no"
                    {...form.register("doc_no")}
                    readOnly
                    className="bg-muted/50 border-input h-11 text-xs font-semibold"
                  />
                )}
              </div>
              {(id !== null || mode !== "posting") && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="branch" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
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
                        disabled={isReadOnly || !!id || fields.length > 0}
                        className={form.formState.errors.branch_id ? "border-red-500 bg-red-50 dark:bg-red-900/10 text-xs" : "text-xs"}
                        showTrigger={!id && fields.length === 0}
                        showClear={!id && !isReadOnly && fields.length === 0}
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
                                    <span className="font-medium text-xs">{b.branch_name}</span>
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
                      <p className="text-xs text-red-500 font-medium mt-1">
                        {String(form.formState.errors.branch_id.message)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supplier" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
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
                        disabled={isReadOnly || !!id || fields.length > 0}
                        className={form.formState.errors.supplier_id ? "border-red-500 bg-red-50 dark:bg-red-900/10 text-xs" : "text-xs"}
                        showTrigger={!id && fields.length === 0}
                        showClear={!id && !isReadOnly && fields.length === 0}
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
                                <span className="font-medium text-xs">{s.supplier_name}</span>
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
                      <p className="text-xs text-red-500 font-medium mt-1">
                        {String(form.formState.errors.supplier_id.message)}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {(id !== null || mode !== "posting") && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Adjustment Type <span className="text-red-500">*</span>
                  </Label>
                  <RadioGroup
                    value={watchedType}
                    onValueChange={(v) => form.setValue("type", v as "IN" | "OUT")}
                    className="flex gap-4 pt-1"
                    disabled={isReadOnly || !!id || fields.length > 0}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="IN"
                        id="type-in"
                        className="border-primary text-primary h-4 w-4"
                      />
                      <Label htmlFor="type-in" className="text-xs font-bold text-foreground/80 uppercase">
                        Stock In
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="OUT"
                        id="type-out"
                        className="border-input text-primary h-4 w-4"
                      />
                      <Label htmlFor="type-out" className="text-xs font-bold text-foreground/80 uppercase">
                        Stock Out
                      </Label>
                    </div>
                  </RadioGroup>
                  {form.formState.errors.type && (
                    <p className="text-xs text-red-500 font-medium mt-1">
                      {String(form.formState.errors.type.message)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remarks" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Remarks
                  </Label>
                  <Textarea
                    id="remarks"
                    {...form.register("remarks")}
                    placeholder="Additional information about this adjustment..."
                    className="min-h-[120px] bg-background border-input focus:ring-primary rounded-xl p-4 text-xs font-medium"
                    disabled={isReadOnly}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {(id !== null || mode !== "posting") ? (
          <>
            {/* Product Items Table Workspace */}
            <Card className="border-border shadow-sm bg-card border border-border/40">
              <CardHeader className="bg-card border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 px-6">
                <div>
                  <CardTitle className="text-base font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Product Items
                  </CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Search products in cart..."
                      value={tableSearch}
                      onChange={(e) => {
                        setTableSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-9 h-9 text-xs border-input font-semibold"
                    />
                  </div>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      disabled={!watchedSupplierIdForSelect}
                      className="font-bold h-9 px-4 rounded-full shadow-sm flex items-center gap-2 text-xs transition-all border-primary/20 text-primary bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:border-primary/40 shrink-0"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4" />
                      ADD MORE PRODUCTS
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isFormLoading || (isProductsLoading && fields.length === 0) ? (
                  <div className="p-6 space-y-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-4">
                        <Skeleton className="h-10 flex-[3]" />
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 flex-1" />
                      </div>
                    ))}
                  </div>
                ) : fields.length === 0 ? (
                  <div className="bg-muted/10 border-2 border-dashed border-border rounded-xl m-6 p-16 text-center">
                    <div className="flex justify-center mb-4">
                      <div className="p-5 rounded-full border border-dashed bg-muted border-border">
                        <Package className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {watchedSupplierIdForSelect ? "Empty Cart" : "Supplier required"}
                    </h3>
                    <p className="text-muted-foreground font-semibold max-w-xs mx-auto text-xs">
                      {watchedSupplierIdForSelect
                        ? "Click \"ADD MORE PRODUCTS\" to browse and add items."
                        : "Select a supplier first to browse and add products."}
                    </p>
                    {form.formState.errors.items && form.formState.errors.items.message && (
                      <p className="text-sm text-red-500 font-bold mt-4 animate-in fade-in">
                        {form.formState.errors.items.message}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[10px] font-bold uppercase text-muted-foreground bg-muted/40 border-b border-border">
                        <tr>
                          <th className="p-3 text-center w-12 border-r border-border/50">#</th>
                          <th className="p-3">Brand</th>
                          <th className="p-3">Product Name</th>
                          <th className="p-3">Price</th>
                          <th className="p-3">UOM</th>
                          <th className="p-3 w-40 text-center">Qty</th>
                          <th className="p-3">Net Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedFields.length === 0 && tableSearch ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                              No products found matching &quot;{tableSearch}&quot;.
                            </td>
                          </tr>
                        ) : (
                          paginatedFields.map(({ field, index }) => (
                            <StockAdjustmentItemRow
                              key={field.id}
                              index={index}
                              control={form.control}
                              setValue={form.setValue}
                              isReadOnly={isReadOnly}
                            />
                          ))
                        )}
                      </tbody>
                    </table>
                    <div className="p-4 bg-muted/10 border-t border-border/50 text-xs font-semibold text-muted-foreground flex justify-between items-center">
                      <span>{filteredFields.length} total rows</span>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">Rows per page</span>
                          <select 
                            className="h-8 border border-border rounded-md bg-card px-2 text-xs focus:outline-none font-bold"
                            value={rowsPerPage}
                            onChange={(e) => {
                              setRowsPerPage(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                          >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                        <span className="text-xs font-bold text-foreground">Page {currentPage} of {totalPages}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground bg-card"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(1)}
                          >
                            <ChevronsLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground bg-card"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground bg-card"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground bg-card"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                          >
                            <ChevronsRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary Block */}
                <FormSummary
                  control={form.control}
                  fieldCount={fields.length}
                />
              </CardContent>
            </Card>



            {/* Action Workspace buttons */}
            <div className="flex items-center justify-end gap-3 pb-8">
              {onCancel ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCancelOrExit(onCancel)}
                  className="h-10 px-8 font-bold border-border text-muted-foreground hover:bg-card rounded-lg transition-colors text-xs"
                >
                  Cancel
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCancelOrExit("/scm/inventory-management/stock-adjustment-summary")}
                  className="h-10 px-8 font-bold border-border text-muted-foreground hover:bg-card rounded-lg transition-colors text-xs"
                >
                  Cancel
                </Button>
              )}
              {!isReadOnly && (mode as string) !== "posting" && (
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-10 px-8 font-bold bg-primary hover:bg-primary/95 text-primary-foreground gap-2 shadow-sm rounded-lg transition-all duration-300 hover:scale-[1.02] text-xs"
                >
                  {loading ? (
                    <span className="animate-spin mr-2">â—Œ</span>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {id ? "Update Adjustment" : "Save Adjustment"}
                </Button>
              )}

              {id && !isPosted && mode === "posting" && (
                <Button
                  type="button"
                  onClick={() => setShowDeleteConfirmation(true)}
                  disabled={loading}
                  className="h-10 px-8 font-bold bg-red-600 hover:bg-red-700 text-white gap-2 shadow-sm rounded-lg animate-in fade-in zoom-in-95 duration-200 transition-all duration-300 hover:scale-[1.02] text-xs"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Adjustment
                </Button>
              )}

              {id && !isPosted && mode === "posting" && (
                <Button
                  type="button"
                  onClick={handlePost}
                  disabled={loading}
                  className="h-10 px-8 font-bold bg-green-600 hover:bg-green-700 text-white gap-2 shadow-sm rounded-lg animate-in fade-in zoom-in-95 duration-200 transition-all duration-300 hover:scale-[1.02] text-xs"
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
          </>
        ) : (
          <Card className="border-dashed border-2 border-border/60 bg-muted/5 flex flex-col items-center justify-center p-16 text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-2">No Document Selected</h3>
            <p className="text-xs text-muted-foreground font-semibold max-w-sm">
              Please select a Document Number from the review dropdown above to populate and view the stock adjustment details.
            </p>
          </Card>
        )}
      </form>



      {isModalOpen && (
        <ProductSelectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          supplierName={
            suppliers.find((s) => String(s.id) === String(watchedSupplierIdForSelect))?.supplier_name || ""
          }
          branchName={
            branches?.find((b) => String(b.id) === String(watchedBranchIdForSelect))?.branch_name || ""
          }
          products={products}
          isLoading={isProductsLoading}
          rfidProductIds={rfidProductIds}
          initialSelectedItems={form.getValues("items")}
          onConfirm={handleConfirmModalItems}
        />
      )}



      {/* Post Confirmation AlertDialog Popup */}
      <AlertDialog open={showPostConfirmation} onOpenChange={setShowPostConfirmation}>
        <AlertDialogContent className="max-w-md bg-card p-6 rounded-xl shadow-2xl border-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Confirm Post Adjustment
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground py-4 text-xs font-semibold">
              Are you sure you want to post this adjustment? Once posted, the record will become **READ-ONLY** and inventory levels will be updated across the system.
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowPostConfirmation(false)}
              className="flex-1 h-11 font-bold text-muted-foreground border-border hover:bg-muted rounded-lg text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPost}
              className="flex-1 h-11 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/10 rounded-lg text-xs"
            >
              Confirm and Post
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation AlertDialog Popup */}
      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent className="max-w-md bg-card p-6 rounded-xl shadow-2xl border-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Confirm Delete Adjustment
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground py-4 text-xs font-semibold">
              Are you sure you want to delete this stock adjustment transaction? This action will permanently remove it from the system.
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirmation(false)}
              className="flex-1 h-11 font-bold text-muted-foreground border-border hover:bg-muted rounded-lg text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="flex-1 h-11 font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-100 rounded-lg text-xs"
            >
              Confirm and Delete
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved Changes Confirmation Dialog */}
      <AlertDialog open={showUnsavedChangesModal} onOpenChange={setShowUnsavedChangesModal}>
        <AlertDialogContent className="max-w-md bg-card p-6 rounded-xl shadow-2xl border-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Unsaved Changes
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground py-4 text-xs font-semibold">
              You have unsaved changes in this stock adjustment draft. What would you like to do before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            <Button
              onClick={handleSaveAndExit}
              disabled={loading}
              className="w-full h-11 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md rounded-lg text-xs"
            >
              {loading ? <span className="animate-spin mr-2">⌾</span> : null}
              Save and Exit
            </Button>
            <Button
              variant="outline"
              onClick={confirmDiscardAndExit}
              className="w-full h-11 font-bold bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-800/30 rounded-lg text-xs"
            >
              Discard Changes and Exit
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowUnsavedChangesModal(false);
                setPendingExitAction(null);
              }}
              className="w-full h-11 font-bold text-muted-foreground hover:bg-muted rounded-lg text-xs"
            >
              Keep Editing
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
            <AlertDialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Remove Item
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground py-4 text-xs font-semibold">
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
              className="flex-1 h-11 font-bold text-muted-foreground border-border hover:bg-muted rounded-lg text-xs"
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
              className="flex-1 h-11 font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-100 rounded-lg text-xs"
            >
              Confirm and Remove
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
