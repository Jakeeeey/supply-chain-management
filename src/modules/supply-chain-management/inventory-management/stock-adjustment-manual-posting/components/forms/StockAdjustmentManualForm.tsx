"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch, Control, UseFormSetValue, useFormState, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Trash2,
  ArrowLeft,
  Package,
  Send,
  Search,
  Minus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Paperclip,
  AlertCircle,
  Printer,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { decodeJwtPayload } from "../../utils/auth-utils";
import { Badge } from "@/components/ui/badge";
import {
  StockAdjustmentManualFormSchema,
  StockAdjustmentManualFormValues,
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
import { ProductSelectionModal } from "../modals/ProductSelectionModal";
import { AttachmentUpload } from "../AttachmentUpload";

// ——————————————————————————————————————————————————————————————————————————————
interface StockAdjustmentManualFormProps {
  id: number | null;
  onCancel?: () => void;
  onSuccess: () => void;
  mode?: "creation" | "posting";
  unpostedList?: { id?: number; doc_no: string }[];
  onSelectId?: (id: number) => void;
  userFullName?: string;
}

// ——————————————————————————————————————————————————————————————————————————————
// ——————————————————————————————————————————————————————————————————————————————
// Table row for the main form
interface ProductTableRowProps {
  index: number;
  control: Control<StockAdjustmentManualFormValues>;
  onRemove: (index: number) => void;
  setValue: UseFormSetValue<StockAdjustmentManualFormValues>;
  isReadOnly?: boolean;
}

const ProductTableRow = React.memo(function ProductTableRow({
  index,
  control,
  onRemove,
  setValue,
  isReadOnly = false,
}: ProductTableRowProps) {
  const product_name = useWatch({ control, name: `items.${index}.product_name` });
  const product_code = useWatch({ control, name: `items.${index}.product_code` });
  const unitName = useWatch({ control, name: `items.${index}.unit_name` });
  const quantity = useWatch({ control, name: `items.${index}.quantity` });
  const costPerUnit = useWatch({ control, name: `items.${index}.cost_per_unit` });
  const brandName = useWatch({ control, name: `items.${index}.brand_name` });

  const { errors } = useFormState({ control });
  const rowError = Array.isArray(errors.items)
    ? (errors.items[index] as FieldErrors<StockAdjustmentManualItem>)
    : undefined;

  const totalCost = Number(quantity || 0) * Number(costPerUnit || 0);

  const handleUpdateQuantity = (delta: number) => {
    const currentQty = Number(quantity || 0);
    const newQty = Math.max(1, currentQty + delta);
    setValue(`items.${index}.quantity`, newQty, { shouldValidate: true });
  };

  return (
    <tr className="border-b border-border/50 hover:bg-muted/10 transition-colors bg-card">
      <td className="p-3 text-xs text-muted-foreground text-center font-bold w-12 border-r border-border/50">{index + 1}</td>
      <td className="p-3">
        <span className="text-xs font-bold text-foreground">{brandName || "—"}</span>
      </td>
      <td className="p-3 min-w-[250px]">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-foreground leading-tight">{product_name || "—"}</span>
          <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{product_code}</span>
        </div>
      </td>
      <td className="p-3">
        <span className="text-[10px] font-bold text-primary bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded uppercase shrink-0">
          {unitName || "-"}
        </span>
      </td>
      <td className="p-3">
        <span className="text-xs font-bold text-foreground">
          ₱{Number(costPerUnit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </td>
      <td className="p-3">
        <span className="text-xs font-bold text-primary dark:text-primary/70">
          ₱{Number(totalCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </td>
      <td className="p-3 w-32">
        {isReadOnly ? (
          <span className="text-xs font-bold px-3 py-1 bg-muted rounded-md border border-border/50">{quantity}</span>
        ) : (
          <div className="flex items-center gap-0 w-min bg-background border border-border rounded-md overflow-hidden">
            <button
              type="button"
              className="w-7 h-7 flex items-center justify-center hover:bg-muted text-muted-foreground disabled:opacity-50 transition-colors"
              onClick={() => handleUpdateQuantity(-1)}
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
              onClick={() => handleUpdateQuantity(1)}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        )}
        {rowError?.quantity && (
          <p className="text-[10px] text-red-500 font-bold mt-1">{rowError.quantity.message}</p>
        )}
      </td>
      <td className="p-3 text-center w-16">
        {!isReadOnly && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(index)}
            className="h-7 w-7 rounded-full text-red-400/50 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all mx-auto"
            title="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </td>
    </tr>
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

// ——————————————————————————————————————————————————————————————————————————————
export function StockAdjustmentManualForm({
  id,
  onCancel,
  onSuccess,
  unpostedList,
  onSelectId,
  mode = "posting",
  userFullName,
}: StockAdjustmentManualFormProps) {
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
    fetchBranchInventory,
    inventoryMap,
    fetchNextDocNo,
    postAdjustment,
    deleteAdjustment,
  } = useStockAdjustmentManualForm();

  const [loading, setLoading] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [pendingExitAction, setPendingExitAction] = useState<string | (() => void) | null>(null);
  const initialValuesRef = useRef<string>("");
  const [showPostConfirmation, setShowPostConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [branchInputValue, setBranchInputValue] = useState("");
  const [supplierInputValue, setSupplierInputValue] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [tableSearch, setTableSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [docSearch, setDocSearch] = useState("");

  useEffect(() => {
    if (id && unpostedList) {
      const found = unpostedList.find(item => item.id === id);
      if (found) {
        setDocSearch(found.doc_no);
      }
    }
  }, [id, unpostedList]);

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
      stock_adjustment_attachment: [],
    },
  });

  const { fields, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const generatePDF = useCallback(() => {
    const values = form.getValues();
    if (!values) return;

    // Retrieve currently logged-in user name from prop or fallback to JWT cookie
    let currentUserName = userFullName || "System User";
    if (!userFullName) {
      try {
        const getCookie = (name: string): string | null => {
          if (typeof window === "undefined") return null;
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
          return null;
        };
        const token = getCookie("vos_access_token");
        if (token) {
          const decoded = decodeJwtPayload(token);
          if (decoded) {
            const first = String(decoded.Firstname ?? decoded.FirstName ?? decoded.firstName ?? decoded.firstname ?? decoded.first_name ?? "").trim();
            const last = String(decoded.LastName ?? decoded.Lastname ?? decoded.lastName ?? decoded.lastname ?? decoded.last_name ?? "").trim();
            const email = String(decoded.email ?? decoded.Email ?? "").trim();
            currentUserName = [first, last].filter(Boolean).join(" ") || email || "System User";
          }
        }
      } catch (e) {
        console.error("Failed to decode token for PDF Prepared By:", e);
      }
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // --- Header ---
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235); // enterprise-blue
    doc.text("STOCK ADJUSTMENT SLIP", pageWidth / 2, 15, { align: "center" });

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 12, 18, pageWidth / 2 + 12, 18);

    // --- Metadata Section ---
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);

    // Left Column
    doc.setFont("helvetica", "bold");
    doc.text("Document No:", 20, 30);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(values.doc_no || "-", 50, 30);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("Date Created:", 20, 36);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    const dateStr = values.postedAt || new Date().toISOString();
    doc.text(format(new Date(dateStr), "yyyy-MM-dd h:mm a"), 50, 36);

    // Right Column
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("Branch:", 110, 30);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    const branchObj = branches.find(b => b.id === Number(values.branch_id));
    const branchName = branchObj ? branchObj.branch_name : "Main Warehouse";
    doc.text(String(branchName).toUpperCase(), 145, 30);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("Adjustment Type:", 110, 36);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(values.type === "IN" ? 22 : 185, values.type === "IN" ? 101 : 28, values.type === "IN" ? 52 : 28);
    doc.text(values.type || "-", 145, 36);

    // --- Product Table ---
    const tableRows = values.items?.map((item, index) => {
      const price = Number(item.cost_per_unit || 0);
      const totalAmount = Number(item.quantity || 0) * price;
      return [
        index + 1,
        item.brand_name || "N/A",
        `${item.product_name || "Unknown"}\n(${item.product_code || "N/A"})`,
        item.unit_name || "pcs",
        `P ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `P ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        item.quantity || 0
      ];
    }) || [];

    autoTable(doc, {
      startY: 45,
      head: [["#", "Brand", "Product Name", "UOM", "Price", "Total Amount", "Qty"]],
      body: tableRows,
      headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { halign: "center" },
        2: { cellWidth: 70 },
        3: { halign: "center" },
        4: { halign: "right" },
        5: { halign: "right", fontStyle: "bold" },
        6: { halign: "center", fontStyle: "bold" }
      },
      theme: "grid",
      styles: { cellPadding: 1.5 }
    });

    const finalY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100) + 8;

    // --- Totals & Remarks Section ---
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text("Total Adjusted Amount", pageWidth - 20, finalY, { align: "right" });

    // Remarks on the left
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("REMARKS:", 20, finalY);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(30, 41, 59);
    const remarks = values.remarks || "N/A";
    const splitRemarks = doc.splitTextToSize(remarks.toUpperCase(), 100);
    doc.text(splitRemarks, 20, finalY + 5);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);

    const totalAmountSum = values.items?.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.cost_per_unit || 0)), 0) || 0;
    const formattedAmount = totalAmountSum.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    doc.text(formattedAmount, pageWidth - 20, finalY + 7, { align: "right" });

    // --- Signatures Section ---
    const pageHeight = doc.internal.pageSize.getHeight();
    let sigY = finalY + 25;

    if (sigY + 20 > pageHeight) {
      doc.addPage();
      sigY = 30;
    }

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");

    doc.setLineWidth(0.2);
    doc.setDrawColor(148, 163, 184);

    // Prepared By
    doc.text("PREPARED BY:", 20, sigY);
    doc.line(20, sigY + 12, 70, sigY + 12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(currentUserName, 20, sigY + 10);

    // Approved By
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("APPROVED BY:", pageWidth / 2 - 25, sigY);
    doc.line(pageWidth / 2 - 25, sigY + 12, pageWidth / 2 + 25, sigY + 12);

    // Received By
    doc.text("RECEIVED BY:", pageWidth - 70, sigY);
    doc.line(pageWidth - 70, sigY + 12, pageWidth - 20, sigY + 12);

    doc.save(`StockAdjustmentManual_${values.doc_no}.pdf`);
  }, [branches, form, userFullName]);

  // ——————————————————————————————————————————————————————————————————————————————
  // Unlock body scroll/pointer-events when save/post loading clears.
  useEffect(() => {
    const unlock = () => {
      document.body.style.setProperty('overflow', 'auto', 'important');
      document.body.style.removeProperty('pointer-events');
    };
    unlock();
    const timer = setTimeout(unlock, 300);
    const timer2 = setTimeout(unlock, 1000);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [loading]);

  // Unlock body scroll/pointer-events when product loading clears.
  // @base-ui Combobox Portal can leave pointer-events:none on <body> after
  // its popup closes, which makes branch/supplier comboboxes unresponsive.
  useEffect(() => {
    const unlock = () => {
      document.body.style.setProperty('overflow', 'auto', 'important');
      document.body.style.removeProperty('pointer-events');
    };
    unlock();
    const timer = setTimeout(unlock, 300);
    const timer2 = setTimeout(unlock, 1000);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [isProductsLoading]);

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

          const resetObj = {
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
            stock_adjustment_attachment: data.stock_adjustment_attachment || [],
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

  useEffect(() => {
    if (!id) {
      const defaultVal = {
        doc_no: form.getValues("doc_no") || "",
        branch_id: 0,
        supplier_id: 0,
        type: "IN",
        remarks: "",
        items: [],
        isPosted: false,
        stock_adjustment_attachment: [],
      };
      initialValuesRef.current = JSON.stringify(defaultVal);
    }
  }, [id, form]);

  // ——————————————————————————————————————————————————————————————————————————————
  useEffect(() => {
    if (!id) {
      const updateDocNo = async () => {
        const type = form.getValues("type");
        const nextDocNo = await fetchNextDocNo(type);
        form.setValue("doc_no", nextDocNo, { shouldValidate: true });
        try {
          const current = JSON.parse(initialValuesRef.current || "{}");
          current.doc_no = nextDocNo;
          initialValuesRef.current = JSON.stringify(current);
        } catch {}
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
        try {
          const current = JSON.parse(initialValuesRef.current || "{}");
          current.doc_no = nextDocNo;
          initialValuesRef.current = JSON.stringify(current);
        } catch {}
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
  const isReadOnly = mode === "posting" || !!isPosted;

  // ——————————————————————————————————————————————————————————————————————————————
  const handlePost = async () => {
    if (!id) return;
    // Validate the form before showing the confirmation dialog
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error("Please fill in all required fields correctly before posting.");
      return;
    }
    setShowPostConfirmation(true);
  };

  const confirmPost = async () => {
    setShowPostConfirmation(false);
    if (!id) return;
    setLoading(true);
    try {
      // Auto-save all pending edits (products, qty, attachments) before posting
      const currentValues = form.getValues();
      await updateAdjustment(id, currentValues);
      await postAdjustment(id);
      toast.success("Adjustment Posted Successfully");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post adjustment");
    } finally {
      setLoading(false);
    }
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
      }

      const currentAtts = current.stock_adjustment_attachment || [];
      const initialAtts = initial.stock_adjustment_attachment || [];
      if (currentAtts.length !== initialAtts.length) return true;
      for (let i = 0; i < currentAtts.length; i++) {
        const cAtt = typeof currentAtts[i]?.attachment === 'object' ? currentAtts[i].attachment.id : currentAtts[i]?.attachment;
        const iAtt = typeof initialAtts[i]?.attachment === 'object' ? initialAtts[i].attachment.id : initialAtts[i]?.attachment;
        if (cAtt !== iAtt) return true;
      }
    } catch (e) {
      console.error("Error checking form modifications:", e);
    }

    return false;
  }, [form, isReadOnly]);

  const handleCancelOrExit = useCallback((action: string | (() => void) | undefined) => {
    if (isFormModified()) {
      setPendingExitAction(() => action || null);
      setShowUnsavedChangesModal(true);
    } else {
      if (typeof action === "function") {
        action();
      } else if (typeof action === "string") {
        router.push(action);
      } else {
        router.push("/scm/inventory-management/stock-adjustment-manual-summary");
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
      router.push("/scm/inventory-management/stock-adjustment-manual-summary");
    }
    setPendingExitAction(null);
  }, [pendingExitAction, router]);

  const handleSaveAndExit = useCallback(async () => {
    setShowUnsavedChangesModal(false);
    await form.handleSubmit(
      async (values: StockAdjustmentManualFormValues) => {
        setLoading(true);
        try {
          if (id) {
            await updateAdjustment(id, values);
            toast.success("Adjustment Saved Successfully");
          } else {
            await createAdjustment(values);
            toast.success("Adjustment Created Successfully");
          }
          initialValuesRef.current = JSON.stringify(values);

          if (typeof pendingExitAction === "function") {
            pendingExitAction();
          } else if (typeof pendingExitAction === "string") {
            router.push(pendingExitAction);
          } else {
            router.push("/scm/inventory-management/stock-adjustment-manual-summary");
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
        initialValuesRef.current = JSON.stringify(values);
        onSuccess?.();
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
  // handleConfirmModalItems — applies modal cart state to form
  const handleConfirmModalItems = useCallback(
    (newItems: StockAdjustmentManualItem[]) => {
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

  // Ensure current page is valid when filtering changes total pages
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
              Stock Adjustment Manual Posting
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
              className="gap-2 h-10 border-border bg-card shadow-sm font-bold text-muted-foreground hover:bg-muted rounded-lg"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to List
            </Button>
          )}
          {id && (
            <Button
              type="button"
              onClick={generatePDF}
              className="font-bold h-10 px-5 rounded-full shadow-sm flex items-center gap-2 text-sm transition-all border-primary/25 text-primary/90 bg-primary/10 hover:bg-primary/15 active:scale-[0.98]"
              variant="outline"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {id ? "Edit Stock Adjustment Posting" : "New Stock Adjustment"}
          </h1>
          {id && (
            <Badge
              variant="outline"
              className={`px-3 py-1 font-bold shadow-sm ${isPosted
                ? 'bg-blue-50 dark:bg-blue-900/20 text-primary/90 dark:blue-400 border-primary/20 dark:border-blue-800/50 uppercase tracking-wider'
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
            <div className="flex items-center gap-2 bg-primary/5 dark:bg-blue-900/10 px-3 py-1.5 rounded-lg border border-primary/30 dark:border-blue-800/30">
              <span className="text-[10px] uppercase font-black text-primary/70">Posted At:</span>
              <span className="text-xs font-bold text-primary/90 dark:text-blue-300">
                {form.getValues().postedAt ? format(new Date(form.getValues().postedAt as string), "MMMM d, yyyy, hh:mm a") : "-"}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-primary/5 dark:bg-blue-900/10 px-3 py-1.5 rounded-lg border border-primary/30 dark:border-blue-800/30">
              <span className="text-[10px] uppercase font-black text-primary/70">Posted By:</span>
              <span className="text-xs font-bold text-primary/90 dark:text-blue-300">
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
                <Label htmlFor="doc_no" className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider font-sans px-0.5">
                  {unpostedList ? "Review Document" : "Document Number"}
                </Label>
                {unpostedList && onSelectId ? (
                  <Combobox
                    value={id ? String(id) : ""}
                    onValueChange={(v: string | null) => {
                      if (v) {
                        onSelectId(Number(v));
                        const selectedDoc = unpostedList.find(item => String(item.id) === v);
                        if (selectedDoc) setDocSearch(selectedDoc.doc_no);
                      }
                    }}
                    inputValue={docSearch}
                    onInputValueChange={(v: string) => {
                      setDocSearch(v);
                    }}
                  >
                    <ComboboxInput
                      placeholder="Select Document"
                      className="text-xs h-11 border-input font-bold"
                      showTrigger={true}
                    />
                    <ComboboxContent>
                      <ComboboxList>
                        {(() => {
                          const filtered = unpostedList.filter(item =>
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
                    disabled={isReadOnly || !!id || fields.length > 0}
                    className={form.formState.errors.branch_id ? "border-red-500 bg-red-50 dark:bg-red-900/10" : ""}
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
                    disabled={isReadOnly || !!id || fields.length > 0}
                    className={form.formState.errors.supplier_id ? "border-red-500 bg-red-50 dark:bg-red-900/10" : ""}
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
                disabled={isReadOnly || !!id}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="IN"
                    id="type-in"
                    className="border-primary text-primary h-4 w-4"
                  />
                  <Label htmlFor="type-in" className="text-sm font-bold text-foreground/80">
                    Stock In
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="OUT"
                    id="type-out"
                    className="border-input text-primary h-4 w-4"
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
                className="min-h-[120px] bg-background border-input focus:ring-primary rounded-xl p-4 text-sm"
                disabled={isReadOnly}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm bg-card">
          <CardHeader className="bg-card border-b border-border py-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                  className="pl-9 h-9 text-sm border-input"
                />
              </div>
              <Button
                type="button"
                onClick={generatePDF}
                className="font-bold h-9 px-4 rounded-full shadow-sm flex items-center gap-2 text-sm transition-all border-primary/20 text-primary/90 bg-primary/10 hover:bg-primary/20"
                variant="outline"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              {!isReadOnly && (
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  disabled={!watchedSupplierIdForSelect}
                  className="font-bold h-9 px-4 rounded-full shadow-sm flex items-center gap-2 text-sm transition-all border-primary/20 text-primary/90 bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:border-primary/40 shrink-0"
                  variant="outline"
                >
                  <Plus className="h-4 w-4" />
                  ADD MORE PRODUCTS
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isFormLoading ? (
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
                <p className="text-muted-foreground font-medium max-w-xs mx-auto text-sm">
                  {watchedSupplierIdForSelect
                    ? "Click \"ADD MORE PRODUCTS\" to browse and add items."
                    : "Select a supplier first to browse and add products."}
                </p>
                {form.formState.errors.items && form.formState.errors.items.message && (
                  <p className="text-sm text-red-500 font-bold mt-4">
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
                      <th className="p-3">UOM</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Total Amount</th>
                      <th className="p-3 w-32 text-center">Quantity</th>
                      <th className="p-3 text-center w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFields.length === 0 && tableSearch ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">
                          No products found matching &quot;{tableSearch}&quot;.
                        </td>
                      </tr>
                    ) : (
                      paginatedFields.map(({ field, index }) => (
                        <ProductTableRow
                          key={field.id}
                          index={index}
                          control={form.control}
                          onRemove={(idx) => setDeletingIndex(idx)}
                          setValue={form.setValue}
                          isReadOnly={isReadOnly}
                        />
                      ))
                    )}
                  </tbody>
                </table>
                <div className="p-4 bg-muted/10 border-t border-border/50 text-sm font-medium text-muted-foreground flex justify-between items-center">
                  <span>{filteredFields.length} total rows</span>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">Rows per page</span>
                      <select
                        className="h-8 border border-border rounded-md bg-card px-2 text-xs focus:outline-none"
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

        {/* Attachments Card */}
        <Card className="border border-border/50 shadow-sm bg-card">
          <CardHeader className="bg-card border-b border-border/50 py-4 px-6">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-primary" />
              Attachments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <AttachmentUpload
              value={form.watch("stock_adjustment_attachment") || []}
              onChange={(atts) => form.setValue("stock_adjustment_attachment", atts, { shouldValidate: true })}
              disabled={isReadOnly}
            />
            {form.formState.errors.stock_adjustment_attachment?.message && (
              <p className="text-xs text-red-500 font-bold mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                {String(form.formState.errors.stock_adjustment_attachment.message)}
              </p>
            )}
          </CardContent>
        </Card>

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
          initialSelectedItems={form.getValues("items")}
          onConfirm={handleConfirmModalItems}
        />

        <div className="flex items-center justify-end gap-3 pb-8">
          {id && !isPosted && (
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

          {id && !isPosted && (
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
              <Send className="h-5 w-5 text-primary" />
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
              className="flex-1 h-11 font-bold bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 dark:shadow-none rounded-lg"
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
            <AlertDialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Confirm Delete Adjustment
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground py-4">
              Are you sure you want to delete this stock adjustment transaction? This action will permanently remove it from the system.
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirmation(false)}
              className="flex-1 h-11 font-bold text-muted-foreground border-border hover:bg-muted rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="flex-1 h-11 font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-100 dark:shadow-none rounded-lg"
            >
              Confirm and Delete
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
    </div>
  );
}

