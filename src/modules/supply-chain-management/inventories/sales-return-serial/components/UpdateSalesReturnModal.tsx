"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Loader2,
  Plus,
  Trash2,
  Printer,
  Save,
  CheckCircle,
  ScanLine,
  Check,
  ChevronsUpDown,
  FileText,
  ChevronDown,
  Link as LinkIcon,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
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
import { cn } from "@/lib/utils";

import { SalesReturnProvider } from "../providers/fetchProviders";
import {
  SalesReturn,
  SalesReturnItem,
  InvoiceOption,
  API_LineDiscount,
  API_SalesReturnType,
  SalesReturnStatusCard,
} from "../types/sales-return.types";
import { ProductLookupModal } from "./ProductLookupModal";
import { SalesReturnPrintSlip } from "./SalesReturnPrintSlip";
import { createRoot } from "react-dom/client";

interface Props {
  returnId: number;
  initialData: SalesReturn;
  onClose: () => void;
  onSuccess: () => void;
}

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
        <Skeleton className="h-4 w-5/6 opacity-50" />
      ) : (
        <span className="truncate">{value || "-"}</span>
      )}
    </div>
  </div>
);

// --- OPTIMIZED SUB-COMPONENTS TO PREVENT LAG ---
const SerialInputSection = React.memo(({ onAdd, disabled }: { onAdd: (val: string) => void; disabled: boolean }) => {
  const [localValue, setLocalValue] = useState("");
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && localValue.trim()) {
      onAdd(localValue.trim());
      setLocalValue("");
    }
  };
  return (
    <div className="relative group">
      <Input
        className="h-9 w-64 pl-10 pr-10 text-sm font-mono border-primary/30 focus:ring-primary/20"
        placeholder="Type serial and press Enter..."
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
      {disabled ? (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
      ) : (
        <Plus
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary cursor-pointer"
          onClick={() => {
            if (localValue.trim()) {
              onAdd(localValue.trim());
              setLocalValue("");
            }
          }}
        />
      )}
    </div>
  );
});
SerialInputSection.displayName = "SerialInputSection";

const RemarksInputSection = React.memo(({ value, onChange, disabled }: { value: string; onChange: (val: string) => void; disabled?: boolean }) => {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <Textarea
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => onChange(localValue)}
      disabled={disabled}
      className="min-h-[100px]"
      placeholder="Add any notes regarding this return..."
    />
  );
});
RemarksInputSection.displayName = "RemarksInputSection";

const ReasonInputSection = React.memo(({ value, onChange, disabled }: { value: string; onChange: (val: string) => void; disabled?: boolean }) => {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <Input
      className="h-8"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => onChange(localValue)}
      disabled={disabled}
    />
  );
});
ReasonInputSection.displayName = "ReasonInputSection";

