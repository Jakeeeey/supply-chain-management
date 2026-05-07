"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Loader2,
  Plus,
  Trash2,
  Printer,
  Save,
  AlertTriangle,
  CheckCircle,
  Link as LinkIcon,
  FileText,
  Search,
  ChevronDown,
  ScanLine,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";

import { SalesReturnProvider } from "../providers/fetchProviders";
import {
  SalesReturn,
  SalesReturnItem,
  SalesReturnStatusCard,
  InvoiceOption,
  API_LineDiscount,
  API_SalesReturnType,
} from "../type";
import { ProductLookupModal } from "./ProductLookupModal";
import { SalesReturnPrintSlip } from "./SalesReturnPrintSlip";
import { createRoot } from "react-dom/client";
import { useRfidScanner } from "../hooks/useRfidScanner";
import { useSearchParams } from "next/navigation";

interface SalesReturnGroup {
  key: string;
  code: string;
  description: string;
  unit: string;
  returnType: string;
  unitPrice: number;
  totalQty: number;
  totalGross: number;
  totalDiscount: number;
  totalNet: number;
  children: { item: SalesReturnItem; idx: number }[];
}

interface Props {
  returnId: number;
  initialData: SalesReturn;
  onClose: () => void;
  onSuccess: () => void;
}

// 🟢 LOCAL SEARCHABLE SELECT TO FIX SCROLL ISSUES IN DIALOG
const LocalSearchableSelect = ({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  className,
  disabled = false,
}: {
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((opt) => opt.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}
          disabled={disabled}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandList className="max-h-[200px] overflow-y-auto">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onValueChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === opt.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const ReadOnlyField = ({
  label,
  value,
  isLoading = false,
  className = "",
}: {
  label: string;
  value: string | number | undefined;
  isLoading?: boolean;
  className?: string;
}) => (
  <div className={cn("space-y-1", className)} title={String(value || "-")}>
    <Label className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground w-full truncate block">
      {label}
    </Label>
    <div className="w-full h-9 px-3 flex items-center bg-muted/20 border border-border rounded-md text-sm font-medium text-foreground shadow-sm truncate">
      {isLoading ? (
        <Skeleton className="h-4 w-3/4" />
      ) : (
        <span className="truncate">{value || "-"}</span>
      )}
    </div>
  </div>
);

export function UpdateSalesReturnModal({
  returnId,
  initialData,
  onClose,
  onSuccess,
}: Props) {
  const searchParams = useSearchParams();
  const prefillRemarks = searchParams.get("prefillRemarks");
  const prefillInvoiceNo = searchParams.get("prefillInvoiceNo");
  const prefillOrderNo = searchParams.get("prefillOrderNo");

  // --- STATE ---
  const [headerData, setHeaderData] = useState<SalesReturn>(initialData);

  // 🟢 Effect to pre-fill remarks from Clearance if redirected
  useEffect(() => {
    if (prefillRemarks) {
      setHeaderData((prev) => {
        const currentRemarks = prev?.remarks || "";
        if (currentRemarks.includes(prefillRemarks)) return prev;
        return {
          ...prev,
          remarks: currentRemarks
            ? `${currentRemarks}\n\n[From Clearance]: ${prefillRemarks}`
            : prefillRemarks,
        };
      });
      
      // Clean up URL to prevent re-applying on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('prefillRemarks');
      window.history.replaceState({}, '', url.toString());
    }
  }, [prefillRemarks]);
  const [details, setDetails] = useState<SalesReturnItem[]>([]);
  const [statusCardData, setStatusCardData] =
    useState<SalesReturnStatusCard | null>(null);
  const [loading, setLoading] = useState(true);

  // 🟢 Track the ID for the junction table link
  const [appliedInvoiceId, setAppliedInvoiceId] = useState<number | null>(null);

  const [discountOptions, setDiscountOptions] = useState<API_LineDiscount[]>(
    [],
  );
  const [returnTypeOptions, setReturnTypeOptions] = useState<
    API_SalesReturnType[]
  >([]);
  const [salesmenOptions, setSalesmenOptions] = useState<{ value: string; label: string; code: string; branch: string }[]>([]);
  const [customerOptions, setCustomerOptions] = useState<{ value: string; label: string }[]>([]);

  const [isProductLookupOpen, setIsProductLookupOpen] = useState(false);
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);
  const [isUpdateSuccessOpen, setIsUpdateSuccessOpen] = useState(false);
  const [isReceiveConfirmOpen, setIsReceiveConfirmOpen] = useState(false);
  const [isInvoiceLookupOpen, setIsInvoiceLookupOpen] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [returnTypeError, setReturnTypeError] = useState(false);
  const [orderError, setOrderError] = useState(false);
  const [invoiceError, setInvoiceError] = useState(false);

  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceOption[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState("");

  // Order/Invoice Dropdown State
  const [isOrderDropdownOpen, setIsOrderDropdownOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const orderDropdownRef = useRef<HTMLDivElement>(null);
  const [isInvoiceDropdownOpen, setIsInvoiceDropdownOpen] = useState(false);
  const [invoiceDropdownSearch, setInvoiceDropdownSearch] = useState("");
  const invoiceDropdownRef = useRef<HTMLDivElement>(null);

  // RFID State
  const [rfidScanning, setRfidScanning] = useState(false);
  const [lastScannedRfid, setLastScannedRfid] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});



  // 🟢 REVISED: Edit Permissions Logic
  const isPending = headerData.status === "Pending";
  const isReceived = headerData.status === "Received";

  // Rule 1: Everything is editable if Pending
  // Rule 2: Only Remarks and Applied To are editable if Received
  const canEditAll = isPending;
  const canEditLimited = isPending || isReceived;

  // --- INITIAL LOAD ---
  useEffect(() => {
    const loadFullDetails = async () => {
      setLoading(true);
      try {
        const [
          items,
          statusData,
          discounts,
          retTypes,
          salesmen,
          customers,
        ] = await Promise.all([
          SalesReturnProvider.getProductsSummary(returnId, headerData.returnNo),
          SalesReturnProvider.getStatusCardData(returnId),
          SalesReturnProvider.getLineDiscounts(),
          SalesReturnProvider.getSalesReturnTypes(),
          SalesReturnProvider.getSalesmenList(),
          SalesReturnProvider.getCustomersList(),
        ]);

        setDetails(items);
        setStatusCardData(statusData);
        setDiscountOptions(discounts);
        setReturnTypeOptions(retTypes);
        setSalesmenOptions(salesmen);
        setCustomerOptions(customers);

        // Fetch invoices filtered by salesman and customer
        try {
          const invoices = await SalesReturnProvider.getInvoiceReturnList(
            headerData.salesmanId?.toString(),
            headerData.customerCode,
          );
          setInvoiceOptions(invoices);
        } catch {
          setInvoiceOptions([]);
        }
      } catch (err) {
        console.error("Failed to load details", err);
      } finally {
        setLoading(false);
      }
    };

    if (returnId) {
      loadFullDetails();
    }
  }, [returnId, headerData.returnNo, headerData.customerCode, headerData.salesmanId]);

  // 🟢 NEW: Effect to automatically update prices when Price Type changes
  useEffect(() => {
    if (details.length > 0) {
      setDetails((prevDetails) =>
        prevDetails.map((item) => {
          const key = `price${headerData.priceType}` as string;
          const basePrice = Number(item[key as keyof SalesReturnItem]) || Number(item.priceA) || Number(item.unitPrice) || 0;
          
          const newUnitPrice = basePrice;
          
          const newGross = Math.round(Number(item.quantity) * newUnitPrice * 100) / 100;
          let newDiscountAmt = 0;

          if (item.discountType && item.discountType !== "No Discount") {
            const selectedOption = discountOptions.find(
              (d) => d.id.toString() === item.discountType?.toString(),
            );
            if (selectedOption) {
              const percentage = parseFloat(selectedOption.total_percent) || 0;
              newDiscountAmt = Math.round(newGross * (percentage / 100) * 100) / 100;
            }
          }

          return {
            ...item,
            unitPrice: newUnitPrice,
            grossAmount: newGross,
            discountAmount: newDiscountAmt,
            totalAmount: Math.round((newGross - newDiscountAmt) * 100) / 100,
          };
        })
      );
    }
  }, [headerData.priceType, discountOptions, details.length]);

  // Click outside handler for order/invoice dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (orderDropdownRef.current && !orderDropdownRef.current.contains(target)) {
        setIsOrderDropdownOpen(false);
      }
      if (invoiceDropdownRef.current && !invoiceDropdownRef.current.contains(target)) {
        setIsInvoiceDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle pre-fill from Dispatch Clearance
  useEffect(() => {
    if (canEditAll && (prefillInvoiceNo || prefillOrderNo)) {
      setHeaderData(prev => ({
        ...prev,
        invoiceNo: prefillInvoiceNo || prev.invoiceNo,
        orderNo: prefillOrderNo || prev.orderNo
      }));
      if (prefillInvoiceNo) setInvoiceDropdownSearch(prefillInvoiceNo);
      if (prefillOrderNo) setOrderSearch(prefillOrderNo);
    }
  }, [canEditAll, prefillInvoiceNo, prefillOrderNo]);

  // RFID Scanner Ref
  const rfidInputRef = useRef<HTMLInputElement>(null);

  /**
   * RFID Scan Handler — looks up the product and auto-adds to details table.
   */
  const handleRfidScan = async (tag: string) => {
    if (!tag.trim()) return;
    if (!canEditAll) {
      toast.error("Cannot add items when status is not Pending.");
      return;
    }

    // Resolve branch from the salesman
    const salesmanOpt = salesmenOptions.find(
      (s) => String(s.value) === String(headerData.salesmanId),
    );
    // Try to extract branchId from salesmanOpt
    // The salesmenOptions have { value, label, code, branch } where branch is the branch name
    // We need a numeric branchId. The headerData doesn't store branchId directly.
    // We'll get it from the salesman's branch relationship via the form references.
    let branchId: number | null = null;
    try {
      const formSalesmen = await SalesReturnProvider.getFormSalesmen();
      const formSalesman = formSalesmen.find(
        (s) => String(s.id) === String(headerData.salesmanId),
      );
      branchId = formSalesman?.branchId || null;
    } catch {
      // fallback: can't resolve branch
    }

    if (!branchId) {
      toast.error("Cannot determine branch for RFID lookup.");
      return;
    }

    // Check for duplicate RFID already in details
    if (details.some((item) => item.rfidTags?.includes(tag))) {
      toast.error(`RFID tag "${tag}" is already in the list.`);
      return;
    }

    setRfidScanning(true);
    setLastScannedRfid(tag);

    try {
      // 🟢 NEW: Global Duplicate Check
      const dupCheck = await SalesReturnProvider.checkRfidDuplicate(tag);
      if (dupCheck.isDuplicate && dupCheck.returnNo !== headerData.returnNo) {
        const errorMsg = `RFID tag "${tag}" is already linked to SR #${dupCheck.returnNo}.`;
        toast.error(errorMsg, {
          description: "This tag cannot be returned again as it exists in another record.",
          duration: 6000,
        });
        return;
      }

      const result = await SalesReturnProvider.lookupRfid(tag, branchId);

      if (!result || !result.productId) {
        const branchName = salesmanOpt?.branch || "this branch";
        const errorMsg = `RFID tag "${tag}" is NOT registered to ${branchName}.`;
        toast.error(errorMsg, {
          description: "Please check if the scan is correct or if the item is in the wrong location.",
          duration: 5000,
        });
        return;
      }

      const currentPriceType = headerData.priceType || "A";
      const priceKey = `price${currentPriceType}` as string;
      const resultRecord = result as Record<string, unknown>;
      const unitPrice =
        Math.round((Number(resultRecord[priceKey]) ||
        Number(resultRecord.unitPrice) ||
        0) * 100) / 100;
      const grossAmount = Math.round(unitPrice * 1 * 100) / 100;

      const newItem: SalesReturnItem = {
        id: `added-rfid-${tag}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        tempId: `rfid-${tag}`,
        productId: result.productId,
        product_id: result.productId,
        code: result.productCode,
        description: result.productName,
        unit: result.unitShortcut,
        quantity: 1,
        unitPrice,
        grossAmount,
        discountType: "",
        discountAmount: 0,
        totalAmount: grossAmount,
        reason: "",
        returnType: "",
        rfidTags: [tag],
        priceA: result.priceA,
        priceB: result.priceB,
        priceC: result.priceC,
        priceD: result.priceD,
        priceE: result.priceE,
        unitMultiplier: result.unitMultiplier || 1,
      };

      setDetails((prev) => [...prev, newItem]);
      toast.success(`Successfully scanned: ${result.productName}`, {
        description: `RFID: ${tag} | Registered to ${salesmanOpt?.branch || "branch"}`,
      });

      // Auto-clear display after 2 seconds
      setTimeout(() => setLastScannedRfid(""), 2000);
    } catch (err: unknown) {
      console.error("RFID lookup error:", err);
      const error = err as Error;
      const errorMsg = `Failed to look up RFID tag "${tag}".`;
      toast.error(errorMsg, {
        description: error.message || "An unexpected error occurred during scan.",
      });
    } finally {
      setRfidScanning(false);
    }
  };

  // Global RFID Scanner
  useRfidScanner({
    onScan: (tag) => handleRfidScan(tag),
    enabled: canEditAll,
  });

  // --- HELPERS ---
  const getSalesmanName = (id: string | number) =>
    salesmenOptions.find((opt) => String(opt.value) === String(id))?.label ||
    String(id) ||
    "-";
  const getSalesmanCode = (id: string | number) => {
    const found = salesmenOptions.find(
      (opt) => String(opt.value) === String(id),
    );
    return found ? found.code || found.value : String(id) || "-";
  };
  const getSalesmanBranch = (id: string | number) =>
    salesmenOptions.find((opt) => String(opt.value) === String(id))?.branch ||
    "N/A";
  const getCustomerName = (code: string | number) =>
    customerOptions.find((opt) => String(opt.value) === String(code))?.label ||
    String(code) ||
    "-";

  // --- HANDLERS: EDIT TABLE ---
  const handleDetailChange = (index: number, field: keyof SalesReturnItem, value: string | number | null) => {
    setDetails((prev) => {
      const newDetails = [...prev];
      const item = { ...newDetails[index], [field]: value };

      if (field === "discountType") {
        if (value === "No Discount" || !value) {
          item.discountAmount = 0;
        } else {
          const selectedDisc = discountOptions.find(
            (d) => d.id.toString() === value,
          );
          if (selectedDisc) {
            const percentage = parseFloat(selectedDisc.total_percent);
            const gross =
              Math.round(Number(item.quantity || 0) * Number(item.unitPrice || 0) * 100) / 100;
            item.discountAmount = Math.round(gross * (percentage / 100) * 100) / 100;
          }
        }
      }

      const qty = Number(item.quantity || 0);
      const price = Number(item.unitPrice || 0);
      const gross = Math.round(qty * price * 100) / 100;
      const disc = Number(item.discountAmount || 0);

      item.grossAmount = gross;
      item.totalAmount = Math.round((gross - disc) * 100) / 100;

      newDetails[index] = item;
      return newDetails;
    });
  };

  const handleDeleteRow = (index: number) => {
    setDetails((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmProductLookup = (newItems: SalesReturnItem[]) => {
    setDetails((prev) => {
      const updated = [...prev];
      newItems.forEach((item) => {
        // Find if already exists in details (by productId and unit)
        const existingIdx = updated.findIndex(
          (d) => d.product_id === item.productId && d.unit === item.unit
        );
        if (existingIdx !== -1) {
          // Increment quantity
          const existing = updated[existingIdx];
          const newQty = (Number(existing.quantity) || 0) + (Number(item.quantity) || 0);
          const newGross = Math.round(newQty * Number(existing.unitPrice || 0) * 100) / 100;
          updated[existingIdx] = {
            ...existing,
            quantity: newQty,
            grossAmount: newGross,
            totalAmount: Math.round((newGross - (Number(existing.discountAmount) || 0)) * 100) / 100,
          };
        } else {
          // Add as new row
          updated.push({
            ...item,
            id: `added-${Date.now()}-${Math.random()}`, // Temp ID for new rows
            product_id: item.productId,
            unitPrice: Math.round(Number(item.unitPrice || 0) * 100) / 100,
            grossAmount: Math.round(Number(item.grossAmount || 0) * 100) / 100,
            discountAmount: Math.round(Number(item.discountAmount || 0) * 100) / 100,
            totalAmount: Math.round(Number(item.totalAmount || 0) * 100) / 100,
          });
        }
      });
      return updated;
    });
    setIsProductLookupOpen(false);
  };

  // --- HANDLERS: UPDATE ---
  const handleUpdateClick = () => {
    setReturnTypeError(false);
    setOrderError(false);
    setInvoiceError(false);
    
    if (!headerData.orderNo || !headerData.orderNo.toString().trim()) {
      toast.error("Order No. is required.");
      setOrderError(true);
      return;
    }

    if (!headerData.invoiceNo || !headerData.invoiceNo.toString().trim()) {
      toast.error("Invoice No. is required.");
      setInvoiceError(true);
      return;
    }

    const hasIncompleteItems = details.some(
      (item) => !item.returnType || item.returnType === "",
    );
    if (hasIncompleteItems) {
      toast.error("Please select a 'Return Type' for all items.");
      setReturnTypeError(true);
      return;
    }
    setIsUpdateConfirmOpen(true);
  };

  const handleReceiveClick = () => {
    setReturnTypeError(false);
    setOrderError(false);
    setInvoiceError(false);
    
    if (!headerData.orderNo || !headerData.orderNo.toString().trim()) {
      toast.error("Order No. is required.");
      setOrderError(true);
      return;
    }

    if (!headerData.invoiceNo || !headerData.invoiceNo.toString().trim()) {
      toast.error("Invoice No. is required.");
      setInvoiceError(true);
      return;
    }

    const hasIncompleteItems = details.some(
      (item) => !item.returnType || item.returnType === "",
    );
    if (hasIncompleteItems) {
      toast.error("Please select a 'Return Type' for all items.");
      setReturnTypeError(true);
      return;
    }
    setIsReceiveConfirmOpen(true);
  };

  const handleConfirmUpdate = async () => {
    try {
      setIsUpdating(true);
      const payload = {
        returnId: headerData.id,
        returnNo: headerData.returnNo,
        items: details,
        remarks: headerData.remarks || "",
        invoiceNo: headerData.invoiceNo,
        orderNo: headerData.orderNo,
        appliedInvoiceId: appliedInvoiceId ?? undefined,
        isThirdParty: headerData.isThirdParty,
      };

      await SalesReturnProvider.updateReturn(payload);
      setIsUpdateConfirmOpen(false);
      setIsUpdateSuccessOpen(true);
    } catch (error) {
      console.error("Update failed", error);
      alert("Failed to update sales return.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmReceive = async () => {
    try {
      setIsReceiving(true);
      // Auto-save changes before marking as Received
      const savePayload = {
        returnId: headerData.id,
        returnNo: headerData.returnNo,
        items: details,
        remarks: headerData.remarks || "",
        invoiceNo: headerData.invoiceNo,
        orderNo: headerData.orderNo,
        appliedInvoiceId: appliedInvoiceId ?? undefined,
        isThirdParty: headerData.isThirdParty,
      };
      await SalesReturnProvider.updateReturn(savePayload);
      // Then update status with extra fields
      const now = new Date().toISOString();
      await SalesReturnProvider.updateStatus(headerData.id, "Received", true, now);
      setHeaderData({ ...headerData, status: "Received", isReceived: true, receivedAt: now });
      setStatusCardData((prev) =>
        prev
          ? { ...prev, isReceived: true, transactionStatus: "Received" }
          : null,
      );
      setIsReceiveConfirmOpen(false);
      setIsUpdateSuccessOpen(true);
    } catch (error) {
      console.error("Receive failed", error);
      toast.error("Failed to receive sales return.");
    } finally {
      setIsReceiving(false);
    }
  };

  const handlePrintInNewTab = () => {
    const printData = {
      returnNo: headerData.returnNo,
      returnDate: headerData.returnDate,
      status: headerData.status,
      remarks: headerData.remarks,
      salesmanName: getSalesmanName(headerData.salesmanId),
      salesmanCode: getSalesmanCode(headerData.salesmanId),
      customerName: getCustomerName(headerData.customerCode),
      customerCode: headerData.customerCode,
      branchName: getSalesmanBranch(headerData.salesmanId),
      items: details,
      totalAmount: details.reduce(
        (acc, item) => acc + (item.totalAmount || 0),
        0,
      ),
    };

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Pop-up blocked.");
      return;
    }

    printWindow.document.write(
      "<html><head><title>Print Preview</title></head><body><div id='print-root'></div></body></html>",
    );
    document
      .querySelectorAll('link[rel="stylesheet"], style')
      .forEach((node) => {
        printWindow.document.head.appendChild(node.cloneNode(true));
      });
    const styleOverride = printWindow.document.createElement("style");
    styleOverride.innerHTML = `
      body { background-color: #e5e7eb; padding: 40px; display: flex; justify-content: center; }
      #print-root { background-color: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
      .hidden { display: block !important; }
    `;
    printWindow.document.head.appendChild(styleOverride);
    const root = createRoot(printWindow.document.getElementById("print-root")!);
    root.render(<SalesReturnPrintSlip data={printData} />);
    printWindow.setTimeout(() => {
      printWindow.print();
    }, 1000);
  };

  // --- RENDER ---
  const totalGross = Math.round(details.reduce(
    (acc, i) => acc + (Number(i.grossAmount) || 0),
    0,
  ) * 100) / 100;
  const totalDiscount = Math.round(details.reduce(
    (acc, i) => acc + (Number(i.discountAmount) || 0),
    0,
  ) * 100) / 100;
  const totalNet = Math.round(details.reduce(
    (acc, i) => acc + (Number(i.totalAmount) || 0),
    0,
  ) * 100) / 100;
  const filteredInvoices = invoiceOptions.filter((inv) =>
    inv.invoice_no.toLowerCase().includes(invoiceSearch.toLowerCase()),
  );

  const filteredOrderDropdown = invoiceOptions.filter((inv) =>
    inv.order_id.toLowerCase().includes(orderSearch.toLowerCase()),
  );
  const filteredInvoiceDropdown = invoiceOptions.filter((inv) =>
    inv.invoice_no.toLowerCase().includes(invoiceDropdownSearch.toLowerCase()),
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[95vw] lg:max-w-7xl h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-0 shadow-2xl rounded-xl [&>button]:hidden">
        {/* HEADER */}
        <div className="px-8 py-5 border-b border-border flex justify-between items-center bg-background shrink-0">
          <div>
            <DialogTitle className="text-2xl font-bold text-foreground">
              {isPending ? "Edit Sales Return" : "Return Details"}
            </DialogTitle>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-bold uppercase tracking-wider">
                {headerData.returnNo}
              </span>
              <span className="text-muted-foreground text-sm">|</span>
              <span className="text-sm text-muted-foreground">
                {headerData.returnDate}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-destructive hover:bg-destructive text-white p-2 rounded-md shadow-sm transition-all active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-muted/50">
          {/* METADATA */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4 bg-background p-5 rounded-xl border border-border shadow-sm relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-xl"></div>

            <ReadOnlyField label="Salesman" value={getSalesmanName(headerData.salesmanId)} isLoading={loading} />
            <ReadOnlyField label="Salesman Code" value={getSalesmanCode(headerData.salesmanId)} isLoading={loading} />
            <ReadOnlyField label="Customer" value={getCustomerName(headerData.customerCode)} isLoading={loading} />
            <ReadOnlyField label="Customer Code" value={headerData.customerCode} />

            <ReadOnlyField label="Branch" value={getSalesmanBranch(headerData.salesmanId)} isLoading={loading} />
            <ReadOnlyField label="Return Date" value={headerData.returnDate} />
            <ReadOnlyField label="Received Date" value={headerData.createdAt} />
            <ReadOnlyField label="Price Type" value={headerData.priceType} />
            
            <div className="flex items-center space-x-2 pt-2 col-span-2 lg:col-span-4">
              <Checkbox
                id="isThirdParty"
                checked={headerData.isThirdParty || false}
                disabled={!canEditAll}
                onCheckedChange={(checked) =>
                  setHeaderData({
                    ...headerData,
                    isThirdParty: checked as boolean,
                  })
                }
              />
              <Label
                htmlFor="isThirdParty"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Third Party Transaction
              </Label>
            </div>
          </div>

          {/* PRODUCT TABLE */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span className="h-5 w-1 bg-primary rounded-full"></span>
                Products Summary
              </h3>
              {/* 🟢 REVISED: Add Button hidden if not Pending */}
              {canEditAll && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                      {/* Hidden input captures scanner keyboard wedge input */}
                      <input
                        ref={rfidInputRef}
                        type="text"
                        className="absolute inset-0 opacity-0 cursor-default"
                        tabIndex={-1}
                        autoComplete="off"
                        disabled={!canEditAll || rfidScanning}
                      />
                      {/* Visible read-only display */}
                      <div
                        className={cn(
                          "pl-9 pr-3 h-9 w-52 text-xs border border-border rounded-md font-mono flex items-center cursor-pointer select-none transition-all",
                          rfidScanning
                            ? "bg-primary/10 text-primary animate-pulse"
                            : lastScannedRfid
                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300"
                              : canEditAll
                                ? "bg-muted/30 text-muted-foreground hover:border-primary/30"
                                : "bg-muted/50 text-muted-foreground/60"
                        )}
                        onClick={() => canEditAll && rfidInputRef.current?.focus()}
                      >
                        {rfidScanning
                          ? "Looking up..."
                          : lastScannedRfid
                            ? `✓ ${lastScannedRfid.slice(0, 16)}...`
                            : details.filter((i) => i.rfidTags && i.rfidTags.length > 0)
                                .length > 0
                              ? `${details.filter((i) => i.rfidTags && i.rfidTags.length > 0).length} RFID items`
                              : "Scan RFID..."}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setIsProductLookupOpen(true)}
                    className="bg-primary hover:bg-primary text-white shadow-primary/20 shadow-md h-9 gap-2"
                  >
                    <Plus className="h-4 w-4" /> Add Product
                  </Button>
                </div>
              )}
            </div>

            <div className="border border-border rounded-xl overflow-hidden bg-background shadow-sm">
              <div className="overflow-x-auto pb-4">
                <Table className="min-w-[1500px]">
                  <TableHeader>
                    <TableRow className="bg-primary hover:bg-primary! border-none">
                      <TableHead className="text-white font-semibold h-11 w-[120px] uppercase text-xs">
                        Code
                      </TableHead>
                      <TableHead className="text-white font-semibold h-11 min-w-[180px] uppercase text-xs">
                        Description
                      </TableHead>
                      <TableHead className="text-white font-semibold h-11 w-[80px] uppercase text-xs">
                        Unit
                      </TableHead>
                      <TableHead className="text-white font-semibold h-11 text-center w-[150px] uppercase text-xs">
                        Qty
                      </TableHead>
                      <TableHead className="text-white font-semibold h-11 text-right min-w-[100px] uppercase text-xs">
                        Price
                      </TableHead>
                      <TableHead className="text-white font-semibold h-11 text-right min-w-[120px] uppercase text-xs">
                        Gross
                      </TableHead>
                      <TableHead className="text-white font-semibold h-11 w-[160px] uppercase text-xs">
                        Disc. Type
                      </TableHead>
                      <TableHead className="text-white font-semibold h-11 text-right min-w-[120px] uppercase text-xs">
                        Disc. Amt
                      </TableHead>
                      <TableHead className="text-white font-semibold h-11 text-right min-w-[120px] uppercase text-xs">
                        Total
                      </TableHead>
                      <TableHead className="text-white font-semibold h-11 min-w-[180px] uppercase text-xs">
                        Reason
                      </TableHead>
                      <TableHead className="text-white font-semibold h-11 w-[200px] uppercase text-xs">
                        Return Type
                      </TableHead>
                      {/* 🟢 REVISED: Delete Column hidden if not Pending */}
                      {canEditAll && (
                        <TableHead className="text-white font-semibold h-11 w-[50px]"></TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, rowIndex) => (
                        <TableRow key={`skeleton-row-${rowIndex}`} className="border-b border-border">
                          <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[40px] mx-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-[100px]" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-[80px] ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-[120px]" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-[100px]" /></TableCell>
                          {canEditAll && <TableCell><Skeleton className="h-8 w-8 rounded-md mx-auto" /></TableCell>}
                        </TableRow>
                      ))
                    ) : details.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={12}
                          className="h-24 text-center text-muted-foreground text-sm"
                        >
                          No products found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {/* 1. RENDER MANUAL ITEMS (No RFID) */}
                        {details.map((item, idx) => {
                          const isManual = !item.rfidTags || item.rfidTags.length === 0;
                          if (!isManual) return null;
                          return (
                            <TableRow
                              key={item.id || idx}
                              className="border-b border-border hover:bg-muted/20 transition-colors duration-200"
                            >
                              <TableCell className="text-sm text-foreground font-bold align-middle font-mono">
                                {item.code}
                              </TableCell>
                              <TableCell className="align-middle">
                                <div
                                  className="text-sm text-foreground font-medium"
                                  title={item.description}
                                >
                                  {item.description}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                  {/* Just label, RFID tag moved to sub-row or tooltip if needed, but original had no extra div here */}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground align-middle">
                                <Badge
                                  variant="outline"
                                  className="text-foreground bg-background border-border font-normal"
                                >
                                  {item.unit}
                                </Badge>
                              </TableCell>
                              {/* Quantity */}
                              <TableCell className="text-center align-middle p-2">
                                {canEditAll ? (
                                  <Input
                                    type="number"
                                    className="h-9 w-full text-center text-sm border-border px-2"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      handleDetailChange(idx, "quantity", e.target.value)
                                    }
                                  />
                                ) : (
                                  <span className="text-sm font-semibold text-foreground">
                                    {item.quantity}
                                  </span>
                                )}
                              </TableCell>
                              {/* Price */}
                              <TableCell className="text-right align-middle p-2">
                                {canEditAll ? (
                                  <Input
                                    type="number"
                                    className="h-9 w-full text-right text-sm border-border px-2"
                                    value={item.unitPrice}
                                    onChange={(e) =>
                                      handleDetailChange(idx, "unitPrice", e.target.value)
                                    }
                                  />
                                ) : (
                                  <span className="text-sm text-foreground">
                                    {Number(item.unitPrice).toLocaleString()}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground align-middle font-mono whitespace-nowrap">
                                {(Number(item.grossAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </TableCell>
                              {/* Discount */}
                              <TableCell className="align-middle p-2">
                                {canEditAll ? (
                                  <Select
                                    value={item.discountType?.toString() || "No Discount"}
                                    onValueChange={(val) => handleDetailChange(idx, "discountType", val)}
                                  >
                                    <SelectTrigger className="h-9 w-full text-xs border-border bg-background">
                                      <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="No Discount">None</SelectItem>
                                      {discountOptions.map((opt) => (
                                        <SelectItem key={opt.id} value={opt.id.toString()}>
                                          {opt.discount_type}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    {discountOptions.find((d) => d.id.toString() == item.discountType)?.discount_type || "None"}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right align-middle p-2">
                                <Input type="number" readOnly className="h-9 w-full text-right text-sm bg-muted/30 text-muted-foreground cursor-not-allowed" value={item.discountAmount ? Number(item.discountAmount).toFixed(2) : ""} />
                              </TableCell>
                              <TableCell className="text-right font-bold text-sm text-foreground align-middle whitespace-nowrap">
                                ₱{(Number(item.totalAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </TableCell>
                              {/* Reason */}
                              <TableCell className="align-middle p-2">
                                {canEditAll ? (
                                  <Input
                                    className="h-9 w-full text-sm border-border bg-background"
                                    placeholder="Enter reason..."
                                    value={item.reason}
                                    onChange={(e) => handleDetailChange(idx, "reason", e.target.value)}
                                  />
                                ) : (
                                  <span className="text-sm text-muted-foreground italic truncate block max-w-[120px]" title={item.reason || ""}>
                                    {item.reason || "-"}
                                  </span>
                                )}
                              </TableCell>
                              {/* Return Type */}
                              <TableCell className="align-middle p-2">
                                {canEditAll ? (
                                  <LocalSearchableSelect
                                    value={item.returnType || ""}
                                    onValueChange={(val) => {
                                      handleDetailChange(idx, "returnType", val);
                                      setReturnTypeError(false);
                                    }}
                                    options={returnTypeOptions.length > 0 
                                      ? returnTypeOptions.map((type) => ({ value: type.type_name, label: type.type_name }))
                                      : [
                                          { value: "Good Order", label: "Good Order" },
                                          { value: "Bad Order", label: "Bad Order" }
                                        ]
                                    }
                                    placeholder="Select type"
                                    className={cn(
                                      "h-9 text-xs",
                                      returnTypeError && (!item.returnType || item.returnType === "") && "border-destructive ring-1 ring-destructive/30 bg-destructive/5 text-destructive"
                                    )}
                                  />
                                ) : (
                                  <Badge variant="outline" className="font-normal">{item.returnType || "Unassigned"}</Badge>
                                )}
                              </TableCell>
                              {canEditAll && (
                                <TableCell className="align-middle p-2 text-center">
                                  <button onClick={() => handleDeleteRow(idx)} className="text-destructive/70 hover:text-destructive transition-colors" title="Remove row">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}

                        {/* 2. RENDER RFID ITEMS (Grouped) */}
                        {Object.values(
                          details.filter(i => i.rfidTags && i.rfidTags.length > 0).reduce((acc, item) => {
                            // Find the true index in details
                            const idx = details.findIndex(d => d === item);
                            const rType = item.returnType || "Unassigned";
                            const key = `${item.productId}-${item.unit}-${item.unitPrice}-${rType}`;
                            if (!acc[key]) {
                              acc[key] = {
                                key,
                                code: item.code,
                                description: item.description,
                                unit: item.unit,
                                returnType: rType,
                                unitPrice: item.unitPrice,
                                totalQty: 0,
                                totalGross: 0,
                                totalDiscount: 0,
                                totalNet: 0,
                                children: [],
                              };
                            }
                            acc[key].totalQty += Number(item.quantity) || 0;
                            acc[key].totalGross += Number(item.grossAmount) || 0;
                            acc[key].totalDiscount += Number(item.discountAmount) || 0;
                            acc[key].totalNet += Number(item.totalAmount) || 0;
                            acc[key].children.push({ item, idx });
                            return acc;
                          }, {} as Record<string, SalesReturnGroup>)
                        ).map((group: SalesReturnGroup) => (
                          <React.Fragment key={group.key}>
                            {/* Parent Summary Row */}
                            <TableRow className="bg-muted/10 font-semibold border-b border-border">
                              {/* 🟢 REVISED: All inputs disabled if not Pending (canEditAll) */}
                              <TableCell className="text-sm text-foreground align-middle font-mono">
                                <div className="flex items-center gap-2">
                                  {group.children.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedGroups(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                                      className="p-1 hover:bg-muted rounded-md transition-colors text-foreground"
                                    >
                                      <ChevronDown className={`h-4 w-4 transition-transform ${expandedGroups[group.key] ? 'rotate-180' : ''}`} />
                                    </button>
                                  ) : (
                                    <div className="w-6" /> // spacer
                                  )}
                                  <span>{group.code}</span>
                                </div>
                              </TableCell>
                              <TableCell className="align-middle">
                                <div
                                  className="text-sm text-foreground font-medium"
                                  title={group.description}
                                >
                                  {group.description}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground align-middle">
                                <Badge
                                  variant="outline"
                                  className="text-foreground bg-background border-border font-normal"
                                >
                                  {group.unit}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center align-middle p-2 text-primary text-sm font-bold">
                                {group.totalQty}
                              </TableCell>
                              <TableCell className="text-right align-middle p-2" />
                              <TableCell className="text-right align-middle" />
                              <TableCell className="align-middle p-2" />
                              <TableCell className="text-right align-middle p-2" />
                              <TableCell className="text-right align-middle" />
                              <TableCell className="align-middle p-2" />
                              <TableCell className="align-middle p-2">
                                {group.returnType !== "Unassigned" ? (
                                  <Badge
                                    variant="secondary"
                                    className="bg-primary/20 text-primary hover:bg-primary/20 hover:text-primary font-medium"
                                  >
                                    {group.returnType}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground/60 italic text-xs">Unassigned</span>
                                )}
                              </TableCell>
                              {canEditAll && <TableCell />}
                            </TableRow>

                            {/* Child Rows (Individual Scans/Additions) */}
                            {expandedGroups[group.key] && group.children.map(({ item, idx }: { item: SalesReturnItem, idx: number }) => (
                              <TableRow
                                key={item.id || idx}
                                className="border-b border-border hover:bg-muted/20 transition-colors duration-200"
                              >
                                {/* 🟢 REVISED: All inputs disabled if not Pending (canEditAll) */}
                                <TableCell colSpan={2} className="text-sm text-foreground font-bold align-middle pl-10 font-mono">
                                  {item.rfidTags && item.rfidTags.length > 0 ? (
                                    <div className="flex items-center gap-1.5 bg-background border border-border pl-2.5 pr-2 py-1 rounded-md w-fit truncate max-w-[200px]" title={item.rfidTags[0]}>
                                      <span className="text-primary truncate">{item.rfidTags[0]}</span>
                                      <span className="text-[10px] text-muted-foreground font-sans uppercase">RFID</span>
                                    </div>
                                  ) : null}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground align-middle">
                                </TableCell>
                                <TableCell className="text-center align-middle p-2">
                                  {canEditAll ? (
                                    item.rfidTags && item.rfidTags.length > 0 ? (
                                      <div className="text-center font-semibold text-sm">{item.quantity}</div>
                                    ) : (
                                      <Input
                                        type="number"
                                        className="h-9 w-full text-center text-sm border-border px-2"
                                        value={item.quantity}
                                        onChange={(e) =>
                                          handleDetailChange(
                                            idx,
                                            "quantity",
                                            e.target.value,
                                          )
                                        }
                                      />
                                    )
                                  ) : (
                                    <span className="text-sm font-semibold text-foreground">
                                      {item.quantity}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right align-middle p-2">
                                  {canEditAll ? (
                                    <Input
                                      type="number"
                                      className="h-9 w-full text-right text-sm border-border px-2"
                                      value={item.unitPrice}
                                      onChange={(e) =>
                                        handleDetailChange(
                                          idx,
                                          "unitPrice",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  ) : (
                                    <span className="text-sm text-foreground">
                                      {Number(item.unitPrice).toLocaleString()}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-sm text-muted-foreground align-middle font-mono whitespace-nowrap">
                                  {(Number(item.grossAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="align-middle p-2">
                                  {canEditAll ? (
                                    <Select
                                      value={
                                        item.discountType?.toString() || "No Discount"
                                      }
                                      onValueChange={(val) =>
                                        handleDetailChange(idx, "discountType", val)
                                      }
                                    >
                                      <SelectTrigger className="h-9 w-full text-sm border-border bg-background">
                                        <SelectValue placeholder="None" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="No Discount">
                                          None
                                        </SelectItem>
                                        {discountOptions.map((opt) => (
                                          <SelectItem
                                            key={opt.id}
                                            value={opt.id.toString()}
                                          >
                                            {opt.discount_type}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">
                                      {discountOptions.find(
                                        (d) => d.id.toString() == item.discountType,
                                      )?.discount_type || "None"}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right align-middle p-2">
                                  <Input
                                    type="number"
                                    readOnly
                                    className="h-9 w-full text-right text-sm bg-muted/30 text-muted-foreground cursor-not-allowed"
                                    value={item.discountAmount ? Number(item.discountAmount).toFixed(2) : ""}
                                  />
                                </TableCell>
                                <TableCell className="text-right font-bold text-sm text-foreground align-middle">
                                  {(Number(item.totalAmount) || 0).toLocaleString()}
                                </TableCell>
                                <TableCell className="align-middle p-2">
                                  {canEditAll ? (
                                    <Input
                                      className="h-9 w-full text-sm border-border bg-background"
                                      placeholder="Enter reason..."
                                      value={item.reason}
                                      onChange={(e) =>
                                        handleDetailChange(
                                          idx,
                                          "reason",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  ) : (
                                    <span className="text-sm text-muted-foreground italic">
                                      {item.reason || "-"}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="align-middle p-2">
                                  {canEditAll ? (
                                    <LocalSearchableSelect
                                      value={item.returnType || ""}
                                      onValueChange={(val) => {
                                        handleDetailChange(idx, "returnType", val);
                                        setReturnTypeError(false);
                                      }}
                                      options={returnTypeOptions.length > 0 
                                        ? returnTypeOptions.map((type) => ({ value: type.type_name, label: type.type_name }))
                                        : [
                                            { value: "Good Order", label: "Good Order" },
                                            { value: "Bad Order", label: "Bad Order" }
                                          ]
                                      }
                                      placeholder="Select type"
                                      className={cn(
                                        "h-9 text-sm",
                                        returnTypeError && (!item.returnType || item.returnType === "") && "border-destructive ring-1 ring-destructive/30 bg-destructive/5 text-destructive"
                                      )}
                                    />
                                  ) : (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] font-normal"
                                    >
                                      {item.returnType as React.ReactNode}
                                    </Badge>
                                  )}
                                </TableCell>
                                {canEditAll && (
                                  <TableCell className="text-center align-middle">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-white hover:bg-destructive"
                                      onClick={() => handleDeleteRow(idx)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </React.Fragment>
                        ))}
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* BOTTOM FORM GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5" ref={orderDropdownRef}>
                  <Label className="text-xs uppercase font-bold text-muted-foreground">
                    Order No. <span className="text-destructive">*</span>
                  </Label>
                  {/* Order No Dropdown */}
                  {canEditAll ? (
                    <div className="relative group">
                      <input
                        type="text"
                        className={`w-full h-9 border rounded-md text-sm px-3 pr-8 bg-background outline-none transition-all shadow-sm ${
                          orderError
                            ? "border-destructive bg-destructive/5 ring-1 ring-destructive"
                            : "border-border focus:ring-2 focus:border-primary"
                        }`}
                        placeholder="Search Order No..."
                        value={orderSearch || headerData.orderNo || ""}
                        onChange={(e) => {
                          setOrderSearch(e.target.value);
                          setHeaderData({ ...headerData, orderNo: e.target.value });
                          setIsOrderDropdownOpen(true);
                        }}
                        onFocus={() => setIsOrderDropdownOpen(true)}
                      />
                      <ChevronDown className="h-3 w-3 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      {isOrderDropdownOpen && (
                        <div className="absolute bottom-[calc(100%+4px)] left-0 w-full z-50 bg-background border border-border rounded-md shadow-xl max-h-48 overflow-y-auto">
                          {filteredOrderDropdown.length > 0 ? (
                            filteredOrderDropdown.map((inv) => (
                              <div
                                key={`order-${inv.id}`}
                                className="px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 text-foreground"
                                onClick={() => {
                                  setHeaderData({
                                    ...headerData,
                                    orderNo: inv.order_id,
                                    invoiceNo: inv.invoice_no,
                                  });
                                  setOrderSearch(inv.order_id);
                                  setInvoiceDropdownSearch(inv.invoice_no);
                                  setAppliedInvoiceId(Number(inv.id));
                                  setIsOrderDropdownOpen(false);
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{inv.order_id}</span>
                                  <span className="text-[10px] text-muted-foreground">Invoice: {inv.invoice_no}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                              No orders found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-md text-sm font-medium text-foreground">
                      {headerData.orderNo || "-"}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5" ref={invoiceDropdownRef}>
                  <Label className="text-xs uppercase font-bold text-muted-foreground">
                    Invoice No. <span className="text-destructive">*</span>
                  </Label>
                  {/* Invoice No Dropdown */}
                  {canEditAll ? (
                    <div className="relative group">
                      <input
                        type="text"
                        className={`w-full h-9 border rounded-md text-sm px-3 pr-8 bg-background outline-none transition-all shadow-sm ${
                          invoiceError
                            ? "border-destructive bg-destructive/5 ring-1 ring-destructive"
                            : "border-border focus:ring-2 focus:border-primary"
                        }`}
                        placeholder="Search Invoice No..."
                        value={invoiceDropdownSearch || headerData.invoiceNo || ""}
                        onChange={(e) => {
                          setInvoiceDropdownSearch(e.target.value);
                          setHeaderData({ ...headerData, invoiceNo: e.target.value });
                          setIsInvoiceDropdownOpen(true);
                        }}
                        onFocus={() => setIsInvoiceDropdownOpen(true)}
                      />
                      <ChevronDown className="h-3 w-3 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      {isInvoiceDropdownOpen && (
                        <div className="absolute bottom-[calc(100%+4px)] left-0 w-full z-50 bg-background border border-border rounded-md shadow-xl max-h-48 overflow-y-auto">
                          {filteredInvoiceDropdown.length > 0 ? (
                            filteredInvoiceDropdown.map((inv) => (
                              <div
                                key={`inv-${inv.id}`}
                                className="px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 text-foreground"
                                onClick={() => {
                                  setHeaderData({
                                    ...headerData,
                                    invoiceNo: inv.invoice_no,
                                    orderNo: inv.order_id,
                                  });
                                  setInvoiceDropdownSearch(inv.invoice_no);
                                  setOrderSearch(inv.order_id);
                                  setAppliedInvoiceId(Number(inv.id));
                                  setIsInvoiceDropdownOpen(false);
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{inv.invoice_no}</span>
                                  <span className="text-[10px] text-muted-foreground">Order: {inv.order_id}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                              No invoices found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-md text-sm font-medium text-foreground">
                      {headerData.invoiceNo || "-"}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">
                  Remarks
                </Label>
                {/* 🟢 REVISED: Editable if Pending or Received (canEditLimited) */}
                <Textarea
                  readOnly={!canEditLimited}
                  className={cn(
                    "min-h-[100px] border-border rounded-md focus:border-primary",
                    !canEditLimited
                      ? "bg-muted/30 border-border"
                      : "bg-background",
                  )}
                  value={headerData.remarks || ""}
                  onChange={(e) =>
                    setHeaderData({ ...headerData, remarks: e.target.value })
                  }
                />
              </div>
            </div>

            {/* FINANCIAL SUMMARY */}
            <div className="space-y-5">
              <div className="bg-background p-6 rounded-xl border border-primary/20 shadow-sm space-y-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">
                    Gross Amount
                  </span>
                  <div className="font-semibold text-foreground">
                    {loading ? (
                      <Skeleton className="h-5 w-24" />
                    ) : (
                      `₱${totalGross.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}`
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">
                    Discount Amount
                  </span>
                  <div className="font-semibold text-foreground">
                    {loading ? (
                      <Skeleton className="h-5 w-24" />
                    ) : (
                      `₱${totalDiscount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}`
                    )}
                  </div>
                </div>
                <div className="h-px bg-muted my-3"></div>
                <div className="flex justify-between items-center">
                  <span className="text-foreground font-bold text-base">
                    Net Amount
                  </span>
                  <div className="font-bold text-primary text-xl">
                    {loading ? (
                      <Skeleton className="h-7 w-32" />
                    ) : (
                      `₱${totalNet.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}`
                    )}
                  </div>
                </div>

                <div className="h-px bg-muted my-3"></div>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div className="flex justify-between items-center col-span-2">
                    <span className="text-muted-foreground font-medium">
                      Applied to
                    </span>
                    {/* 🟢 REVISED: Editable if Pending or Received (canEditLimited) */}
                    {loading && !statusCardData ? (
                      <Skeleton className="h-6 w-28" />
                    ) : canEditLimited ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs border-primary/20 text-primary hover:bg-primary/10 px-2"
                        onClick={() => setIsInvoiceLookupOpen(true)}
                      >
                        {statusCardData?.appliedTo || "Select Invoice"}{" "}
                        <LinkIcon className="ml-1 h-3 w-3" />
                      </Button>
                    ) : (
                      <span className="text-foreground font-medium">
                        {statusCardData?.appliedTo || "-"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="border-t border-border p-5 bg-background flex justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={handlePrintInNewTab}>
            <Printer className="h-4 w-4 mr-2" /> Print Slip
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            className="min-w-[100px]"
            onClick={handleReceiveClick}
            disabled={!isPending}
          >
            Receive
          </Button>
          <Button
            className="bg-primary hover:bg-primary text-white min-w-40"
            onClick={handleUpdateClick}
            disabled={!canEditLimited}
          >
            Update Sales Return
          </Button>
        </div>
      </DialogContent>

      {/* 2. INVOICE LOOKUP - 🟢 REVISED: Shows Amount */}
      <Dialog open={isInvoiceLookupOpen} onOpenChange={setIsInvoiceLookupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Select Invoice{" "}
              <Badge variant="secondary" className="text-xs font-normal">
                {invoiceOptions.length} Found
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Invoice No..."
                className="pl-10"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto border rounded-md divide-y">
              {/* 🟢 NEW: Clear Selection Option */}
              <div
                className="p-3 hover:bg-destructive/10 cursor-pointer flex items-center gap-3 transition-colors text-destructive font-medium border-b"
                onClick={() => {
                  setStatusCardData((prev) => ({
                    ...prev!,
                    appliedTo: "",
                  }));
                  setAppliedInvoiceId(null);
                  setIsInvoiceLookupOpen(false);
                }}
              >
                <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                  <X className="h-4 w-4" />
                </div>
                <div className="text-sm">Clear Selection (Unlink)</div>
              </div>

              {filteredInvoices.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No invoices found.
                </div>
              ) : (
                filteredInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 hover:bg-primary/10 cursor-pointer flex items-center gap-3 transition-colors justify-between"
                    onClick={() => {
                      setStatusCardData((prev) => ({
                        ...prev!,
                        appliedTo: inv.invoice_no,
                      }));
                      setAppliedInvoiceId(Number(inv.id));
                      setIsInvoiceLookupOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {inv.invoice_no}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {inv.id}
                        </div>
                      </div>
                    </div>
                    {/* 🟢 REVISED: Display Amount on Right Side */}
                    <span className="text-xs text-muted-foreground font-mono">
                      ₱
                      {Number(inv.amount || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ProductLookupModal
        isOpen={isProductLookupOpen}
        onClose={() => setIsProductLookupOpen(false)}
        onConfirm={handleConfirmProductLookup}
        priceType={headerData.priceType || "A"}
      />

      {/* CONFIRM DIALOGS (Update, Success, Receive) remain same structure */}
      <Dialog open={isUpdateConfirmOpen} onOpenChange={setIsUpdateConfirmOpen}>
        <DialogContent className="max-w-[400px] p-6 bg-background rounded-xl shadow-2xl border-0">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Save className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-lg font-bold">
                Confirm Update
              </DialogTitle>
              <div className="text-sm text-muted-foreground">
                Are you sure you want to save changes to Sales Return{" "}
                <span className="font-bold">{headerData.returnNo}</span>?
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsUpdateConfirmOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUpdate}
              disabled={isUpdating}
              className="bg-primary hover:bg-primary text-white"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirm Update"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isUpdateSuccessOpen}
        onOpenChange={(open) => {
          if (!open) {
            onSuccess();
            onClose();
          }
        }}
      >
        <DialogContent className="max-w-[400px] p-8 bg-background rounded-2xl shadow-2xl border-0 focus:outline-none z-60">
          <div className="flex flex-col items-center text-center gap-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center animate-in zoom-in duration-300">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-xl font-bold text-foreground">
                Success!
              </DialogTitle>
              <div className="text-muted-foreground">
                Sales Return updated successfully.
              </div>
            </div>
            <Button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base rounded-xl shadow-primary/20 shadow-lg transition-all active:scale-95"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isReceiveConfirmOpen}
        onOpenChange={setIsReceiveConfirmOpen}
      >
        <DialogContent className="max-w-[400px] p-6 bg-background rounded-xl shadow-2xl border-0">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-lg font-bold">
                Confirm Receipt
              </DialogTitle>
              <div className="text-sm text-muted-foreground">
                Are you sure you want to mark Return{" "}
                <span className="font-bold">{headerData.returnNo}</span> as
                RECEIVED?
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsReceiveConfirmOpen(false)}
              disabled={isReceiving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReceive}
              disabled={isReceiving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isReceiving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirm"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
