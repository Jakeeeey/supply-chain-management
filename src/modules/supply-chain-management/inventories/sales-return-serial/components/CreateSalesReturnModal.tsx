"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Plus,
  Trash2,
  Save,
  ChevronDown,
  FileText,
  User,
  Calculator,
  CheckCircle,
  ScanLine,
  Loader2,
  List,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";

import {
  SalesReturnItem,
  API_LineDiscount,
  API_SalesReturnType,
  InvoiceOption,
  PriceTypeOption,
} from "../type";

// Import Child Modal
import { ProductLookupModal } from "./ProductLookupModal";
// Import Provider & Types
import {
  SalesReturnProvider,
  SalesmanOption,
  CustomerOption,
  BranchOption,
  Product,
} from "../providers/fetchProviders";
import { resolveFinalDiscount } from "../utils/discount-resolver";

import { useSearchParams } from "next/navigation";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateSalesReturnModal({ isOpen, onClose, onSuccess }: Props) {
  const searchParams = useSearchParams();
  const fromClearance = searchParams.get("fromClearance");
  // --- 1. FORM STATE ---
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [selectedSalesmanId, setSelectedSalesmanId] = useState("");
  const [salesmanCode, setSalesmanCode] = useState("");
  const [branchName, setBranchName] = useState("");

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerCode, setCustomerCode] = useState("");

  const [priceType, setPriceType] = useState("A");

  const [isThirdParty, setIsThirdParty] = useState(false);
  // Success Modal State
  const [isSuccessOpen, setSuccessOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI State for Validation
  const [returnTypeError, setReturnTypeError] = useState(false);
  const [orderError, setOrderError] = useState(false);
  const [invoiceError, setInvoiceError] = useState(false);

  // Bottom Form Fields
  const [orderNo, setOrderNo] = useState("");

  // INVOICE STATE
  const [invoiceNo, setInvoiceNo] = useState("");
  const [appliedInvoiceId, setAppliedInvoiceId] = useState<number | null>(null);
  const [remarks, setRemarks] = useState("");

  // --- 2. DATA LISTS ---
  const [salesmen, setSalesmen] = useState<SalesmanOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);

  const [lineDiscountOptions, setLineDiscountOptions] = useState<
    API_LineDiscount[]
  >([]);
  const [returnTypeOptions, setReturnTypeOptions] = useState<
    API_SalesReturnType[]
  >([]);
  const [priceTypeOptions, setPriceTypeOptions] = useState<PriceTypeOption[]>([]);

  // INVOICE DATA LIST & DROPDOWN STATE
  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceOption[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const invoiceWrapperRef = useRef<HTMLDivElement>(null);

  // ORDER NO DROPDOWN STATE
  const [orderSearch, setOrderSearch] = useState("");
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const orderWrapperRef = useRef<HTMLDivElement>(null);

  // --- SERIAL STATE ---
  const [isValidatingSerial, setIsValidatingSerial] = useState(false);
  const [serialInput, setSerialInput] = useState("");
  const [lastAddedSerial, setLastAddedSerial] = useState("");

  // --- 3. CART STATE ---
  const [items, setItems] = useState<SalesReturnItem[]>([]);
  const [isProductLookupOpen, setIsProductLookupOpen] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  // --- 4. SEARCHABLE DROPDOWN STATES ---
  const [isSalesmanOpen, setIsSalesmanOpen] = useState(false);
  const [salesmanSearch, setSalesmanSearch] = useState("");
  const salesmanWrapperRef = useRef<HTMLDivElement>(null);

  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const customerWrapperRef = useRef<HTMLDivElement>(null);

  /**
   * Resolves the correct unit price based on the selected salesman's priceType.
   */
  const resolvePrice = (product: SalesReturnItem | Record<string, unknown>, currentPriceType: string): number => {
    const key = `price${currentPriceType}`;
    const productRecord = product as Record<string, unknown>;
    const price = Number(productRecord[key]) || Number(productRecord.priceA) || Number(productRecord.unitPrice) || 0;
    return Math.round(price * 100) / 100;
  };

  // Effect to automatically update discounts when Customer changes
  useEffect(() => {
    if (items.length > 0 && customerCode) {
      const updateDiscounts = async () => {
        try {
          const catalog = await SalesReturnProvider.getFullCatalog(customerCode);

          setItems((prevItems) =>
            prevItems.map((item) => {
              const productInfo = catalog.products?.find((p: Product) => p.product_id === Number(item.productId));
              if (!productInfo) return item;

              const newDiscountType = resolveFinalDiscount(
                productInfo,
                customerCode,
                catalog
              );

              let newDiscountAmt = 0;
              if (newDiscountType) {
                const selectedOption = lineDiscountOptions.find(
                  (d) => d.id.toString() === newDiscountType?.toString(),
                );
                if (selectedOption) {
                  const percentage = parseFloat(selectedOption.total_percent) || 0;
                  newDiscountAmt = Math.round((item.grossAmount || 0) * (percentage / 100) * 100) / 100;
                }
              }

              return {
                ...item,
                discountType: newDiscountType,
                discountAmount: newDiscountAmt,
                totalAmount: Math.round(((item.grossAmount || 0) - newDiscountAmt) * 100) / 100,
              };
            })
          );
        } catch (error) {
          console.error("Failed to update discounts on customer change", error);
        }
      };
      updateDiscounts();
    }
  }, [customerCode, lineDiscountOptions]);

  const handleSelectSalesman = useCallback((salesman: SalesmanOption) => {
    setSelectedSalesmanId(salesman.id.toString());
    setSalesmanSearch(salesman.name);
    setSalesmanCode(salesman.code);
    setPriceType(salesman.priceType || "A");
    const linkedBranch = branches.find((b) => b.id === salesman.branchId);
    setBranchName(linkedBranch ? linkedBranch.name : "");
    setIsSalesmanOpen(false);
    setOrderNo("");
    setOrderSearch("");
    setInvoiceNo("");
    setInvoiceSearch("");
  }, [branches]);

  const handleSelectCustomer = useCallback((customer: CustomerOption) => {
    setSelectedCustomerId(customer.id.toString());
    setCustomerSearch(customer.name);
    setCustomerCode(customer.code || "");
    setIsCustomerOpen(false);
    setOrderNo("");
    setOrderSearch("");
    setInvoiceNo("");
    setInvoiceSearch("");
  }, []);

  /**
   * Manual Serial Entry Handler
   */
  const handleAddSerial = async () => {
    const serial = serialInput.trim();
    if (!serial) return;

    const selectedSalesmanObj = salesmen.find(
      (s) => s.id.toString() === selectedSalesmanId,
    );
    if (!selectedSalesmanObj) {
      toast.error("Please select a Salesman before adding serials.");
      return;
    }

    const branchId = selectedSalesmanObj.branchId;
    if (!branchId) {
      toast.error("The selected salesman has no branch assigned.");
      return;
    }

    if (selectedRowIndex === null) {
      toast.warning("Please select a product row from the table before adding serial.");
      return;
    }

    const selectedRow = items[selectedRowIndex];
    if (selectedRow?.unitOrder !== 3) {
      toast.error(`Serial entry is only allowed for Box units (Order 3).`);
      return;
    }

    setIsValidatingSerial(true);
    setLastAddedSerial(serial);

    try {
      // 1. Global Duplicate Check
      const dupCheck = await SalesReturnProvider.checkSerialDuplicate(serial);
      if (dupCheck.isDuplicate) {
        toast.error(`Serial "${serial}" already returned in SR #${dupCheck.returnNo}`);
        return;
      }

      // 2. Inventory Check
      const result = await SalesReturnProvider.checkSerialOnHand(serial, branchId);
      if (result?.isOnInventory) {
        toast.error("Already in Stock", {
          description: "This item is already in the branch's inventory.",
          duration: 5000,
        });
        return;
      }

      // 3. Local Duplicate Check
      if (items.some((i) => i.serialNumbers?.includes(serial))) {
        toast.warning("Serial already added in this session.");
        return;
      }

      // 4. Accept
      setItems((prev) => {
        const next = [...prev];
        const row = next[selectedRowIndex];
        if (!row) return prev;

        const newSerials = [...(row.serialNumbers || []), serial];
        const newQty = newSerials.length;
        
        const unitPrice = Number(row.unitPrice) || 0;
        const grossAmount = Math.round(unitPrice * newQty * 100) / 100;
        
        let discountAmt = 0;
        if (row.discountType) {
          const opt = lineDiscountOptions.find(d => d.id.toString() === row.discountType?.toString());
          if (opt) {
            const percentage = parseFloat(opt.total_percent) || 0;
            discountAmt = Math.round(grossAmount * (percentage / 100) * 100) / 100;
          }
        }

        next[selectedRowIndex] = {
          ...row,
          serialNumbers: newSerials,
          quantity: newQty,
          grossAmount,
          discountAmount: discountAmt,
          totalAmount: Math.round((grossAmount - discountAmt) * 100) / 100,
        };
        return next;
      });

      toast.success(`Serial accepted for ${items[selectedRowIndex].description}`);
      setSerialInput("");
    } catch (err: unknown) {
      console.error("Serial validation failed:", err);
      toast.error("Validation Failed", {
        description: (err as Error).message || "An unexpected error occurred.",
      });
    } finally {
      setIsValidatingSerial(false);
    }
  };

  const handleRemoveSerial = (rowIdx: number, serial: string) => {
    setItems((prev) => {
      const next = [...prev];
      const row = next[rowIdx];
      if (!row) return prev;

      const newSerials = (row.serialNumbers || []).filter(s => s !== serial);
      const newQty = newSerials.length;
      
      const unitPrice = Number(row.unitPrice) || 0;
      const grossAmount = Math.round(unitPrice * newQty * 100) / 100;
      
      let discountAmt = 0;
      if (row.discountType) {
        const opt = lineDiscountOptions.find(d => d.id.toString() === row.discountType?.toString());
        if (opt) {
          const percentage = parseFloat(opt.total_percent) || 0;
          discountAmt = Math.round(grossAmount * (percentage / 100) * 100) / 100;
        }
      }

      next[rowIdx] = {
        ...row,
        serialNumbers: newSerials,
        quantity: newQty,
        grossAmount,
        discountAmount: discountAmt,
        totalAmount: Math.round((grossAmount - discountAmt) * 100) / 100,
      };
      return next;
    });
  };

  // --- 5. INITIAL LOAD ---
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        try {
          const [
            salesmenData,
            customersData,
            branchesData,
            lineDiscountData,
            returnTypesData,
            priceTypesData,
          ] = await Promise.all([
            SalesReturnProvider.getFormSalesmen(),
            SalesReturnProvider.getFormCustomers(),
            SalesReturnProvider.getFormBranches(),
            SalesReturnProvider.getLineDiscounts(),
            SalesReturnProvider.getSalesReturnTypes(),
            SalesReturnProvider.getPriceTypes(),
          ]);
          setSalesmen(salesmenData);
          setCustomers(customersData);
          setBranches(branchesData);
          setLineDiscountOptions(lineDiscountData);
          setReturnTypeOptions(returnTypesData);
          setPriceTypeOptions(priceTypesData);
        } catch (error) {
          console.error("Failed to load form data", error);
        }
      };
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedSalesmanId && customerCode) {
      const fetchInv = async () => {
        try {
          const data = await SalesReturnProvider.getInvoiceReturnList(
            selectedSalesmanId,
            customerCode,
          );
          setInvoiceOptions(data);
        } catch (error) {
          console.error("Failed to fetch invoices", error);
          setInvoiceOptions([]);
        }
      };
      fetchInv();
    } else {
      setInvoiceOptions([]);
    }
  }, [selectedSalesmanId, customerCode]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (salesmanWrapperRef.current && !salesmanWrapperRef.current.contains(target)) {
        setIsSalesmanOpen(false);
        const found = salesmen.find((s) => s.id.toString() === selectedSalesmanId);
        if (found) setSalesmanSearch(found.name);
      }
      if (customerWrapperRef.current && !customerWrapperRef.current.contains(target)) {
        setIsCustomerOpen(false);
        const found = customers.find((c) => c.id.toString() === selectedCustomerId);
        if (found) setCustomerSearch(found.name);
      }
      if (invoiceWrapperRef.current && !invoiceWrapperRef.current.contains(target)) setIsInvoiceOpen(false);
      if (orderWrapperRef.current && !orderWrapperRef.current.contains(target)) setIsOrderOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedSalesmanId, salesmen, selectedCustomerId, customers]);

  const resetForm = () => {
    setItems([]);
    setReturnDate(new Date().toISOString().split("T")[0]);
    setSelectedSalesmanId("");
    setSalesmanSearch("");
    setSalesmanCode("");
    setSelectedCustomerId("");
    setCustomerSearch("");
    setCustomerCode("");
    setBranchName("");
    setPriceType("A");
    setRemarks("");
    setOrderNo("");
    setOrderSearch("");
    setInvoiceNo("");
    setInvoiceSearch("");
    setAppliedInvoiceId(null);
    setIsThirdParty(false);
    setInvoiceOptions([]);
    setSerialInput("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreateReturn = async () => {
    setReturnTypeError(false);
    setOrderError(false);
    setInvoiceError(false);

    if (!returnDate) { toast.error("Return Date is required."); return; }
    if (items.length === 0) { toast.error("Please add at least one product."); return; }
    if (!orderNo.trim()) { toast.error("Order No. is required."); setOrderError(true); return; }
    if (!invoiceNo.trim()) { toast.error("Invoice No. is required."); setInvoiceError(true); return; }

    const invalidItems = items.some((item) => !item.returnType || item.returnType === "");
    if (invalidItems) { toast.error("Please select a Return Type for all items."); setReturnTypeError(true); return; }

    try {
      setIsSubmitting(true);
      const selectedSalesmanObj = salesmen.find((s) => s.id.toString() === selectedSalesmanId);
      const branchId = selectedSalesmanObj ? selectedSalesmanObj.branchId : null;

      const payload = {
        invoiceNo,
        orderNo,
        customer: customerCode,
        salesmanId: selectedSalesmanId,
        salesmanCode: salesmanCode,
        branchId: branchId,
        isThirdParty,
        totalAmount: totalNet,
        returnDate,
        priceType,
        remarks,
        items: items,
        appliedInvoiceId: appliedInvoiceId ?? undefined,
      };

      await SalesReturnProvider.submitReturn(payload);
      setSuccessOpen(true);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to create Sales Return.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalize = () => {
    setSuccessOpen(false);
    if (onSuccess) onSuccess();
    handleClose();
  };

  const handleAddProducts = (newItems: Partial<SalesReturnItem>[]) => {
    setItems((prev) => {
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
            const opt = lineDiscountOptions.find((d) => d.id.toString() === existing.discountType?.toString());
            if (opt) existing.discountAmount = Math.round(existing.grossAmount * (parseFloat(opt.total_percent) / 100) * 100) / 100;
          }
          existing.totalAmount = Math.round((existing.grossAmount - existing.discountAmount) * 100) / 100;
        } else {
          const unitPrice = Math.round(Number(item.unitPrice || 0) * 100) / 100;
          const initialGross = Math.round(unitPrice * incomingQty * 100) / 100;
          let discAmt = 0;
          if (item.discountType) {
            const opt = lineDiscountOptions.find((d) => d.id.toString() === item.discountType?.toString());
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

  const totalNet = items.reduce((sum, i) => sum + i.totalAmount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-[95vw] lg:max-w-7xl h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-0 shadow-2xl rounded-xl [&>button]:hidden">
        {/* HEADER */}
        <div className="px-8 py-5 border-b border-border flex justify-between items-center bg-background shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                Create Sales Return (Serial)
              </DialogTitle>
              <p className="text-sm text-muted-foreground">Fill in the details to create a new record</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* MAIN BODY */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 bg-muted/20">
          {/* HEADER FORM */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 bg-background p-6 rounded-2xl border border-border shadow-sm">
            <div className="md:col-span-3 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Return Date</label>
              <Input type="date" className="h-11 bg-muted/30 border-border focus:ring-2 focus:ring-primary/20 transition-all" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
            </div>

            <div className="md:col-span-3 space-y-2 relative" ref={salesmanWrapperRef}>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Salesman</label>
              <div className="relative">
                <Input className="h-11 pl-10 bg-muted/30 border-border" placeholder="Select Salesman..." value={salesmanSearch} onChange={e => { setSalesmanSearch(e.target.value); setIsSalesmanOpen(true); }} onFocus={() => setIsSalesmanOpen(true)} />
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              {isSalesmanOpen && (
                <div className="absolute top-[calc(100%+8px)] left-0 w-full z-50 bg-background border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto p-1 animate-in fade-in zoom-in-95 duration-100">
                  {salesmen.filter(s => s.name.toLowerCase().includes(salesmanSearch.toLowerCase())).map(s => (
                    <div key={s.id} className="px-4 py-2.5 text-sm cursor-pointer hover:bg-primary/10 rounded-lg transition-colors flex justify-between items-center" onClick={() => handleSelectSalesman(s)}>
                      <span className="font-medium">{s.name}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold opacity-60">{s.code}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-4 space-y-2 relative" ref={customerWrapperRef}>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Customer</label>
              <div className="relative">
                <Input className="h-11 pl-10 bg-muted/30 border-border" placeholder="Select Customer..." value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setIsCustomerOpen(true); }} onFocus={() => setIsCustomerOpen(true)} />
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              {isCustomerOpen && (
                <div className="absolute top-[calc(100%+8px)] left-0 w-full z-50 bg-background border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto p-1 animate-in fade-in zoom-in-95 duration-100">
                  {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                    <div key={c.id} className="px-4 py-2.5 text-sm cursor-pointer hover:bg-primary/10 rounded-lg transition-colors flex justify-between items-center" onClick={() => handleSelectCustomer(c)}>
                      <span className="font-medium">{c.name}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold opacity-60">{c.code}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Price Type</label>
              <Select value={priceType} onValueChange={setPriceType}>
                <SelectTrigger className="h-11 bg-muted/30 border-border rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl border-border shadow-xl">
                  {priceTypeOptions.map(p => <SelectItem key={p.price_type_id} value={p.price_type_name}>{p.price_type_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* PRODUCT TABLE */}
          <div className="bg-background rounded-2xl border border-border shadow-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border bg-muted/10 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><List className="h-4 w-4 text-primary" /> Return Items</h3>
              <Button onClick={() => setIsProductLookupOpen(true)} variant="outline" size="sm" className="h-9 px-4 rounded-lg bg-background hover:bg-primary hover:text-white transition-all shadow-sm border-primary/20 text-primary">
                <Plus className="h-4 w-4 mr-2" /> Browse Catalog
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Product Details</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-24 text-center">Unit</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-24 text-center">Qty</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-32 text-right">Price</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-32 text-right">Total</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-48">Return Type</th>
                    <th className="px-4 py-4 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, idx) => (
                    <tr key={idx} className={cn("group transition-colors cursor-pointer", selectedRowIndex === idx ? "bg-primary/5" : "hover:bg-muted/10")} onClick={() => setSelectedRowIndex(idx)}>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-foreground leading-none">{item.description}</span>
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">{item.code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center"><Badge variant="outline" className="bg-muted/50 font-medium">{item.unit}</Badge></td>
                      <td className="px-6 py-5 text-center">
                        {item.unitOrder === 3 ? (
                          <div className="flex justify-center"><Badge className="bg-emerald-500 text-white font-bold h-7 px-3">{item.quantity}</Badge></div>
                        ) : (
                          <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                            <Input type="number" className="h-8 w-16 text-center text-xs font-bold bg-muted/20" value={item.quantity} onChange={e => {
                              const q = Number(e.target.value);
                              setItems(prev => {
                                const next = [...prev];
                                next[idx].quantity = q;
                                const gross = Math.round(q * next[idx].unitPrice * 100) / 100;
                                next[idx].grossAmount = gross;
                                let discAmt = 0;
                                if (next[idx].discountType) {
                                  const opt = lineDiscountOptions.find(d => d.id.toString() === next[idx].discountType?.toString());
                                  if (opt) discAmt = Math.round(gross * (parseFloat(opt.total_percent) / 100) * 100) / 100;
                                }
                                next[idx].discountAmount = discAmt;
                                next[idx].totalAmount = Math.round((gross - discAmt) * 100) / 100;
                                return next;
                              });
                            }} />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right font-mono text-xs">₱{item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-5 text-right font-bold text-primary font-mono">₱{item.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-5" onClick={e => e.stopPropagation()}>
                        <SearchableSelect value={item.returnType || ""} onValueChange={v => setItems(prev => { const n = [...prev]; n[idx].returnType = v; return n; })} options={returnTypeOptions.map(r => ({ value: r.type_name, label: r.type_name }))} className={cn("h-8 text-xs bg-muted/20", returnTypeError && !item.returnType && "border-destructive ring-1 ring-destructive/50")} />
                      </td>
                      <td className="px-4 py-5"><button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-20 text-center text-muted-foreground italic">
                        <div className="flex flex-col items-center gap-3">
                          <Package className="h-10 w-10 opacity-20" />
                          <p>No items added yet. Search from the catalog to begin.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SERIAL INPUT SECTION (Only shows when a Box unit is selected) */}
          {selectedRowIndex !== null && items[selectedRowIndex]?.unitOrder === 3 && (
            <div className="bg-background rounded-2xl border-2 border-primary/20 shadow-lg p-6 animate-in slide-in-from-bottom-4 duration-300">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                 <div>
                   <h4 className="text-lg font-black flex items-center gap-2 uppercase tracking-tight text-foreground">
                     <span className="bg-primary text-white p-1.5 rounded-lg text-[10px] font-black">SERIAL ENTRY</span> 
                     {items[selectedRowIndex].description}
                   </h4>
                   <p className="text-xs text-muted-foreground mt-0.5">Manually enter serial numbers for this product</p>
                 </div>
                 <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none min-w-[280px]">
                      <Input className="h-11 pl-10 pr-12 text-sm font-mono border-primary/30 focus:ring-primary/20" placeholder="Type serial and press Enter..." value={serialInput} onChange={e => setSerialInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddSerial()} disabled={isValidatingSerial} />
                      <ScanLine className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      {isValidatingSerial ? (
                        <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Plus className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-primary cursor-pointer hover:scale-110 transition-transform" onClick={handleAddSerial} />
                      )}
                    </div>
                    <Badge className="bg-primary hover:bg-primary h-11 px-6 rounded-xl text-xs font-black shadow-lg shadow-primary/20">
                      {items[selectedRowIndex].serialNumbers?.length || 0} TOTAL
                    </Badge>
                 </div>
               </div>

               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar p-1">
                 {(items[selectedRowIndex].serialNumbers || []).map((sn, snIdx) => (
                   <div key={snIdx} className="flex justify-between items-center bg-muted/40 px-3 py-2 rounded-xl border border-border group hover:border-primary/50 transition-all hover:bg-background hover:shadow-sm">
                     <span className="text-[10px] font-mono font-black truncate text-foreground">{sn}</span>
                     <button onClick={() => handleRemoveSerial(selectedRowIndex, sn)} className="text-muted-foreground hover:text-destructive transition-colors"><X className="h-3 w-3" /></button>
                   </div>
                 ))}
                 {(items[selectedRowIndex].serialNumbers || []).length === 0 && (
                   <div className="col-span-full py-4 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                     Wait for serial numbers to be entered...
                   </div>
                 )}
               </div>
            </div>
          )}

          {/* BOTTOM FORM */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-background p-6 rounded-2xl border border-border shadow-sm">
                 <div className="space-y-2 relative" ref={orderWrapperRef}>
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Order No. <span className="text-destructive">*</span></label>
                   <Input className={cn("h-11 bg-muted/30", orderError && !orderNo.trim() && "border-destructive ring-destructive/20 ring-2")} placeholder="Enter Order #" value={orderNo} onChange={e => { setOrderNo(e.target.value); setOrderSearch(e.target.value); setIsOrderOpen(true); }} onFocus={() => setIsOrderOpen(true)} />
                   {isOrderOpen && (
                     <div className="absolute bottom-[calc(100%+8px)] left-0 w-full z-50 bg-background border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto p-1">
                        {invoiceOptions.filter(inv => inv.order_id.toLowerCase().includes(orderSearch.toLowerCase())).map(inv => (
                          <div key={inv.order_id} className="px-4 py-2 text-xs cursor-pointer hover:bg-primary/10 rounded-lg flex justify-between items-center" onClick={() => { setOrderNo(inv.order_id); setOrderSearch(inv.order_id); setInvoiceNo(inv.invoice_no); setInvoiceSearch(inv.invoice_no); setAppliedInvoiceId(Number(inv.id)); setIsOrderOpen(false); }}>
                            <span className="font-bold">{inv.order_id}</span>
                            <Badge variant="outline" className="text-[9px] opacity-60">INV: {inv.invoice_no}</Badge>
                          </div>
                        ))}
                     </div>
                   )}
                 </div>
                 <div className="space-y-2 relative" ref={invoiceWrapperRef}>
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Invoice No. <span className="text-destructive">*</span></label>
                   <Input className={cn("h-11 bg-muted/30", invoiceError && !invoiceNo.trim() && "border-destructive ring-destructive/20 ring-2")} placeholder="Enter Invoice #" value={invoiceNo} onChange={e => { setInvoiceNo(e.target.value); setInvoiceSearch(e.target.value); setIsInvoiceOpen(true); }} onFocus={() => setIsInvoiceOpen(true)} />
                   {isInvoiceOpen && (
                     <div className="absolute bottom-[calc(100%+8px)] left-0 w-full z-50 bg-background border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto p-1">
                        {invoiceOptions.filter(inv => inv.invoice_no.toLowerCase().includes(invoiceSearch.toLowerCase())).map(inv => (
                          <div key={inv.invoice_no} className="px-4 py-2 text-xs cursor-pointer hover:bg-primary/10 rounded-lg flex justify-between items-center" onClick={() => { setInvoiceNo(inv.invoice_no); setInvoiceSearch(inv.invoice_no); setOrderNo(inv.order_id); setOrderSearch(inv.order_id); setAppliedInvoiceId(Number(inv.id)); setIsInvoiceOpen(false); }}>
                            <span className="font-bold">{inv.invoice_no}</span>
                            <Badge variant="outline" className="text-[9px] opacity-60">ORD: {inv.order_id}</Badge>
                          </div>
                        ))}
                     </div>
                   )}
                 </div>
               </div>
               <div className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Internal Remarks</label>
                 <Textarea placeholder="Add internal notes or instructions regarding this return..." className="min-h-[120px] bg-muted/30 border-border rounded-xl resize-none focus:ring-primary/20" value={remarks} onChange={e => setRemarks(e.target.value)} />
               </div>
            </div>

            <div className="space-y-6">
               <div className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-6">
                 <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-xl border border-border/50 cursor-pointer hover:bg-muted/80 transition-all" onClick={() => setIsThirdParty(!isThirdParty)}>
                   <Checkbox id="isThirdParty" checked={isThirdParty} onCheckedChange={v => setIsThirdParty(v === true)} />
                   <div className="grid gap-1.5 leading-none">
                     <label htmlFor="isThirdParty" className="text-sm font-bold leading-none cursor-pointer">Third Party Return</label>
                     <p className="text-[10px] text-muted-foreground">Check if returned from outside distributors</p>
                   </div>
                 </div>

                 <div className="pt-4 space-y-4">
                    <div className="flex justify-between items-center text-xs px-1">
                      <span className="text-muted-foreground font-medium uppercase tracking-wider">Subtotal Gross</span>
                      <span className="font-mono font-bold">₱{items.reduce((acc, i) => acc + i.grossAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs px-1">
                      <span className="text-muted-foreground font-medium uppercase tracking-wider">Total Discounts</span>
                      <span className="font-mono font-bold text-destructive">-₱{items.reduce((acc, i) => acc + i.discountAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-1">
                      <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Net Return Amount</div>
                      <div className="text-3xl font-black text-primary tracking-tighter">
                        ₱{totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                 </div>
               </div>

               <Button className="w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all group" onClick={handleCreateReturn} disabled={isSubmitting}>
                 {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Save className="h-6 w-6 mr-3 group-hover:rotate-12 transition-transform" /> Save Transaction</>}
               </Button>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-8 py-4 border-t border-border flex justify-between items-center bg-muted/5 shrink-0">
           <div className="flex items-center gap-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Branch: {branchName || "Not Selected"}</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> Items: {items.length}</div>
           </div>
           <Button variant="ghost" onClick={handleClose} className="font-bold text-muted-foreground hover:text-foreground">Cancel Transaction</Button>
        </div>
      </DialogContent>

      {/* Child Modals */}
      <ProductLookupModal isOpen={isProductLookupOpen} onClose={() => setIsProductLookupOpen(false)} onConfirm={handleAddProducts} priceType={priceType} customerCode={customerCode} />

      <Dialog open={isSuccessOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-md p-10 text-center rounded-3xl border-0 shadow-2xl animate-in zoom-in-95 duration-300">
           <div className="flex flex-col items-center gap-6">
              <div className="bg-emerald-100 text-emerald-600 p-6 rounded-full animate-bounce">
                <CheckCircle className="h-16 w-16" />
              </div>
              <div className="space-y-2">
                <DialogTitle className="text-3xl font-black text-foreground">Return Created!</DialogTitle>
                <p className="text-muted-foreground font-medium">The sales return record has been successfully saved to the system database.</p>
              </div>
              <Button onClick={handleFinalize} className="w-full h-14 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-lg shadow-emerald-200 transition-all active:scale-95">
                BACK TO HISTORY
              </Button>
           </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