export function UpdateSalesReturnModal({
  returnId,
  initialData,
  onClose,
  onSuccess,
}: Props) {

  const [headerData, setHeaderData] = useState<SalesReturn>(initialData);
  const [details, setDetails] = useState<SalesReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceOption[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [appliedInvoiceId, setAppliedInvoiceId] = useState<number | null>(null);

  const invoiceWrapperRef = React.useRef<HTMLDivElement>(null);
  const orderWrapperRef = React.useRef<HTMLDivElement>(null);

  const [discountOptions, setDiscountOptions] = useState<API_LineDiscount[]>([]);
  const [returnTypeOptions, setReturnTypeOptions] = useState<API_SalesReturnType[]>([]);
  const [salesmenOptions, setSalesmenOptions] = useState<{ value: string; label: string; code: string; branch: string; branchId: number }[]>([]);
  const [customerOptions, setCustomerOptions] = useState<{ value: string; label: string }[]>([]);

  const [isProductLookupOpen, setIsProductLookupOpen] = useState(false);
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);
  const [isUpdateSuccessOpen, setIsUpdateSuccessOpen] = useState(false);
  const [isReceiveConfirmOpen, setIsReceiveConfirmOpen] = useState(false);
  const [isInvoiceLookupOpen, setIsInvoiceLookupOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);

  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [isValidatingSerial, setIsValidatingSerial] = useState(false);

  // statusCardData is fetched but not currently used in UI
  const [statusCardData, setStatusCardData] = useState<SalesReturnStatusCard | null>(null);

  const isPending = headerData.status === "Pending";
  const isReceived = headerData.status === "Received";
  const canEditAll = isPending;
  const canEditLimited = isPending || isReceived;

  useEffect(() => {
    const loadFullDetails = async () => {
      setLoading(true);
      try {
        const [items, statusData, discounts, retTypes, salesmen, customers] = await Promise.all([
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
        setAppliedInvoiceId(headerData.appliedInvoiceId || null);
        setOrderSearch(headerData.orderNo || "");
        setInvoiceSearch(headerData.invoiceNo || "");
      } catch (err) { console.error("Failed to load details", err); }
      finally { setLoading(false); }
    };
    loadFullDetails();
  }, [returnId, headerData.returnNo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (headerData.salesmanId && headerData.customerCode) {
      const fetchInv = async () => {
        try {
          const data = await SalesReturnProvider.getInvoiceReturnList(
            headerData.salesmanId.toString(),
            headerData.customerCode
          );
          setInvoiceOptions(data);
        } catch {
          setInvoiceOptions([]);
        }
      };
      fetchInv();
    }
  }, [headerData.salesmanId, headerData.customerCode]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (invoiceWrapperRef.current && !invoiceWrapperRef.current.contains(target)) setIsInvoiceOpen(false);
      if (orderWrapperRef.current && !orderWrapperRef.current.contains(target)) setIsOrderOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDetailChange = (idx: number, updates: Partial<SalesReturnItem> & { newSerial?: string }) => {
    setDetails((prev) => {
      const next = [...prev];
      const current = next[idx];
      if (!current) return prev;
      
      const updatedItem = { ...current, ...updates };
      
      if (updates.newSerial) {
        const serial = updates.newSerial.toUpperCase();
        const alreadyHas = next.some(row => row.serialNumbers?.some(sn => sn.toUpperCase() === serial));
        if (alreadyHas) {
          toast.warning("Serial Number already added");
          return prev;
        }
        updatedItem.serialNumbers = [...(current.serialNumbers || []), updates.newSerial];
      }
      
      if (updatedItem.isSerialized === 1 || updatedItem.isSerialized === true) {
        updatedItem.quantity = (updatedItem.serialNumbers || []).length;
      }
      
      updatedItem.grossAmount = Math.round(Number(updatedItem.quantity) * Number(updatedItem.unitPrice) * 100) / 100;
      
      let discAmt = 0;
      if (updatedItem.discountType) {
        const opt = discountOptions.find((d: API_LineDiscount) => d.id.toString() === updatedItem.discountType?.toString());
        if (opt) discAmt = Math.round(updatedItem.grossAmount * (parseFloat(opt.total_percent) / 100) * 100) / 100;
      }
      updatedItem.discountAmount = discAmt;
      updatedItem.totalAmount = Math.round((updatedItem.grossAmount - discAmt) * 100) / 100;
      
      next[idx] = updatedItem;
      return next;
    });
  };

  const handleAddSerial = async (serialVal?: string) => {
    const serial = (serialVal || "").trim().toUpperCase();
    if (!serial || selectedRowIndex === null) return;
    const selectedRow = details[selectedRowIndex];
    if (!selectedRow) return;

    const isGlobalSessionDuplicate = details.some((item) => 
      item.serialNumbers?.some(sn => sn.toUpperCase() === serial)
    );
    if (isGlobalSessionDuplicate) {
      toast.error("Duplicate Serial", { description: `Serial "${serial}" is already added to this return session.` });
      return;
    }

    const salesmanOpt = salesmenOptions.find(s => String(s.value) === String(headerData.salesmanId));
    const branchId = salesmanOpt?.branchId || headerData.branchId || 0;

    setIsValidatingSerial(true);
    try {
      const dup = await SalesReturnProvider.checkSerialDuplicate(serial);
      if (dup.isDuplicate) {
        toast.error("Already Returned", { description: `Serial "${serial}" is already recorded in Transaction #${dup.returnNo}` });
        return;
      }

      const result = await SalesReturnProvider.checkSerialOnHand(serial, Number(branchId) || 0); 
      if (result && result.isOnInventory) {
        toast.error("Serial Number already in stock");
        return;
      }

      handleDetailChange(selectedRowIndex, { newSerial: serial });
      toast.success("Serial Added", { description: `Serial ${serial} successfully tagged.` });
    } catch (err: unknown) {
      setIsValidatingSerial(false);
      toast.error("Validation Failed", { description: (err as Error).message || "An unexpected error occurred." });
    } finally {
      setIsValidatingSerial(false);
    }
  };

  const handleDeleteRow = (index: number) => setDetails((prev) => prev.filter((_, i) => i !== index));

  const handleUpdateClick = () => {
    if (!headerData.orderNo?.trim()) { toast.error("Order No. is required"); return; }
    if (!headerData.invoiceNo?.trim()) { toast.error("Invoice No. is required"); return; }
    const invalid = details.some(item => !item.returnType || item.returnType === "");
    if (invalid) { toast.error("Please select a return type for all items"); return; }
    setIsUpdateConfirmOpen(true);
  };

  const handleConfirmProductLookup = (newItems: Partial<SalesReturnItem>[]) => {
    setDetails((prev) => {
      const updated = [...prev];
      newItems.forEach((item) => {
        const rawId = item.product_id || item.productId || item.id;
        if (!rawId) return;

        const productId = Number(rawId);
        const unitPrice = Math.round(Number(item.unitPrice || 0) * 100) / 100;
        const isSerialized = item.isSerialized === 1 || item.isSerialized === true;
        const incomingQty = isSerialized ? 0 : (Number(item.quantity) || 1);

        const existingIndex = updated.findIndex((i) => 
          i.productId === productId && 
          i.unit === (item.unit || "Pcs") && 
          Math.round(Number(i.unitPrice) * 100) / 100 === unitPrice
        );

        if (existingIndex >= 0) {
          const existing = { ...updated[existingIndex] };
          if (!isSerialized) {
            existing.quantity = Number(existing.quantity) + incomingQty;
          }
          existing.grossAmount = Math.round(Number(existing.quantity) * Number(existing.unitPrice) * 100) / 100;
          if (existing.discountType) {
            const opt = discountOptions.find((d) => d.id.toString() === existing.discountType?.toString());
            if (opt) existing.discountAmount = Math.round(existing.grossAmount * (parseFloat(opt.total_percent) / 100) * 100) / 100;
          }
          existing.totalAmount = Math.round((existing.grossAmount - existing.discountAmount) * 100) / 100;
          updated[existingIndex] = existing;
        } else {
          const initialGross = Math.round(unitPrice * incomingQty * 100) / 100;
          let discAmt = 0;
          if (item.discountType) {
            const opt = discountOptions.find((d) => d.id.toString() === item.discountType?.toString());
            if (opt) discAmt = Math.round(initialGross * (parseFloat(opt.total_percent) / 100) * 100) / 100;
          }
          
          updated.push({
            ...item,
            id: `added-${Date.now()}-${productId}`,
            productId,
            code: item.code || "N/A",
            description: item.description || "Unknown Item",
            unit: item.unit || "Pcs",
            quantity: incomingQty,
            unitPrice,
            grossAmount: initialGross,
            discountType: item.discountType || "",
            discountAmount: discAmt,
            totalAmount: Math.round((initialGross - discAmt) * 100) / 100,
            reason: item.reason || "",
            returnType: item.returnType || "",
            serialNumbers: item.serialNumbers || [],
            isSerialized: isSerialized,
          } as SalesReturnItem);
        }
      });
      return updated;
    });
  };

  const handleConfirmUpdate = async () => {
    try {
      setIsUpdating(true);
      await SalesReturnProvider.updateReturn({
        returnId: headerData.id,
        returnNo: headerData.returnNo,
        items: details,
        remarks: headerData.remarks || "",
        invoiceNo: headerData.invoiceNo,
        orderNo: headerData.orderNo,
        appliedInvoiceId: appliedInvoiceId,
        isThirdParty: headerData.isThirdParty,
      });
      toast.success("Return Updated", { description: `Sales Return #${headerData.returnNo} has been successfully saved.` });
      setIsUpdateConfirmOpen(false);
      setIsUpdateSuccessOpen(true);
    } catch (err: unknown) {
      toast.error("Update Failed", { description: (err as Error).message || "Something went wrong while saving changes." });
    }
    finally { setIsUpdating(false); }
  };

  const handleConfirmReceive = async () => {
    try {
      setIsReceiving(true);
      await SalesReturnProvider.updateReturn({
        returnId: headerData.id,
        returnNo: headerData.returnNo,
        items: details,
        remarks: headerData.remarks || "",
        invoiceNo: headerData.invoiceNo,
        orderNo: headerData.orderNo,
        appliedInvoiceId: appliedInvoiceId,
        isThirdParty: headerData.isThirdParty,
      });
      const manilaMs = Date.now() + 8 * 60 * 60 * 1000;
      const d = new Date(manilaMs);
      const now = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`;
      await SalesReturnProvider.updateStatus(headerData.id, "Received", true, now);
      toast.success("Return Received", { description: "Sales return has been successfully received and posted to inventory." });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error("Receive Failed", { description: (err as Error).message || "An error occurred while marking as received." });
    }
    finally { setIsReceiving(false); }
  };

  const handlePrintInNewTab = () => {
    const printData = {
      returnNo: headerData.returnNo,
      returnDate: headerData.returnDate,
      status: headerData.status,
      remarks: headerData.remarks,
      salesmanName: salesmenOptions.find(s => String(s.value) === String(headerData.salesmanId))?.label || "-",
      salesmanCode: salesmenOptions.find(s => String(s.value) === String(headerData.salesmanId))?.code || "-",
      customerName: customerOptions.find(c => String(c.value) === String(headerData.customerCode))?.label || "-",
      customerCode: headerData.customerCode,
      branchName: salesmenOptions.find(s => String(s.value) === String(headerData.salesmanId))?.branch || "-",
      items: details,
      totalAmount: details.reduce((acc, i) => acc + (i.totalAmount || 0), 0),
    };
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write("<html><head><title>Print Preview</title></head><body><div id='print-root'></div></body></html>");
    document.querySelectorAll('link[rel="stylesheet"], style').forEach(node => printWindow.document.head.appendChild(node.cloneNode(true)));
    const root = createRoot(printWindow.document.getElementById("print-root")!);
    root.render(<SalesReturnPrintSlip data={printData} />);
    setTimeout(() => printWindow.print(), 1000);
  };

  const totalGross = Math.round(details.reduce((acc, i) => acc + (i.grossAmount || 0), 0) * 100) / 100;
  const totalDiscount = Math.round(details.reduce((acc, i) => acc + (i.discountAmount || 0), 0) * 100) / 100;
  const totalNet = Math.round((totalGross - totalDiscount) * 100) / 100;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[95vw] lg:max-w-7xl h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-0 shadow-2xl rounded-xl [&>button]:hidden">
        <div className="px-8 py-5 border-b border-border flex justify-between items-center bg-background shrink-0">
          <div>
            <DialogTitle className="text-2xl font-bold text-foreground">{isPending ? "Edit Sales Return" : "Return Details"}</DialogTitle>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-bold uppercase tracking-wider">{headerData.returnNo}</span>
              <span className="text-muted-foreground text-sm">|</span>
              <span className="text-sm text-muted-foreground">{headerData.returnDate}</span>
            </div>
          </div>
          <button onClick={onClose} className="bg-destructive hover:bg-destructive text-white p-2 rounded-md shadow-sm transition-all active:scale-95"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-muted/50">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4 bg-background p-5 rounded-xl border border-border shadow-sm relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-xl"></div>
            <ReadOnlyField label="Salesman" value={salesmenOptions.find(s => String(s.value) === String(headerData.salesmanId))?.label} isLoading={loading} />
            <ReadOnlyField label="Salesman Code" value={salesmenOptions.find(s => String(s.value) === String(headerData.salesmanId))?.code} isLoading={loading} />
            <ReadOnlyField label="Customer" value={customerOptions.find(c => String(c.value) === String(headerData.customerCode))?.label} isLoading={loading} />
            <ReadOnlyField label="Customer Code" value={headerData.customerCode} isLoading={loading} />
            <ReadOnlyField label="Branch" value={salesmenOptions.find(s => String(s.value) === String(headerData.salesmanId))?.branch} isLoading={loading} />
            <ReadOnlyField label="Return Date" value={headerData.returnDate} isLoading={loading} />
            <ReadOnlyField label="Received Date" value={headerData.receivedAt} isLoading={loading} />
            <ReadOnlyField label="Price Type" value={headerData.priceType} isLoading={loading} />
            <div className="flex items-center space-x-2 pt-2 col-span-2 lg:col-span-4">
              <Checkbox id="isThirdParty" checked={headerData.isThirdParty || false} disabled={!canEditAll} onCheckedChange={checked => setHeaderData({ ...headerData, isThirdParty: checked as boolean })} />
              <Label htmlFor="isThirdParty" className="text-sm font-medium text-foreground cursor-pointer">Third Party Transaction</Label>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2"><span className="h-5 w-1 bg-primary rounded-full"></span>Products Summary</h3>
              {canEditAll && (
                <Button size="sm" onClick={() => setIsProductLookupOpen(true)} className="bg-primary hover:bg-primary text-white shadow-primary/20 shadow-md h-9 gap-2">
                  <Plus className="h-4 w-4" /> Add Product
                </Button>
              )}
            </div>
            <div className="border border-border rounded-xl overflow-hidden bg-background shadow-sm">
              <div className="overflow-x-auto pb-4">
                <Table className="min-w-[1500px]">
                  <TableHeader>
                    <TableRow className="bg-primary hover:bg-primary! border-none">
                      <TableHead className="text-white font-semibold h-11 w-[120px] uppercase text-xs">Code</TableHead>
                      <TableHead className="text-white font-semibold h-11 min-w-[180px] uppercase text-xs">Description</TableHead>
                      <TableHead className="text-white font-semibold h-11 w-[80px] uppercase text-xs">Unit</TableHead>
                      <TableHead className="text-white font-semibold h-11 text-center w-[150px] uppercase text-xs">Qty</TableHead>
                      <TableHead className="text-white font-semibold h-11 text-right min-w-[100px] uppercase text-xs">Unit Price</TableHead>
                      <TableHead className="text-white font-semibold h-11 text-right min-w-[120px] uppercase text-xs">Gross</TableHead>
                      <TableHead className="text-white font-semibold h-11 w-[160px] uppercase text-xs">Disc. Type</TableHead>
                      <TableHead className="text-white font-semibold h-11 text-right min-w-[120px] uppercase text-xs">Disc. Amt</TableHead>
                      <TableHead className="text-white font-semibold h-11 text-right min-w-[120px] uppercase text-xs">Total</TableHead>
                      <TableHead className="text-white font-semibold h-11 min-w-[180px] uppercase text-xs">Reason</TableHead>
                      <TableHead className="text-white font-semibold h-11 w-[200px] uppercase text-xs">Return Type</TableHead>
                      {canEditAll && <TableHead className="text-white font-semibold h-11 w-[50px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        {canEditAll && <TableCell><Skeleton className="h-4 w-8" /></TableCell>}
                      </TableRow>
                    )) : details.length === 0 ? (
                      <TableRow><TableCell colSpan={12} className="px-6 py-16 text-center text-muted-foreground bg-muted/30"><div className="flex flex-col items-center gap-2"><FileText className="h-8 w-8 text-muted-foreground mb-1" /><p>No items added yet.</p><span className="text-xs">Click &ldquo;Add Product&rdquo; to browse catalog.</span></div></TableCell></TableRow>
                    ) : details.map((item, idx) => (
                      <TableRow key={idx} onClick={() => canEditAll && setSelectedRowIndex(idx)} className={cn("border-b border-border hover:bg-muted/10 transition-colors cursor-pointer", selectedRowIndex === idx && "bg-primary/5")}>
                        <TableCell className="font-mono text-sm">{item.code}</TableCell>
                        <TableCell className="text-sm font-medium">{item.description}</TableCell>
                        <TableCell><Badge variant="outline">{item.unit}</Badge></TableCell>
                        <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-col items-center gap-1">
                            {item.isSerialized === 1 || item.isSerialized === true ? (
                              <Badge variant="outline" className="font-bold min-w-[40px] flex justify-center border-primary/40 bg-primary/10 text-primary shadow-sm">{item.quantity}</Badge>
                            ) : (
                              <Input type="number" className="h-8 w-16 text-center mx-auto" disabled={!canEditAll} value={item.quantity} onChange={e => handleDetailChange(idx, { quantity: Math.max(1, parseInt(e.target.value) || 0) })} />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">₱{Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">₱{Number(item.grossAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          <Select value={item.discountType?.toString() || "No Discount"} onValueChange={v => handleDetailChange(idx, { discountType: v })} disabled={!canEditAll}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="No Discount">None</SelectItem>{discountOptions.map(o => <SelectItem key={o.id} value={o.id.toString()}>{o.discount_type}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">₱{Number(item.discountAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-bold">₱{Number(item.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell onClick={e => e.stopPropagation()}><ReasonInputSection value={item.reason || ""} onChange={val => handleDetailChange(idx, { reason: val })} disabled={!canEditAll} /></TableCell>
                        <TableCell>
                          <LocalSearchableSelect value={item.returnType || ""} onValueChange={v => handleDetailChange(idx, { returnType: v })} options={returnTypeOptions.map(t => ({ value: t.type_name, label: t.type_name }))} disabled={!canEditAll} />
                        </TableCell>
                        {canEditAll && <TableCell><Button variant="ghost" size="icon" onClick={() => handleDeleteRow(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {selectedRowIndex !== null && details[selectedRowIndex] && (
            <div className="bg-background rounded-lg border-2 border-primary/20 shadow-md p-5 mb-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-foreground flex items-center gap-2 text-base">
                  <div className="bg-emerald-500/10 p-1.5 rounded text-emerald-600">
                    <ScanLine className="h-5 w-5" />
                  </div>
                  Serial Management for: <span className="text-primary underline decoration-primary/30 underline-offset-4">{details[selectedRowIndex].description}</span>
                </h4>
                <div className="flex items-center gap-3">
                  {canEditAll && (
                    <SerialInputSection onAdd={(serial) => handleAddSerial(serial)} disabled={isValidatingSerial} />
                  )}
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1 font-bold">{details[selectedRowIndex].serialNumbers?.length || 0} TOTAL</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-40 overflow-y-auto p-1">
                {(details[selectedRowIndex].serialNumbers || []).map((sn: string) => (
                  <div key={sn} className="flex items-center justify-between bg-muted/20 border border-border px-3 py-2 rounded-md hover:border-primary/30 transition-all group hover:shadow-sm">
                    <span className="text-[10px] font-mono font-bold text-foreground truncate">{sn}</span>
                    {canEditAll && (
                      <button onClick={() => {
                        const row = details[selectedRowIndex];
                        const newSerials = row.serialNumbers!.filter((s: string) => s !== sn);
                        handleDetailChange(selectedRowIndex, { serialNumbers: newSerials });
                      }} className="p-1 text-destructive/50 hover:text-destructive transition-colors"><X className="h-3 w-3" /></button>
                    )}
                  </div>
                ))}
                {(details[selectedRowIndex].serialNumbers || []).length === 0 && <div className="col-span-full py-8 text-center border border-dashed rounded-lg text-muted-foreground italic">No serial numbers entered yet.</div>}
              </div>
            </div>
          )}

          {/* BOTTOM FORM */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5" ref={orderWrapperRef}>
                  <Label className="text-xs font-bold uppercase tracking-wide">Order No.</Label>
                  <div className="relative group">
                    <Input disabled={!canEditAll} className="h-9 w-full bg-background border-border shadow-sm text-sm" placeholder="Search Order No..." value={orderSearch} onChange={e => { setOrderSearch(e.target.value); setHeaderData({ ...headerData, orderNo: e.target.value }); setIsOrderOpen(true); }} onFocus={() => setIsOrderOpen(true)} />
                    <ChevronDown className="h-3 w-3 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    {isOrderOpen && (
                      <div className="absolute bottom-[calc(100%+4px)] left-0 w-full z-50 bg-background border border-border rounded-md shadow-xl max-h-48 overflow-y-auto divide-y">
                        <div className="px-3 py-2 text-xs font-medium cursor-pointer hover:bg-destructive/10 text-destructive flex items-center gap-2" onClick={() => { setOrderSearch(""); setHeaderData({ ...headerData, orderNo: "", invoiceNo: "" }); setInvoiceSearch(""); setAppliedInvoiceId(null); setIsOrderOpen(false); }}><X className="h-3 w-3" /> Clear Selection</div>
                        {invoiceOptions.filter(inv => inv.order_id?.toLowerCase().includes(orderSearch.toLowerCase())).map(inv => (
                          <div key={inv.id} className="px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 text-foreground" onClick={() => { setOrderSearch(inv.order_id || ""); setHeaderData({ ...headerData, orderNo: inv.order_id || "", invoiceNo: inv.invoice_no || "" }); setInvoiceSearch(inv.invoice_no || ""); setAppliedInvoiceId(Number(inv.id)); setIsOrderOpen(false); }}>
                            <div className="flex flex-col"><span className="font-medium">{inv.order_id}</span><span className="text-[10px] text-muted-foreground">Invoice: {inv.invoice_no}</span></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5" ref={invoiceWrapperRef}>
                  <Label className="text-xs font-bold uppercase tracking-wide">Invoice No.</Label>
                  <div className="relative group">
                    <Input disabled={!canEditAll} className="h-9 w-full bg-background border-border shadow-sm text-sm" placeholder="Search Invoice No..." value={invoiceSearch} onChange={e => { setInvoiceSearch(e.target.value); setHeaderData({ ...headerData, invoiceNo: e.target.value }); setIsInvoiceOpen(true); }} onFocus={() => setIsInvoiceOpen(true)} />
                    <ChevronDown className="h-3 w-3 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    {isInvoiceOpen && (
                      <div className="absolute bottom-[calc(100%+4px)] left-0 w-full z-50 bg-background border border-border rounded-md shadow-xl max-h-48 overflow-y-auto divide-y">
                        <div className="px-3 py-2 text-xs font-medium cursor-pointer hover:bg-destructive/10 text-destructive flex items-center gap-2" onClick={() => { setInvoiceSearch(""); setHeaderData({ ...headerData, invoiceNo: "", orderNo: "" }); setOrderSearch(""); setAppliedInvoiceId(null); setIsInvoiceOpen(false); }}><X className="h-3 w-3" /> Clear Selection</div>
                        {invoiceOptions.filter(inv => inv.invoice_no?.toLowerCase().includes(invoiceSearch.toLowerCase())).map(inv => (
                          <div key={inv.id} className="px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 text-foreground" onClick={() => { setInvoiceSearch(inv.invoice_no || ""); setHeaderData({ ...headerData, invoiceNo: inv.invoice_no || "", orderNo: inv.order_id || "" }); setOrderSearch(inv.order_id || ""); setAppliedInvoiceId(Number(inv.id)); setIsInvoiceOpen(false); }}>
                            <div className="flex flex-col"><span className="font-medium">{inv.invoice_no}</span><span className="text-[10px] text-muted-foreground">Order: {inv.order_id}</span></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs font-bold uppercase">Remarks</Label><RemarksInputSection disabled={!canEditLimited} value={headerData.remarks || ""} onChange={(val) => setHeaderData({ ...headerData, remarks: val })} /></div>
            </div>
            <div className="bg-background p-6 rounded-xl border border-primary/20 shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
              <div className="flex justify-between text-sm"><span>Gross Amount</span><span className="font-bold">₱{totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between text-sm"><span>Discount Amount</span><span className="font-bold text-destructive">-₱{totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              <div className="h-px bg-border"></div>
              <div className="flex justify-between items-center"><span className="font-black">Net Amount</span><span className="text-2xl font-black text-primary">₱{totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              <div className="h-px bg-border my-2"></div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Applied to</span>
                {canEditLimited ? (
                  <Button variant="ghost" size="sm" className="h-6 text-xs border-primary/20 text-primary hover:bg-primary/10 px-2" onClick={() => setIsInvoiceLookupOpen(true)}>
                    {statusCardData?.appliedTo || invoiceOptions.find(i => Number(i.id) === appliedInvoiceId)?.invoice_no || "Select Invoice"} <LinkIcon className="ml-1 h-3 w-3" />
                  </Button>
                ) : (
                  <span className="font-bold">{statusCardData?.appliedTo || "-"}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="border-t border-border p-5 bg-background flex justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={handlePrintInNewTab}><Printer className="h-4 w-4 mr-2" /> Print Slip</Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => setIsReceiveConfirmOpen(true)} disabled={!isPending}>Receive</Button>
          <Button className="bg-primary hover:bg-primary text-white min-w-40" onClick={handleUpdateClick} disabled={!canEditLimited}>Update Sales Return</Button>
        </div>
      </DialogContent>

      <ProductLookupModal isOpen={isProductLookupOpen} onClose={() => setIsProductLookupOpen(false)} onConfirm={handleConfirmProductLookup} priceType={headerData.priceType || "A"} customerCode={headerData.customerCode} />

      <Dialog open={isInvoiceLookupOpen} onOpenChange={setIsInvoiceLookupOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Select Invoice <Badge variant="secondary" className="ml-2">{invoiceOptions.length}</Badge></DialogTitle>
          <div className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search Invoice No..." className="pl-10" value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)} />
            </div>
            <div className="max-h-[300px] overflow-y-auto border rounded-md divide-y shadow-inner">
              <div className="p-3 hover:bg-destructive/10 cursor-pointer flex items-center gap-3 transition-colors text-destructive font-medium" onClick={() => { setAppliedInvoiceId(null); setStatusCardData(prev => prev ? { ...prev, appliedTo: "" } : null); setIsInvoiceLookupOpen(false); }}>
                <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center"><X className="h-4 w-4" /></div>
                <div className="text-sm">Clear Selection (Unlink)</div>
              </div>
              {invoiceOptions.filter(inv => inv.invoice_no.toLowerCase().includes(invoiceSearch.toLowerCase())).map(inv => (
                <div key={inv.id} className="p-3 hover:bg-primary/5 cursor-pointer flex items-center justify-between transition-all" onClick={() => { 
                  setAppliedInvoiceId(Number(inv.id)); 
                  setStatusCardData(prev => prev ? { ...prev, appliedTo: inv.invoice_no } : null); 
                  setIsInvoiceLookupOpen(false); 
                }}>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><FileText className="h-4 w-4" /></div>
                    <div className="flex flex-col"><span className="text-sm font-bold">{inv.invoice_no}</span><span className="text-[10px] text-muted-foreground">Order: {inv.order_id}</span></div>
                  </div>
                  <span className="text-xs font-mono font-bold text-primary">₱{Number(inv.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
              {invoiceOptions.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground italic">No invoices found for this salesman/customer.</div>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isUpdateConfirmOpen} onOpenChange={setIsUpdateConfirmOpen}>
        <DialogContent className="max-w-[400px] text-center p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-primary/10 p-4 rounded-full text-primary"><Save className="h-10 w-10" /></div>
            <DialogTitle className="text-xl font-bold">Confirm Update</DialogTitle>
            <p className="text-sm text-muted-foreground">Save changes to Sales Return <span className="font-bold">#{headerData.returnNo}</span>?</p>
            <div className="grid grid-cols-2 gap-3 w-full mt-4">
              <Button variant="outline" onClick={() => setIsUpdateConfirmOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmUpdate} disabled={isUpdating}>{isUpdating ? <Loader2 className="animate-spin h-4 w-4" /> : "Confirm Update"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isReceiveConfirmOpen} onOpenChange={setIsReceiveConfirmOpen}>
        <DialogContent className="max-w-[400px] text-center p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-emerald-100 p-4 rounded-full text-emerald-600"><CheckCircle className="h-10 w-10" /></div>
            <DialogTitle className="text-xl font-bold">Confirm Receive</DialogTitle>
            <p className="text-sm text-muted-foreground">Mark this return as <span className="font-bold">RECEIVED</span>? This will lock all item details and financial amounts.</p>
            <div className="grid grid-cols-2 gap-3 w-full mt-4">
              <Button variant="outline" onClick={() => setIsReceiveConfirmOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmReceive} disabled={isReceiving}>{isReceiving ? <Loader2 className="animate-spin h-4 w-4" /> : "Confirm Receive"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isUpdateSuccessOpen} onOpenChange={(open) => { if (!open) { setIsUpdateSuccessOpen(false); onSuccess(); onClose(); } }}>
        <DialogContent className="max-w-[400px] text-center p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-emerald-100 p-4 rounded-full text-emerald-600"><CheckCircle className="h-10 w-10" /></div>
            <DialogTitle className="text-xl font-bold">Update Successful</DialogTitle>
            <p className="text-sm text-muted-foreground">Changes to Sales Return <span className="font-bold">#{headerData.returnNo}</span> have been saved successfully.</p>
            <Button className="w-full mt-4" onClick={() => { setIsUpdateSuccessOpen(false); onSuccess(); onClose(); }}>Continue</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
