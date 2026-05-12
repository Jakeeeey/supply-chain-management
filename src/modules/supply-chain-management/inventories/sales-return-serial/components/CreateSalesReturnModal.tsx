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
} from "../types/sales-return.types";

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
import { resolveFinalDiscount } from "../services/sales-return.helpers";

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

  // LOADING STATES
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  // --- SERIAL STATE ---
  const [isValidatingSerial, setIsValidatingSerial] = useState(false);
  const [serialInput, setSerialInput] = useState("");
  const [lastAddedSerial, setLastAddedSerial] = useState("");

  // --- 3. CART STATE ---
  const [items, setItems] = useState<SalesReturnItem[]>([]);
  const [isProductLookupOpen, setIsProductLookupOpen] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  // --- 5. BRANCH LOCK STATE ---
  const [lockedBranchId, setLockedBranchId] = useState<number | null>(null);

  useEffect(() => {
    const hasSerials = items.some((i) => i.serialNumbers && i.serialNumbers.length > 0);
    if (!hasSerials) {
      setLockedBranchId(null);
    } else if (lockedBranchId === null && selectedSalesmanId) {
      const salesman = salesmen.find((s) => s.id.toString() === selectedSalesmanId);
      if (salesman && salesman.branchId) {
        setLockedBranchId(salesman.branchId);
      }
    }
  }, [items, selectedSalesmanId, salesmen, lockedBranchId]);

  const currentSalesmanObj = salesmen.find((s) => s.id.toString() === selectedSalesmanId);
  const currentBranchId = currentSalesmanObj?.branchId || null;
  const isBranchLockedError = lockedBranchId !== null && currentBranchId !== null && lockedBranchId !== currentBranchId;

  const handleClearItems = () => {
    setItems([]);
    setLockedBranchId(null);
    if (currentBranchId) {
      setLockedBranchId(currentBranchId);
    }
    toast.info("All items cleared. You may now add items for the new branch.");
  };

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
  }, [customerCode, lineDiscountOptions, items.length]);

  const handleSelectSalesman = useCallback((salesman: SalesmanOption) => {
    const hasSerials = items.some((i) => i.serialNumbers && i.serialNumbers.length > 0);
    if (hasSerials && lockedBranchId !== null && lockedBranchId !== salesman.branchId) {
      toast.error("Current items are not registered to this branch. Change to the appropriate Branch to proceed.", { duration: 5000 });
    }

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
  }, [items, lockedBranchId, branches]);

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
    const serial = serialInput.trim().toUpperCase();
    if (!serial) return;

    const selectedSalesmanObj = salesmen.find(s => s.id.toString() === selectedSalesmanId);
    if (!selectedSalesmanObj) {
      toast.error("Missing Salesman", { description: "Please select a Salesman before adding serials." });
      return;
    }

    const branchId = selectedSalesmanObj.branchId;
    if (!branchId) {
      toast.error("Branch Assignment", { description: "The selected salesman has no branch assigned." });
      return;
    }

    if (selectedRowIndex === null) {
      toast.warning("Selection Required", { description: "Please select a product row from the table before adding serial." });
      return;
    }

    const selectedRow = items[selectedRowIndex];
    if (!selectedRow) return;

    // 1. Session Check (Global within Modal)
    const isGlobalSessionDuplicate = items.some((item) => 
      item.serialNumbers?.some(sn => sn.toUpperCase() === serial)
    );
    if (isGlobalSessionDuplicate) {
      toast.error("Duplicate Serial", { description: `Serial "${serial}" is already added to this return session.` });
      return;
    }

    setIsValidatingSerial(true);
    setLastAddedSerial(serial);

    try {
      // 2. Database Check (Already Returned)
      const dupCheck = await SalesReturnProvider.checkSerialDuplicate(serial);
      if (dupCheck.isDuplicate) {
        setLastAddedSerial("");
        toast.error("Already Returned", { 
          description: `Serial "${serial}" was already returned in Transaction #${dupCheck.returnNo}` 
        });
        return;
      }

      // 3. Database Check (On-Hand / In Stock - Global)
      const finalBranchId = Number(branchId) || 0;
      const result = await SalesReturnProvider.checkSerialOnHand(serial, finalBranchId);
      if (result && result.isOnInventory) {
        setLastAddedSerial("");
        toast.error("Serial Number already in stock");
        return;
      }

      setItems((prev) => {
        // Final Session Check (Race Condition Protection)
        const exists = prev.some((item) => 
          item.serialNumbers?.some(sn => sn.toUpperCase() === serial)
        );
        if (exists) {
          toast.warning("Serial Number already added");
          return prev;
        }

        const next = [...prev];
        const row = next[selectedRowIndex];
        if (!row) return prev;

        const isSerialized = row.isSerialized === 1 || row.isSerialized === true;
        const newSerials = [...(row.serialNumbers || []), serial];
        const newQty = isSerialized ? newSerials.length : row.quantity;
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

      toast.success("Serial Added", { description: `Serial ${serial} successfully tagged for ${items[selectedRowIndex].description}` });
      setSerialInput("");
      setTimeout(() => setLastAddedSerial(""), 2000);
    } catch (err: unknown) {
      setLastAddedSerial("");
      toast.error("Validation Failed", { description: (err as Error).message || "An unexpected error occurred." });
    } finally {
      setIsValidatingSerial(false);
    }
  };

  // --- 5. INITIAL LOAD ---
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        setIsLoadingForm(true);
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
        } finally {
          setIsLoadingForm(false);
        }
      };
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (items.length > 0) {
      setItems((prevItems) =>
        prevItems.map((item) => {
          const basePrice = resolvePrice(item, priceType);
          const newUnitPrice = basePrice;
          const newGross = Math.round(item.quantity * newUnitPrice * 100) / 100;
          let newDiscountAmt = 0;
          if (item.discountType) {
            const selectedOption = lineDiscountOptions.find(
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
  }, [priceType, lineDiscountOptions, items.length]);

  useEffect(() => {
    if (isOpen && fromClearance === "true" && customers.length > 0) {
      const storedData = localStorage.getItem('scm_dispatch_return_data');
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          const foundCustomer = customers.find(c =>
            (data.customerCode && c.code === data.customerCode) ||
            (data.customerName && c.name === data.customerName)
          );
          if (foundCustomer) handleSelectCustomer(foundCustomer);
          const foundSalesman = salesmen.find(s =>
            (data.salesmanId && s.id === data.salesmanId) ||
            (data.salesmanCode && s.code === data.salesmanCode) ||
            (data.salesmanName && s.name === data.salesmanName)
          );
          if (foundSalesman) handleSelectSalesman(foundSalesman);
          setInvoiceNo(data.invoiceNo || "");
          setInvoiceSearch(data.invoiceNo || "");
          setOrderNo(data.orderNo || "");
          setOrderSearch(data.orderNo || "");
          setRemarks(data.remarks || "");
          if (data.branchName) setBranchName(data.branchName);
          localStorage.removeItem('scm_dispatch_return_data');
          const url = new URL(window.location.href);
          url.searchParams.delete('fromClearance');
          window.history.replaceState({}, '', url.toString());
        } catch (e) {
          console.error("Failed to parse clearance return data", e);
        }
      }
    }
  }, [isOpen, fromClearance, customers, salesmen, handleSelectCustomer, handleSelectSalesman]);

  useEffect(() => {
    if (selectedSalesmanId && customerCode) {
      const fetchInv = async () => {
        setIsLoadingInvoices(true);
        try {
          const data = await SalesReturnProvider.getInvoiceReturnList(
            selectedSalesmanId,
            customerCode,
          );
          setInvoiceOptions(data);
        } catch (error) {
          console.error("Failed to fetch invoices", error);
          setInvoiceOptions([]);
        } finally {
          setIsLoadingInvoices(false);
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
    setSerialInput("");
    setInvoiceOptions([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const filteredSalesmen = salesmen.filter((s) => s.name.toLowerCase().includes(salesmanSearch.toLowerCase()));
  const filteredCustomers = customers.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()));
  const filteredInvoices = invoiceOptions.filter((inv) => inv.invoice_no.toLowerCase().includes(invoiceSearch.toLowerCase()));
  const filteredOrders = invoiceOptions.filter((inv) => inv.order_id.toLowerCase().includes(orderSearch.toLowerCase()));

  const handleOpenProductLookup = () => {
    if (!returnDate) { toast.error("Please select a Return Date."); return; }
    if (!selectedSalesmanId) { toast.error("Please select a Salesman."); return; }
    if (!selectedCustomerId) { toast.error("Please select a Customer."); return; }
    setIsProductLookupOpen(true);
  };

  const handleCreateReturn = async () => {
    setReturnTypeError(false);
    setOrderError(false);
    setInvoiceError(false);

    if (!returnDate) { toast.error("Return Date is required."); return; }
    if (items.length === 0) { toast.error("Please add at least one product."); return; }
    if (isBranchLockedError) { toast.error("Invalid Branch."); return; }
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
      toast.success("Transaction Success", { description: "Sales return record has been successfully created." });
      setSuccessOpen(true);
    } catch (err: any) {
      console.error(err);
      toast.error("Submission Failed", { description: err.message || "An error occurred while creating the sales return." });
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
        const incomingQty = item.isSerialized ? 0 : (item.quantity || 1);

        if (existingIndex >= 0) {
          const existing = updated[existingIndex];
          if (!item.isSerialized) {
            existing.quantity += incomingQty;
          }
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
            isSerialized: item.isSerialized,
          } as SalesReturnItem);
        }
      });
      return updated;
    });
  };

  const handleItemChange = (index: number, field: keyof SalesReturnItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value } as SalesReturnItem;
      if (field === "quantity" || field === "unitPrice") {
        item.grossAmount = Math.round(item.quantity * item.unitPrice * 100) / 100;
        if (item.discountType) {
          const opt = lineDiscountOptions.find(d => d.id.toString() === item.discountType?.toString());
          if (opt) item.discountAmount = Math.round(item.grossAmount * (parseFloat(opt.total_percent) / 100) * 100) / 100;
        }
      }
      if (field === "discountType") {
        if (!value) { item.discountAmount = 0; }
        else {
          const opt = lineDiscountOptions.find(d => d.id.toString() === value.toString());
          if (opt) item.discountAmount = Math.round(item.grossAmount * (parseFloat(opt.total_percent) / 100) * 100) / 100;
        }
      }
      item.totalAmount = Math.round((item.grossAmount - item.discountAmount) * 100) / 100;
      updated[index] = item;
      return updated;
    });
  };

  const totalGross = Math.round(items.reduce((sum, i) => sum + (i.grossAmount || 0), 0) * 100) / 100;
  const totalDiscount = Math.round(items.reduce((sum, i) => sum + (i.discountAmount || 0), 0) * 100) / 100;
  const totalNet = Math.round(items.reduce((sum, i) => sum + i.totalAmount, 0) * 100) / 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-2 md:p-4 animate-in fade-in duration-300">
      <div className="bg-background w-full h-full md:max-w-[1300px] md:h-[95vh] md:rounded-xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/20 animate-in zoom-in-95 duration-300 ease-out">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-background">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg"><FileText className="h-5 w-5 text-primary" /></div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Create Sales Return</h2>
              <p className="text-xs text-muted-foreground">Fill in the details below to process a return</p>
            </div>
          </div>
          <button onClick={handleClose} className="bg-destructive hover:bg-destructive text-white p-2 rounded-md shadow-sm transition-all duration-200 active:scale-95 flex items-center justify-center"><X className="h-5 w-5" /></button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <div className="bg-background p-5 rounded-lg border border-border shadow-sm relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-lg"></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">
              <div className="space-y-1.5 relative" ref={salesmanWrapperRef}>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Salesman <span className="text-destructive">*</span></label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary" />
                  <input type="text" className="w-full h-9 border border-border rounded-md text-sm pl-9 pr-8 bg-background outline-none focus:ring-2 focus:border-primary shadow-sm" placeholder="Search Salesman..." value={salesmanSearch} onChange={e => { setSalesmanSearch(e.target.value); setIsSalesmanOpen(true); }} onFocus={() => setIsSalesmanOpen(true)} />
                  <ChevronDown className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {isSalesmanOpen && (
                  <div className="absolute top-[calc(100%+4px)] left-0 w-full z-20 bg-background border border-border rounded-md shadow-xl max-h-60 overflow-y-auto font-medium">
                    {filteredSalesmen.map(s => <div key={s.id} className="px-4 py-2.5 text-sm cursor-pointer hover:bg-primary/10 text-foreground" onClick={() => handleSelectSalesman(s)}>{s.name}</div>)}
                  </div>
                )}
              </div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Salesman Code</label><div className="h-9 w-full bg-muted/20 border border-border rounded-md px-3 flex items-center text-sm font-medium text-foreground italic shadow-sm">{salesmanCode || "-"}</div></div>
              <div className="space-y-1.5 relative" ref={customerWrapperRef}>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Customer <span className="text-destructive">*</span></label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary" />
                  <input type="text" className="w-full h-9 border border-border rounded-md text-sm pl-9 pr-8 bg-background outline-none focus:ring-2 focus:border-primary shadow-sm" placeholder="Search Customer..." value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setIsCustomerOpen(true); }} onFocus={() => setIsCustomerOpen(true)} />
                  <ChevronDown className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {isCustomerOpen && (
                  <div className="absolute top-[calc(100%+4px)] left-0 w-full z-20 bg-background border border-border rounded-md shadow-xl max-h-60 overflow-y-auto font-medium">
                    {filteredCustomers.map(c => <div key={c.id} className="px-4 py-2.5 text-sm cursor-pointer hover:bg-primary/10 text-foreground" onClick={() => handleSelectCustomer(c)}><div className="flex flex-col"><span>{c.name}</span><span className="text-[10px] text-muted-foreground font-mono">{c.code}</span></div></div>)}
                  </div>
                )}
              </div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Customer Code</label><div className="h-9 w-full bg-muted/20 border border-border rounded-md px-3 flex items-center text-sm font-medium text-foreground italic shadow-sm">{customerCode || "-"}</div></div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Branch</label><div className="h-9 w-full bg-muted/20 border border-border rounded-md px-3 flex items-center text-sm font-medium text-foreground italic shadow-sm">{branchName || "-"}</div></div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Return Date <span className="text-destructive">*</span></label><Input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="h-9 w-full bg-background border-border shadow-sm text-sm" /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Received Date</label><div className="h-9 w-full bg-muted/20 border border-border rounded-md px-3 flex items-center text-sm font-medium text-muted-foreground italic shadow-sm opacity-60">(Auto-generated)</div></div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Price Type <span className="text-destructive">*</span></label>
                <Select value={priceType} onValueChange={setPriceType}>
                  <SelectTrigger className="w-full h-9 border-border bg-background shadow-sm text-sm"><SelectValue placeholder="Select Price Type" /></SelectTrigger>
                  <SelectContent className="z-[200]">
                    {priceTypeOptions.map(pt => <SelectItem key={pt.price_type_id} value={pt.price_type_name}>Type {pt.price_type_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-2 col-span-2 lg:col-span-4 translate-y-2">
                <Checkbox id="create-isThirdParty" checked={isThirdParty} onCheckedChange={c => setIsThirdParty(c as boolean)} className="data-[state=checked]:bg-primary border-border" />
                <label htmlFor="create-isThirdParty" className="text-sm font-medium text-foreground cursor-pointer select-none">Third Party Transaction</label>
              </div>
            </div>
          </div>

          <div className="bg-background rounded-lg border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-5 py-4 bg-background border-b border-border">
              <h3 className="font-bold text-foreground flex items-center gap-2"><div className="bg-primary/10 p-1.5 rounded text-primary"><Calculator className="h-4 w-4" /></div>Products Summary</h3>
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={handleOpenProductLookup} className="bg-primary hover:bg-primary text-white shadow-primary/20 shadow-md h-9"><Plus className="h-4 w-4 mr-1.5" /> Add Product</Button>
                {isBranchLockedError && <Button size="sm" variant="destructive" onClick={handleClearItems} className="shadow-md h-9 gap-2">Clear All Items</Button>}
              </div>
            </div>
            <div className="overflow-x-auto relative pb-4">
              <table className="w-full text-sm text-left min-w-[1500px]">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-28">Code</th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">Description</th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-20">Unit</th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-28 text-center">Qty</th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-32 text-right">Unit Price</th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-32 text-right">Gross</th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-40">Disc. Type</th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-36 text-right">Disc. Amt</th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-40 text-right">Total</th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-48">Reason</th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-48">Return Type</th>
                    <th className="sticky right-0 z-10 px-2 py-3 w-12 bg-primary"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 ? (
                    <tr><td colSpan={12} className="px-6 py-16 text-center text-muted-foreground bg-muted/30"><div className="flex flex-col items-center gap-2"><FileText className="h-8 w-8 text-muted-foreground mb-1" /><p>No items added yet.</p><span className="text-xs">Click "Add Product" to browse catalog.</span></div></td></tr>
                  ) : items.map((item, idx) => (
                    <tr key={idx} onClick={() => setSelectedRowIndex(idx)} className={cn("hover:bg-muted/10 transition-colors duration-200 border-b border-border cursor-pointer group", selectedRowIndex === idx && "bg-primary/5 ring-1 ring-inset ring-primary/20")}>
                      <td className="px-4 py-2 font-mono text-sm text-foreground"><div className="flex items-center gap-2">{selectedRowIndex === idx ? <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)] animate-pulse" /> : <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />}<span>{item.code}</span></div></td>
                      <td className="px-4 py-2 text-foreground font-medium">{item.description}</td>
                      <td className="px-4 py-2"><Badge variant="outline" className="bg-background">{item.unit}</Badge></td>
                      <td className="px-4 py-2 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center gap-1">
                          {item.isSerialized === 1 || item.isSerialized === true ? (
                            <Badge variant="outline" className="font-bold min-w-[40px] flex justify-center border-primary/40 bg-primary/10 text-primary shadow-sm">{item.quantity}</Badge>
                          ) : (
                            <input 
                              type="number" 
                              className="w-16 h-8 text-center border border-border rounded bg-background text-sm font-bold focus:ring-1 focus:ring-primary outline-none"
                              value={item.quantity}
                              onChange={e => handleItemChange(idx, "quantity", Math.max(1, parseInt(e.target.value) || 0))}
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-sm whitespace-nowrap">₱{item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground font-mono text-sm whitespace-nowrap">₱{item.grossAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2" onClick={e => e.stopPropagation()}>
                        <Select value={item.discountType?.toString() || "none"} onValueChange={val => handleItemChange(idx, "discountType", val === "none" ? "" : val)}>
                          <SelectTrigger className="w-full h-8 px-2 text-sm border-border bg-background"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent className="z-[200]"><SelectItem value="none">None</SelectItem>{lineDiscountOptions.map(opt => <SelectItem key={opt.id} value={opt.id.toString()}>{opt.discount_type}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground font-mono text-sm whitespace-nowrap">₱{item.discountAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-right font-bold text-sm text-foreground whitespace-nowrap">₱{item.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2" onClick={e => e.stopPropagation()}><input type="text" placeholder="Enter reason" className="w-full border border-border rounded h-8 text-sm px-2 outline-none focus:border-primary" value={item.reason || ""} onChange={e => handleItemChange(idx, "reason", e.target.value)} /></td>
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <SearchableSelect value={item.returnType || ""} onValueChange={val => { handleItemChange(idx, "returnType", val); setReturnTypeError(false); }} options={returnTypeOptions.map(t => ({ value: t.type_name, label: t.type_name }))} placeholder="Select type" className={cn("h-8 text-sm px-2", returnTypeError && (!item.returnType || item.returnType === "") && "border-destructive ring-1 ring-destructive/30 bg-destructive/5 text-destructive")} />
                      </td>
                      <td className="sticky right-0 z-10 px-2 py-2 text-center bg-background border-l border-transparent group-hover:border-primary/20"><button onClick={e => { e.stopPropagation(); setItems(prev => prev.filter((_, i) => i !== idx)); if (selectedRowIndex === idx) setSelectedRowIndex(null); }} className="text-destructive/70 hover:text-destructive h-7 w-7 rounded-md flex items-center justify-center transition-colors"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selectedRowIndex !== null && items[selectedRowIndex] && (
            <div className="bg-background rounded-lg border-2 border-primary/20 shadow-md p-5 mb-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-foreground flex items-center gap-2 text-base"><div className="bg-emerald-500/10 p-1.5 rounded text-emerald-600"><ScanLine className="h-5 w-5" /></div>Serial Management for: <span className="text-primary underline decoration-primary/30 underline-offset-4">{items[selectedRowIndex].description}</span></h4>
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <Input className="h-9 w-64 pl-10 pr-10 text-sm font-mono border-primary/30 focus:ring-primary/20" placeholder="Type serial and press Enter..." value={serialInput} onChange={e => setSerialInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddSerial()} disabled={isValidatingSerial} />
                    <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    {isValidatingSerial ? <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" /> : <Plus className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary cursor-pointer" onClick={handleAddSerial} />}
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1 font-bold">{items[selectedRowIndex].serialNumbers?.length || 0} TOTAL</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-40 overflow-y-auto p-1">
                {(items[selectedRowIndex].serialNumbers || []).map(sn => (
                  <div key={sn} className="flex items-center justify-between bg-muted/20 border border-border px-3 py-2 rounded-md hover:border-primary/30 transition-all group hover:shadow-sm">
                    <span className="text-[10px] font-mono font-bold text-foreground truncate">{sn}</span>
                    <button onClick={() => {
                      setItems(prev => {
                        const next = [...prev];
                        const row = next[selectedRowIndex];
                        const newSerials = row.serialNumbers!.filter(s => s !== sn);
                        const isSerialized = row.isSerialized === 1 || row.isSerialized === true;
                        const newQty = isSerialized ? newSerials.length : row.quantity;
                        const gross = Math.round(row.unitPrice * newQty * 100) / 100;
                        let discAmt = 0;
                        if (row.discountType) {
                          const opt = lineDiscountOptions.find(d => d.id.toString() === row.discountType?.toString());
                          if (opt) discAmt = Math.round(gross * (parseFloat(opt.total_percent) / 100) * 100) / 100;
                        }
                        next[selectedRowIndex] = { 
                          ...row, 
                          serialNumbers: newSerials, 
                          quantity: newQty, 
                          grossAmount: gross, 
                          discountAmount: discAmt, 
                          totalAmount: Math.round((gross - discAmt) * 100) / 100 
                        };
                        return next;
                      });
                    }} className="p-1 text-destructive/50 hover:text-destructive transition-colors"><X className="h-3 w-3" /></button>
                  </div>
                ))}
                {(items[selectedRowIndex].serialNumbers || []).length === 0 && <div className="col-span-full py-8 text-center border border-dashed rounded-lg text-muted-foreground italic">No serial numbers entered yet.</div>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
            <div className="space-y-4 bg-background p-5 rounded-lg border border-border shadow-sm h-full">
              <h4 className="font-bold text-foreground text-sm mb-2">Additional Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5" ref={orderWrapperRef}>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Order No. <span className="text-destructive">*</span></label>
                  {isLoadingInvoices ? (
                    <div className="h-9 w-full bg-muted animate-pulse rounded-md border border-border"></div>
                  ) : (
                    <div className="relative group">
                      <input type="text" className={cn("w-full h-9 border rounded-md text-sm px-3 pr-8 bg-background outline-none transition-all shadow-sm", orderError ? "border-destructive bg-destructive/5 ring-1 ring-destructive" : "border-border focus:ring-2 focus:border-primary")} placeholder="Search Order No..." value={orderSearch || orderNo} onChange={e => { setOrderSearch(e.target.value); setOrderNo(e.target.value); setIsOrderOpen(true); }} onFocus={() => setIsOrderOpen(true)} />
                      <ChevronDown className="h-3 w-3 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      {isOrderOpen && (
                        <div className="absolute bottom-[calc(100%+4px)] left-0 w-full z-50 bg-background border border-border rounded-md shadow-xl max-h-48 overflow-y-auto divide-y">
                          <div className="px-3 py-2 text-xs font-medium cursor-pointer hover:bg-destructive/10 text-destructive flex items-center gap-2" onClick={() => { setOrderNo(""); setOrderSearch(""); setAppliedInvoiceId(null); setIsOrderOpen(false); }}><X className="h-3 w-3" /> Clear Selection</div>
                          {filteredOrders.map(inv => <div key={inv.id} className="px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 text-foreground" onClick={() => { setOrderNo(inv.order_id); setOrderSearch(inv.order_id); setInvoiceNo(inv.invoice_no); setInvoiceSearch(inv.invoice_no); setAppliedInvoiceId(Number(inv.id)); setIsOrderOpen(false); }}><div className="flex flex-col"><span className="font-medium">{inv.order_id}</span><span className="text-[10px] text-muted-foreground">Invoice: {inv.invoice_no}</span></div></div>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5" ref={invoiceWrapperRef}>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Invoice No. <span className="text-destructive">*</span></label>
                  {isLoadingInvoices ? (
                    <div className="h-9 w-full bg-muted animate-pulse rounded-md border border-border"></div>
                  ) : (
                    <div className="relative group">
                      <input type="text" className={cn("w-full h-9 border rounded-md text-sm px-3 pr-8 bg-background outline-none transition-all shadow-sm", invoiceError ? "border-destructive bg-destructive/5 ring-1 ring-destructive" : "border-border focus:ring-2 focus:border-primary")} placeholder="Search Invoice No..." value={invoiceSearch || invoiceNo} onChange={e => { setInvoiceSearch(e.target.value); setInvoiceNo(e.target.value); setIsInvoiceOpen(true); }} onFocus={() => setIsInvoiceOpen(true)} />
                      <ChevronDown className="h-3 w-3 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      {isInvoiceOpen && (
                        <div className="absolute bottom-[calc(100%+4px)] left-0 w-full z-50 bg-background border border-border rounded-md shadow-xl max-h-48 overflow-y-auto divide-y">
                          <div className="px-3 py-2 text-xs font-medium cursor-pointer hover:bg-destructive/10 text-destructive flex items-center gap-2" onClick={() => { setInvoiceNo(""); setInvoiceSearch(""); setAppliedInvoiceId(null); setIsInvoiceOpen(false); }}><X className="h-3 w-3" /> Clear Selection</div>
                          {filteredInvoices.map(inv => <div key={inv.id} className="px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 text-foreground" onClick={() => { setInvoiceNo(inv.invoice_no); setInvoiceSearch(inv.invoice_no); setAppliedInvoiceId(Number(inv.id)); setOrderNo(inv.order_id); setOrderSearch(inv.order_id); setIsInvoiceOpen(false); }}><div className="flex flex-col"><span className="font-medium">{inv.invoice_no}</span><span className="text-[10px] text-muted-foreground">Order: {inv.order_id}</span></div></div>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Remarks</label><Textarea value={remarks} onChange={e => setRemarks(e.target.value)} className="resize-none h-24 border-border focus:border-primary focus:bg-background" placeholder="Add any notes regarding this return..." /></div>
            </div>

            <div className="bg-background rounded-lg border border-border p-0 shadow-sm overflow-hidden h-fit">
              <div className="p-4 bg-muted/30 border-b border-border"><h4 className="font-bold text-foreground">Financial Summary</h4></div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center text-sm text-muted-foreground"><span>Total Gross Amount</span><span className="font-medium text-foreground tabular-nums">₱{totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between items-center text-sm text-destructive"><span>Total Discount</span><span className="font-medium tabular-nums">- ₱{totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                <div className="h-px bg-border my-2"></div>
                <div className="flex justify-between items-center"><span className="font-black text-foreground">Total Net Amount</span><span className="text-2xl font-black text-primary tabular-nums">₱{totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-background flex justify-between items-center">
          <Button variant="outline" onClick={handleClose} className="h-10 px-6 font-semibold border-border hover:bg-muted transition-colors">Cancel</Button>
          <div className="flex items-center gap-3">
            <Button onClick={handleCreateReturn} disabled={isSubmitting} className="h-11 px-10 bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2">{isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5" /> Process Sales Return</>}</Button>
          </div>
        </div>
      </div>

      <ProductLookupModal isOpen={isProductLookupOpen} onClose={() => setIsProductLookupOpen(false)} onConfirm={handleAddProducts} priceType={priceType} customerCode={customerCode} />

      <Dialog open={isSuccessOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-[400px] text-center p-8 bg-background border-border rounded-xl">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-emerald-100 dark:bg-emerald-500/10 p-4 rounded-full text-emerald-600 dark:text-emerald-400 animate-bounce"><CheckCircle className="h-12 w-12" /></div>
            <DialogTitle className="text-2xl font-bold text-foreground">Return Created!</DialogTitle>
            <p className="text-sm text-muted-foreground leading-relaxed">The sales return has been successfully recorded in the system inventory.</p>
            <Button onClick={handleFinalize} className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11 mt-2">Close & Finish</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
