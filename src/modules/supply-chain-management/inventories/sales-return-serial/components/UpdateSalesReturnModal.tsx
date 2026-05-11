"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Loader2,
  Plus,
  Trash2,
  Printer,
  Save,
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
import { useSearchParams } from "next/navigation";

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

  const [headerData, setHeaderData] = useState<SalesReturn>(initialData);
  const [details, setDetails] = useState<SalesReturnItem[]>([]);
  const [statusCardData, setStatusCardData] = useState<SalesReturnStatusCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [appliedInvoiceId, setAppliedInvoiceId] = useState<number | null>(null);

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
  const [returnTypeError, setReturnTypeError] = useState(false);
  const [orderError, setOrderError] = useState(false);
  const [invoiceError, setInvoiceError] = useState(false);

  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceOption[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState("");

  const [isOrderDropdownOpen, setIsOrderDropdownOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const orderDropdownRef = useRef<HTMLDivElement>(null);
  const [isInvoiceDropdownOpen, setIsInvoiceDropdownOpen] = useState(false);
  const [invoiceDropdownSearch, setInvoiceDropdownSearch] = useState("");
  const invoiceDropdownRef = useRef<HTMLDivElement>(null);

  // Serial State
  const [isValidatingSerial, setIsValidatingSerial] = useState(false);
  const [serialInput, setSerialInput] = useState("");
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

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
        try {
          const invoices = await SalesReturnProvider.getInvoiceReturnList(headerData.salesmanId?.toString(), headerData.customerCode);
          setInvoiceOptions(invoices);
        } catch { setInvoiceOptions([]); }
      } catch (err) { console.error("Failed to load details", err); }
      finally { setLoading(false); }
    };
    if (returnId) loadFullDetails();
  }, [returnId, headerData.returnNo, headerData.customerCode, headerData.salesmanId]);

  useEffect(() => {
    if (details.length > 0) {
      setDetails((prev) => prev.map((item) => {
        const key = `price${headerData.priceType}`;
        const basePrice = Number((item as any)[key]) || Number(item.priceA) || Number(item.unitPrice) || 0;
        const gross = Math.round(Number(item.quantity) * basePrice * 100) / 100;
        let discAmt = 0;
        if (item.discountType && item.discountType !== "No Discount") {
          const opt = discountOptions.find(d => d.id.toString() === item.discountType?.toString());
          if (opt) discAmt = Math.round(gross * (parseFloat(opt.total_percent) / 100) * 100) / 100;
        }
        return { ...item, unitPrice: basePrice, grossAmount: gross, discountAmount: discAmt, totalAmount: Math.round((gross - discAmt) * 100) / 100 };
      }));
    }
  }, [headerData.priceType, discountOptions]);

  const handleAddSerial = async () => {
    const serial = serialInput.trim();
    if (!serial || selectedRowIndex === null) return;
    const row = details[selectedRowIndex];
    if (row.serialNumbers?.includes(serial)) { toast.error("Serial already added."); return; }

    const salesmanOpt = salesmenOptions.find(s => String(s.value) === String(headerData.salesmanId));
    const branchId = salesmanOpt?.branchId || headerData.branchId || 0;

    setIsValidatingSerial(true);
    try {
      const dup = await SalesReturnProvider.checkSerialDuplicate(serial);
      if (dup.isDuplicate && dup.returnNo !== headerData.returnNo) {
        toast.error(`Serial already returned in #${dup.returnNo}`);
        return;
      }
      const onHand = await SalesReturnProvider.checkSerialOnHand(serial, branchId);
      if (onHand.isOnInventory) { toast.error("Serial is currently in stock."); return; }

      const updatedRow = { ...row };
      updatedRow.serialNumbers = [...(updatedRow.serialNumbers || []), serial];
      updatedRow.quantity = updatedRow.serialNumbers.length;
      handleDetailChange(selectedRowIndex, "serialNumbers", updatedRow.serialNumbers);
      setSerialInput("");
    } catch (err: any) { toast.error(err.message); }
    finally { setIsValidatingSerial(false); }
  };

  const handleDetailChange = (index: number, field: keyof SalesReturnItem, value: any) => {
    setDetails((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      const qty = Number(item.quantity || 0);
      const price = Number(item.unitPrice || 0);
      const gross = Math.round(qty * price * 100) / 100;
      let discAmt = 0;
      if (item.discountType && item.discountType !== "No Discount") {
        const opt = discountOptions.find(d => d.id.toString() === item.discountType?.toString());
        if (opt) discAmt = Math.round(gross * (parseFloat(opt.total_percent) / 100) * 100) / 100;
      }
      item.grossAmount = gross;
      item.discountAmount = discAmt;
      item.totalAmount = Math.round((gross - discAmt) * 100) / 100;
      next[index] = item;
      return next;
    });
  };

  const handleDeleteRow = (index: number) => setDetails((prev) => prev.filter((_, i) => i !== index));

  const handleUpdateClick = () => {
    setOrderError(false);
    setInvoiceError(false);
    setReturnTypeError(false);

    if (!headerData.orderNo?.trim()) { setOrderError(true); toast.error("Order No. is required"); return; }
    if (!headerData.invoiceNo?.trim()) { setInvoiceError(true); toast.error("Invoice No. is required"); return; }

    const invalid = details.some(item => !item.returnType || item.returnType === "");
    if (invalid) { setReturnTypeError(true); toast.error("Please select a return type for all items"); return; }

    setIsUpdateConfirmOpen(true);
  };

  const handleConfirmProductLookup = (newItems: Partial<SalesReturnItem>[]) => {
    setDetails((prev) => {
      const updated = [...prev];
      newItems.forEach((item) => {
        const rawId = item.product_id || item.productId || item.id;
        const productId = Number(rawId);
        const existingIndex = updated.findIndex((i) => i.productId === productId && i.unit === item.unit && i.unitPrice === Number(item.unitPrice));
        const incomingQty = item.unitOrder === 3 ? 0 : (item.quantity || 1);

        if (existingIndex >= 0) {
          const existing = updated[existingIndex];
          existing.quantity += incomingQty;
          existing.grossAmount = Math.round(existing.quantity * existing.unitPrice * 100) / 100;
          if (existing.discountType) {
            const opt = discountOptions.find((d) => d.id.toString() === existing.discountType?.toString());
            if (opt) existing.discountAmount = Math.round(existing.grossAmount * (parseFloat(opt.total_percent) / 100) * 100) / 100;
          }
          existing.totalAmount = Math.round((existing.grossAmount - existing.discountAmount) * 100) / 100;
        } else {
          const unitPrice = Math.round(Number(item.unitPrice || 0) * 100) / 100;
          const initialGross = Math.round(unitPrice * incomingQty * 100) / 100;
          let discAmt = 0;
          if (item.discountType) {
            const opt = discountOptions.find((d) => d.id.toString() === item.discountType?.toString());
            if (opt) discAmt = Math.round(initialGross * (parseFloat(opt.total_percent) / 100) * 100) / 100;
          }
          updated.push({
            ...item,
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
            reason: "",
            returnType: "",
            serialNumbers: [],
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
        appliedInvoiceId: appliedInvoiceId ?? undefined,
        isThirdParty: headerData.isThirdParty,
      });
      setIsUpdateConfirmOpen(false);
      setIsUpdateSuccessOpen(true);
    } catch (err) { toast.error("Update failed"); }
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
        appliedInvoiceId: appliedInvoiceId ?? undefined,
        isThirdParty: headerData.isThirdParty,
      });
      const now = new Date().toISOString();
      await SalesReturnProvider.updateStatus(headerData.id, "Received", true, now);
      onSuccess();
      onClose();
    } catch (err) { toast.error("Receive failed"); }
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
        {/* HEADER */}
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

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-muted/50">
          {/* METADATA */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4 bg-background p-5 rounded-xl border border-border shadow-sm relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-xl"></div>
            <ReadOnlyField label="Salesman" value={salesmenOptions.find(s => String(s.value) === String(headerData.salesmanId))?.label} isLoading={loading} />
            <ReadOnlyField label="Salesman Code" value={salesmenOptions.find(s => String(s.value) === String(headerData.salesmanId))?.code} isLoading={loading} />
            <ReadOnlyField label="Customer" value={customerOptions.find(c => String(c.value) === String(headerData.customerCode))?.label} isLoading={loading} />
            <ReadOnlyField label="Customer Code" value={headerData.customerCode} />
            <ReadOnlyField label="Branch" value={salesmenOptions.find(s => String(s.value) === String(headerData.salesmanId))?.branch} isLoading={loading} />
            <ReadOnlyField label="Return Date" value={headerData.returnDate} />
            <ReadOnlyField label="Price Type" value={headerData.priceType} />
            <div className="flex items-center space-x-2 pt-2 col-span-2 lg:col-span-4">
              <Checkbox id="isThirdParty" checked={headerData.isThirdParty || false} disabled={!canEditAll} onCheckedChange={checked => setHeaderData({ ...headerData, isThirdParty: checked as boolean })} />
              <Label htmlFor="isThirdParty" className="text-sm font-medium text-foreground cursor-pointer">Third Party Transaction</Label>
            </div>
          </div>

          {/* PRODUCT TABLE */}
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
                      <TableRow key={i}><TableCell colSpan={12}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    )) : details.map((item, idx) => (
                      <TableRow key={idx} onClick={() => canEditAll && item.unitOrder === 3 && setSelectedRowIndex(idx)} className={cn("border-b border-border hover:bg-muted/10 transition-colors cursor-pointer", selectedRowIndex === idx && "bg-primary/5")}>
                        <TableCell className="font-mono text-sm">{item.code}</TableCell>
                        <TableCell className="text-sm font-medium">{item.description}</TableCell>
                        <TableCell><Badge variant="outline">{item.unit}</Badge></TableCell>
                        <TableCell className="text-center">
                          {item.unitOrder === 3 ? <Badge className="bg-primary/10 text-primary font-bold">{item.quantity}</Badge> : (
                            <Input type="number" className="h-8 w-16 text-center mx-auto" disabled={!canEditAll} value={item.quantity} onChange={e => handleDetailChange(idx, "quantity", e.target.value)} />
                          )}
                        </TableCell>
                        <TableCell className="text-right">₱{Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">₱{Number(item.grossAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          <Select value={item.discountType?.toString() || "No Discount"} onValueChange={v => handleDetailChange(idx, "discountType", v)} disabled={!canEditAll}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="No Discount">None</SelectItem>{discountOptions.map(o => <SelectItem key={o.id} value={o.id.toString()}>{o.discount_type}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">₱{Number(item.discountAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-bold">₱{Number(item.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell><Input className="h-8" disabled={!canEditAll} value={item.reason || ""} onChange={e => handleDetailChange(idx, "reason", e.target.value)} /></TableCell>
                        <TableCell>
                          <LocalSearchableSelect value={item.returnType || ""} onValueChange={v => handleDetailChange(idx, "returnType", v)} options={returnTypeOptions.map(t => ({ value: t.type_name, label: t.type_name }))} disabled={!canEditAll} />
                        </TableCell>
                        {canEditAll && <TableCell><Button variant="ghost" size="icon" onClick={() => handleDeleteRow(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* SERIAL MANAGEMENT */}
          {canEditAll && selectedRowIndex !== null && (
            <div className="bg-background rounded-lg border-2 border-primary/20 shadow-md p-5 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold flex items-center gap-2"><ScanLine className="h-5 w-5 text-primary" /> Serial Management: {details[selectedRowIndex].description}</h4>
                <div className="flex gap-2">
                  <Input className="h-9 w-64" placeholder="Enter Serial..." value={serialInput} onChange={e => setSerialInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddSerial()} disabled={isValidatingSerial} />
                  <Button size="sm" onClick={handleAddSerial} disabled={isValidatingSerial}>{isValidatingSerial ? <Loader2 className="animate-spin h-4 w-4" /> : <Plus className="h-4 w-4" />}</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1">
                {(details[selectedRowIndex].serialNumbers || []).map(sn => (
                  <div key={sn} className="flex justify-between items-center bg-muted/30 p-2 rounded border border-border">
                    <span className="text-[10px] font-mono font-bold truncate">{sn}</span>
                    <button onClick={() => {
                      const row = details[selectedRowIndex];
                      const next = (row.serialNumbers || []).filter(s => s !== sn);
                      handleDetailChange(selectedRowIndex, "serialNumbers", next);
                      handleDetailChange(selectedRowIndex, "quantity", next.length);
                    }} className="text-destructive"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BOTTOM FORM */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-xs font-bold uppercase">Order No.</Label><Input disabled={!canEditAll} value={headerData.orderNo} onChange={e => setHeaderData({ ...headerData, orderNo: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs font-bold uppercase">Invoice No.</Label><Input disabled={!canEditAll} value={headerData.invoiceNo} onChange={e => setHeaderData({ ...headerData, invoiceNo: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs font-bold uppercase">Remarks</Label><Textarea disabled={!canEditLimited} className="min-h-[100px]" value={headerData.remarks || ""} onChange={e => setHeaderData({ ...headerData, remarks: e.target.value })} /></div>
            </div>
            <div className="bg-background p-6 rounded-xl border border-primary/20 shadow-sm space-y-4">
              <div className="flex justify-between text-sm"><span>Gross Amount</span><span className="font-bold">₱{totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between text-sm"><span>Discount Amount</span><span className="font-bold text-destructive">-₱{totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              <div className="h-px bg-border"></div>
              <div className="flex justify-between items-center"><span className="font-black">Net Amount</span><span className="text-2xl font-black text-primary">₱{totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
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
    </Dialog>
  );
}
