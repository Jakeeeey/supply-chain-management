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
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

import {
  SalesReturnItem,
  API_LineDiscount,
  API_SalesReturnType,
  InvoiceOption,
  PriceTypeOption,
} from "../type";

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

// Import Child Modal
import { ProductLookupModal } from "./ProductLookupModal";
// Import Provider & Types
import {
  SalesReturnProvider,
  SalesmanOption,
  CustomerOption,
  BranchOption,
} from "../providers/fetchProviders";
// Import RFID Scanner Hook
import { useRfidScanner } from "../hooks/useRfidScanner";

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

  // --- RFID State ---
  const [rfidScanning, setRfidScanning] = useState(false);
  const [lastScannedRfid, setLastScannedRfid] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // --- 3. CART STATE ---
  const [items, setItems] = useState<SalesReturnItem[]>([]);
  const [isProductLookupOpen, setIsProductLookupOpen] = useState(false);

  // --- 5. BRANCH LOCK STATE ---
  const [lockedBranchId, setLockedBranchId] = useState<number | null>(null);

  useEffect(() => {
    const hasRfid = items.some((i) => i.rfidTags && i.rfidTags.length > 0);
    if (!hasRfid) {
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
    toast.info("All items cleared. You may now scan items for the new branch.");
  };

  // --- 4. SEARCHABLE DROPDOWN STATES ---
  const [isSalesmanOpen, setIsSalesmanOpen] = useState(false);
  const [salesmanSearch, setSalesmanSearch] = useState("");
  const salesmanWrapperRef = useRef<HTMLDivElement>(null);

  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const customerWrapperRef = useRef<HTMLDivElement>(null);

  // RFID Scanner Ref
  const rfidInputRef = useRef<HTMLInputElement>(null);

  /**
   * Resolves the correct unit price based on the selected salesman's priceType.
   * Falls back to priceA if the specific price type is not available.
   */
  const resolvePrice = (product: SalesReturnItem | Record<string, unknown>, currentPriceType: string): number => {
    const key = `price${currentPriceType}`;
    const productRecord = product as Record<string, unknown>;
    const price = Number(productRecord[key]) || Number(productRecord.priceA) || Number(productRecord.unitPrice) || 0;
    return Math.round(price * 100) / 100;
  };

  const handleSelectSalesman = useCallback((salesman: SalesmanOption) => {
    const hasRfid = items.some((i) => i.rfidTags && i.rfidTags.length > 0);
    if (hasRfid && lockedBranchId !== null && lockedBranchId !== salesman.branchId) {
      toast.error("Current items are not registered to this branch. Change to the appropriate Branch to proceed.", { duration: 5000 });
    }

    setSelectedSalesmanId(salesman.id.toString());
    setSalesmanSearch(salesman.name);
    setSalesmanCode(salesman.code);
    setPriceType(salesman.priceType || "A");
    const linkedBranch = branches.find((b) => b.id === salesman.branchId);
    setBranchName(linkedBranch ? linkedBranch.name : "");
    setIsSalesmanOpen(false);
    // Clear order/invoice on salesman change
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
    // Clear order/invoice on customer change
    setOrderNo("");
    setOrderSearch("");
    setInvoiceNo("");
    setInvoiceSearch("");
  }, []);

  /**
   * RFID Scan Handler — looks up the product and auto-adds to items table.
   */
  const handleRfidScan = async (tag: string) => {
    if (!tag.trim()) return;

    // Validate: must select salesman first (to know the branchId)
    const selectedSalesmanObj = salesmen.find(
      (s) => s.id.toString() === selectedSalesmanId,
    );
    if (!selectedSalesmanObj) {
      toast.error("Please select a Salesman before scanning RFID.");
      return;
    }

    const branchId = selectedSalesmanObj.branchId;
    if (!branchId) {
      toast.error("The selected salesman has no branch assigned.");
      return;
    }

    // Check for duplicate RFID already in items
    const isDuplicate = items.some(
      (item) => item.rfidTags && item.rfidTags.includes(tag),
    );
    if (isDuplicate) {
      toast.error(`RFID tag "${tag}" is already in the list.`);
      return;
    }

    setRfidScanning(true);
    setLastScannedRfid(tag);

    try {
      // 🟢 NEW: Global Duplicate Check
      const dupCheck = await SalesReturnProvider.checkRfidDuplicate(tag);
      if (dupCheck.isDuplicate) {
        const errorMsg = `RFID tag "${tag}" is already linked to SR #${dupCheck.returnNo}.`;
        toast.error(errorMsg, {
          description: "This tag cannot be returned again as it exists in another record.",
          duration: 6000,
        });
        return;
      }

      const result = await SalesReturnProvider.lookupRfid(tag, branchId);

      if (!result || !result.productId) {
        const errorMsg = `RFID tag "${tag}" is NOT registered to ${branchName || "this branch"}.`;
        toast.error(errorMsg, {
          description: "Please check if the scan is correct or if the item is in the wrong location.",
          duration: 5000,
        });
        return;
      }

      if (items.some((i) => i.rfidTags?.includes(tag))) {
        const errorMsg = `RFID tag "${tag}" is already in the list.`;
        toast.warning(errorMsg);
        return;
      }

      // Build item from lookup result
      const unitPrice = resolvePrice(result, priceType);
      const grossAmount = Math.round(unitPrice * 1 * 100) / 100;

      const newItem: SalesReturnItem = {
        id: `rfid-${tag}-${Date.now()}`,
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
        // 🟢 Store additional price info for recalculation
        priceA: result.priceA,
        priceB: result.priceB,
        priceC: result.priceC,
        priceD: result.priceD,
        priceE: result.priceE,
        unitMultiplier: result.unitMultiplier || 1,
      };

      setItems((prev) => [...prev, newItem]);
      toast.success(`Successfully scanned: ${result.productName}`, {
        description: `RFID: ${tag} | Registered to ${branchName}`,
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
    enabled: isOpen,
  });

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

  // 🟢 NEW: Effect to automatically update prices when Price Type changes
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
  // --- 5c. PRE-FILL FROM CLEARANCE ---
  useEffect(() => {
    if (isOpen && fromClearance === "true" && customers.length > 0) {
      const storedData = localStorage.getItem('scm_dispatch_return_data');
      if (storedData) {
        try {
          const data = JSON.parse(storedData);

          // 1. Find and set Customer (DO THIS FIRST as it clears other fields)
          const foundCustomer = customers.find(c =>
            (data.customerCode && c.code === data.customerCode) ||
            (data.customerName && c.name === data.customerName)
          );

          if (foundCustomer) {
            handleSelectCustomer(foundCustomer);
          } else {
            setCustomerCode(data.customerCode || "");
            setCustomerSearch(data.customerName || "");
          }

          // 1.5 Find and set Salesman
          const foundSalesman = salesmen.find(s =>
            (data.salesmanId && s.id === data.salesmanId) ||
            (data.salesmanCode && s.code === data.salesmanCode) ||
            (data.salesmanName && s.name === data.salesmanName)
          );
          if (foundSalesman) {
            handleSelectSalesman(foundSalesman);
          } else {
            setSelectedSalesmanId(data.salesmanId || "");
            setSalesmanCode(data.salesmanCode || "");
            setSalesmanSearch(data.salesmanName || "");
          }

          // 2. Set Invoice & Order
          setInvoiceNo(data.invoiceNo || "");
          setInvoiceSearch(data.invoiceNo || "");
          setOrderNo(data.orderNo || "");
          setOrderSearch(data.orderNo || "");
          setRemarks(data.remarks || "");

          // 2.5 Set Branch (Override if foundSalesman sets it)
          if (data.branchName) {
            setBranchName(data.branchName);
          }

          // 4. Cleanup to prevent re-triggering
          localStorage.removeItem('scm_dispatch_return_data');
          // Clear query param from URL without reloading
          const url = new URL(window.location.href);
          url.searchParams.delete('fromClearance');
          window.history.replaceState({}, '', url.toString());
        } catch (e) {
          console.error("Failed to parse clearance return data", e);
        }
      }
    }
  }, [isOpen, fromClearance, customers, salesmen, handleSelectCustomer, handleSelectSalesman]);

  // --- 5b. FETCH INVOICES when salesman or customer changes ---
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
  }, [selectedSalesmanId, customerCode, handleSelectSalesman, handleSelectCustomer]);

  // --- 6. CLICK OUTSIDE HANDLERS ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      // Salesman
      if (
        salesmanWrapperRef.current &&
        !salesmanWrapperRef.current.contains(target)
      ) {
        setIsSalesmanOpen(false);
        const found = salesmen.find(
          (s) => s.id.toString() === selectedSalesmanId,
        );
        if (found) setSalesmanSearch(found.name);
      }

      // Customer
      if (
        customerWrapperRef.current &&
        !customerWrapperRef.current.contains(target)
      ) {
        setIsCustomerOpen(false);
        const found = customers.find(
          (c) => c.id.toString() === selectedCustomerId,
        );
        if (found) setCustomerSearch(found.name);
      }

      // Invoice
      if (
        invoiceWrapperRef.current &&
        !invoiceWrapperRef.current.contains(target)
      ) {
        setIsInvoiceOpen(false);
      }

      // Order No
      if (
        orderWrapperRef.current &&
        !orderWrapperRef.current.contains(target)
      ) {
        setIsOrderOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedSalesmanId, salesmen, selectedCustomerId, customers]);

  // --- RESET FUNCTION ---
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
    setLastScannedRfid("");
    setRfidScanning(false);
    setInvoiceOptions([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // --- 7. FILTERING & SELECTION ---
  const filteredSalesmen = salesmen.filter((s) =>
    s.name.toLowerCase().includes(salesmanSearch.toLowerCase()),
  );
  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()),
  );

  const filteredInvoices = invoiceOptions.filter((inv) =>
    inv.invoice_no.toLowerCase().includes(invoiceSearch.toLowerCase()),
  );

  const filteredOrders = invoiceOptions.filter((inv) =>
    inv.order_id.toLowerCase().includes(orderSearch.toLowerCase()),
  );



  // --- 8. VALIDATION & ACTIONS ---
  const handleOpenProductLookup = () => {
    if (!returnDate) {
      toast.error("Please select a Return Date before adding products.");
      return;
    }
    if (!selectedSalesmanId) {
      toast.error("Please select a Salesman before adding products.");
      return;
    }
    if (!selectedCustomerId) {
      toast.error("Please select a Customer before adding products.");
      return;
    }
    setIsProductLookupOpen(true);
  };

  const handleCreateReturn = async () => {
    setReturnTypeError(false);
    setOrderError(false);
    setInvoiceError(false);

    if (!returnDate) {
      toast.error("Return Date is required.");
      return;
    }
    if (items.length === 0) {
      toast.error("Please add at least one product.");
      return;
    }

    if (isBranchLockedError) {
      toast.error("Invalid Branch: Clear the products or revert the salesman to proceed.");
      return;
    }

    // 🟢 REVISION: Added Validation for Order No.
    if (!orderNo.trim()) {
      toast.error("Order No. is required.");
      setOrderError(true);
      return;
    }

    if (!invoiceNo.trim()) {
      toast.error("Invoice No. is required.");
      setInvoiceError(true);
      return;
    }

    const invalidItems = items.some(
      (item) => !item.returnType || item.returnType === "",
    );

    if (invalidItems) {
      toast.error("Please select a Return Type for all items.");
      setReturnTypeError(true);
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedSalesmanObj = salesmen.find(
        (s) => s.id.toString() === selectedSalesmanId,
      );
      const branchId = selectedSalesmanObj
        ? selectedSalesmanObj.branchId
        : null;

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

  // --- 9. ITEM LOGIC ---
  const handleAddProducts = (newItems: Partial<SalesReturnItem>[]) => {
    setItems((prev) => {
      const updated = [...prev];
      newItems.forEach((item) => {
        const rawId = item.product_id || item.productId || item.id;
        const productId = Number(rawId);

        // Strict mapping for unit checking to prevent different UOMs from merging
        const isRfidItem = !!item.rfidTags && item.rfidTags.length > 0;
        const existingIndex = updated.findIndex(
          (i) => {
            const existingIsRfid = !!i.rfidTags && i.rfidTags.length > 0;
            return i.productId === productId && i.unit === item.unit && i.unitPrice === Number(item.unitPrice) && existingIsRfid === isRfidItem;
          }
        );
        const qty = item.quantity || 1;

        if (existingIndex >= 0) {
          const existing = updated[existingIndex];
          existing.quantity += qty;
          existing.grossAmount = Math.round(existing.quantity * existing.unitPrice * 100) / 100;

          if (existing.discountType) {
            const selectedOption = lineDiscountOptions.find(
              (d) => d.id.toString() === existing.discountType?.toString(),
            );
            if (selectedOption) {
              const percentage = parseFloat(selectedOption.total_percent) || 0;
              existing.discountAmount = Math.round((existing.grossAmount || 0) * (percentage / 100) * 100) / 100;
            }
          }

          existing.totalAmount = Math.round(((existing.grossAmount || 0) - (existing.discountAmount || 0)) * 100) / 100;
          if (item.rfidTags) {
            existing.rfidTags = [...(existing.rfidTags || []), ...item.rfidTags];
          }
        } else {
          updated.push({
            ...item,
            productId,
            product_id: productId,
            code: item.code || "N/A",
            description: item.description || "Unknown Item",
            unit: item.unit || "Pcs",
            quantity: qty,
            unitPrice: Math.round(Number(item.unitPrice || 0) * 100) / 100,
            grossAmount: Math.round((item.unitPrice || 0) * qty * 100) / 100,
            discountType: "",
            discountAmount: 0,
            totalAmount: Math.round((item.unitPrice || 0) * qty * 100) / 100,
            reason: "",
            returnType: "",
          } as SalesReturnItem);
        }
      });
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof SalesReturnItem,
    value: string | number | null,
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value } as SalesReturnItem;

      if (field === "quantity" || field === "unitPrice") {
        item.grossAmount = Math.round(item.quantity * item.unitPrice * 100) / 100;
        if (item.discountType) {
          const selectedOption = lineDiscountOptions.find(
            (d) => d.id.toString() === item.discountType?.toString(),
          );
          if (selectedOption) {
            const percentage = parseFloat(selectedOption.total_percent) || 0;
            item.discountAmount = Math.round((item.grossAmount || 0) * (percentage / 100) * 100) / 100;
          }
        }
      }

      if (field === "discountType") {
        if (value === "" || value === null) {
          item.discountAmount = 0;
        } else {
          const selectedOption = lineDiscountOptions.find(
            (d) => d.id.toString() === value.toString(),
          );
          if (selectedOption) {
            const percentage = parseFloat(selectedOption.total_percent) || 0;
            item.discountAmount = Math.round((item.grossAmount || 0) * (percentage / 100) * 100) / 100;
          }
        }
      }

      item.totalAmount = Math.round(((item.grossAmount || 0) - (item.discountAmount || 0)) * 100) / 100;
      updated[index] = item;
      return updated;
    });
  };

  // --- 10. CALCULATIONS ---
  const totalGross = Math.round(items.reduce(
    (sum, item) => sum + (item.grossAmount || 0),
    0,
  ) * 100) / 100;
  const totalDiscount = Math.round(items.reduce(
    (sum, item) => sum + (item.discountAmount || 0),
    0,
  ) * 100) / 100;
  const totalNet = Math.round(items.reduce((sum, item) => sum + item.totalAmount, 0) * 100) / 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-2 md:p-4 animate-in fade-in duration-300">
      <div className="bg-background w-full h-full md:max-w-[1300px] md:h-[95vh] md:rounded-xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/20 animate-in zoom-in-95 duration-300 ease-out">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-background">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Create Sales Return
              </h2>
              <p className="text-xs text-muted-foreground">
                Fill in the details below to process a return
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="bg-destructive hover:bg-destructive text-white p-2 rounded-md shadow-sm transition-all duration-200 active:scale-95 flex items-center justify-center"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* 1. PRIMARY DETAILS */}
          {/* ... (Same UI Code as before) ... */}
          {/* COL 1: Salesman, COL 2: Customer, COL 3: Date & Price */}
          <div className="bg-background p-5 rounded-lg border border-border shadow-sm relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-lg"></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">

              {/* Salesman */}
              <div className="space-y-1.5 relative" ref={salesmanWrapperRef}>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide truncate block">
                  Salesman <span className="text-destructive">*</span>
                </label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary" />
                  <input
                    type="text"
                    className="w-full h-9 border border-border rounded-md text-sm pl-9 pr-8 bg-background outline-none focus:ring-2 focus:border-primary shadow-sm"
                    placeholder="Search Salesman..."
                    value={salesmanSearch}
                    onChange={(e) => {
                      setSalesmanSearch(e.target.value);
                      setIsSalesmanOpen(true);
                      setSelectedSalesmanId("");
                      setSalesmanCode("");
                      setBranchName("");
                    }}
                    onFocus={() => {
                      setIsSalesmanOpen(true);
                      setSalesmanSearch("");
                    }}
                  />
                  <ChevronDown className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {isSalesmanOpen && (
                  <div className="absolute top-[calc(100%+4px)] left-0 w-full z-20 bg-background border border-border rounded-md shadow-xl max-h-60 overflow-y-auto font-medium">
                    {filteredSalesmen.map((s) => (
                      <div
                        key={s.id}
                        className="px-4 py-2.5 text-sm cursor-pointer hover:bg-primary/10 text-foreground"
                        onClick={() => handleSelectSalesman(s)}
                      >
                        {s.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Salesman Code */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide truncate block">
                  Salesman Code
                </label>
                <div className="h-9 w-full bg-muted/20 border border-border rounded-md px-3 flex items-center text-sm font-medium text-foreground italic shadow-sm">
                  {salesmanCode || "-"}
                </div>
              </div>

              {/* Customer */}
              <div className="space-y-1.5 relative" ref={customerWrapperRef}>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide truncate block">
                  Customer <span className="text-destructive">*</span>
                </label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary" />
                  <input
                    type="text"
                    className="w-full h-9 border border-border rounded-md text-sm pl-9 pr-8 bg-background outline-none focus:ring-2 focus:border-primary shadow-sm"
                    placeholder="Search Customer..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setIsCustomerOpen(true);
                    }}
                    onFocus={() => {
                      setIsCustomerOpen(true);
                      setCustomerSearch("");
                    }}
                  />
                  <ChevronDown className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {isCustomerOpen && (
                  <div className="absolute top-[calc(100%+4px)] left-0 w-full z-20 bg-background border border-border rounded-md shadow-xl max-h-60 overflow-y-auto font-medium">
                    {filteredCustomers.map((c) => (
                      <div
                        key={c.id}
                        className="px-4 py-2.5 text-sm cursor-pointer hover:bg-primary/10 text-foreground"
                        onClick={() => handleSelectCustomer(c)}
                      >
                        <div className="flex flex-col">
                          <span>{c.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {c.code}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Code */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide truncate block">
                  Customer Code
                </label>
                <div className="h-9 w-full bg-muted/20 border border-border rounded-md px-3 flex items-center text-sm font-medium text-foreground italic shadow-sm">
                  {customerCode || "-"}
                </div>
              </div>

              {/* ROW 2 */}
              {/* Branch */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide truncate block">
                  Branch
                </label>
                <div className="h-9 w-full bg-muted/20 border border-border rounded-md px-3 flex items-center text-sm font-medium text-foreground italic shadow-sm">
                  {branchName || "-"}
                </div>
              </div>

              {/* Return Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide truncate block">
                  Return Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="h-9 w-full bg-background border-border shadow-sm text-sm"
                />
              </div>

              {/* Received Date Placeholder */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide truncate block">
                  Received Date
                </label>
                <div className="h-9 w-full bg-muted/20 border border-border rounded-md px-3 flex items-center text-sm font-medium text-muted-foreground italic shadow-sm opacity-60">
                  (Auto-generated)
                </div>
              </div>

              {/* Price Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide truncate block">
                  Price Type <span className="text-destructive">*</span>
                </label>
                <Select value={priceType} onValueChange={(val) => setPriceType(val)}>
                  <SelectTrigger className="w-full h-9 border-border bg-background shadow-sm text-sm">
                    <SelectValue placeholder="Select Price Type" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {priceTypeOptions.length > 0 ? (
                      priceTypeOptions.map((pt) => (
                        <SelectItem key={pt.price_type_id} value={pt.price_type_name}>
                          Type {pt.price_type_name}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="A">Type A</SelectItem>
                        <SelectItem value="B">Type B</SelectItem>
                        <SelectItem value="C">Type C</SelectItem>
                        <SelectItem value="D">Type D</SelectItem>
                        <SelectItem value="E">Type E</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Third Party Checkbox */}
              <div className="flex items-center space-x-2 pt-2 col-span-2 lg:col-span-4 translate-y-2">
                <Checkbox
                  id="create-rfid-isThirdParty"
                  checked={isThirdParty}
                  onCheckedChange={(c) => setIsThirdParty(c as boolean)}
                  className="data-[state=checked]:bg-primary border-border"
                />
                <label
                  htmlFor="create-rfid-isThirdParty"
                  className="text-sm font-medium text-foreground cursor-pointer select-none"
                >
                  Third Party Transaction
                </label>
              </div>

            </div>
          </div>

          {/* 2. PRODUCT TABLE (UNCHANGED) */}
          {/* ... keeping your existing product table component ... */}
          <div className="bg-background rounded-lg border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-5 py-4 bg-background border-b border-border">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <div className="bg-primary/10 p-1.5 rounded text-primary">
                  <Calculator className="h-4 w-4" />
                </div>
                Products Summary
              </h3>
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
                      disabled={rfidScanning}
                    />
                    {/* Visible read-only display */}
                    <div
                      className={`pl-9 pr-3 h-9 w-52 text-xs border border-border rounded-md font-mono flex items-center cursor-pointer select-none transition-all ${rfidScanning
                          ? "bg-primary/10 text-primary animate-pulse"
                          : lastScannedRfid
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300"
                            : "bg-muted/30 text-muted-foreground hover:border-primary/30"
                        }`}
                      onClick={() => rfidInputRef.current?.focus()}
                    >
                      {rfidScanning
                        ? "Looking up..."
                        : lastScannedRfid
                          ? `✓ ${lastScannedRfid.slice(0, 16)}...`
                          : items.filter((i) => i.rfidTags && i.rfidTags.length > 0).length > 0
                            ? `${items.filter((i) => i.rfidTags && i.rfidTags.length > 0).length} RFID items`
                            : "Scan RFID..."}
                    </div>
                  </div>
                </div>
                {isBranchLockedError && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleClearItems}
                    className="shadow-md h-9 gap-2"
                  >
                    Clear All Items
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleOpenProductLookup}
                  className="bg-primary hover:bg-primary text-white shadow-primary/20 shadow-md h-9"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Add Product
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto relative pb-4">
              <table className="w-full text-sm text-left min-w-[1500px]">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-28">
                      Code
                    </th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-20">
                      Unit
                    </th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-28 text-center">
                      Qty
                    </th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-32 text-right">
                      Price
                    </th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-32 text-right">
                      Gross
                    </th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-40">
                      Disc. Type
                    </th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-36 text-right">
                      Disc. Amt
                    </th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-40 text-right">
                      Total
                    </th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-48">
                      Reason
                    </th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-48">
                      Return Type
                    </th>
                    <th className="sticky right-0 z-10 px-2 py-3 w-12 bg-primary"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-6 py-16 text-center text-muted-foreground bg-muted/30">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-8 w-8 text-muted-foreground mb-1" />
                          <p>No items added yet.</p>
                          <span className="text-xs">
                            Click &quot;Add Product&quot; to browse catalog.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {/* 1. RENDER MANUAL ITEMS (No RFID) */}
                      {items.map((item, idx) => {
                        const isManual = !item.rfidTags || item.rfidTags.length === 0;
                        if (!isManual) return null;
                        return (
                          <tr key={idx} className="hover:bg-muted/20 transition-colors duration-200 border-b border-border">
                            <td className="px-4 py-2 font-mono text-sm text-foreground font-bold">
                              {item.code}
                            </td>
                            <td className="px-4 py-2 text-foreground">
                              <div className="text-sm text-foreground font-medium" title={item.description}>
                                {item.description}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <span className="bg-background text-foreground px-2 py-0.5 rounded text-sm border border-border">
                                {item.unit}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <input
                                type="number"
                                min="1"
                                className="w-full text-center border border-border rounded h-8 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-sm whitespace-nowrap">
                              ₱{item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground font-mono text-sm whitespace-nowrap">
                              ₱{(item.grossAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2">
                              <Select
                                value={item.discountType?.toString() || "none"}
                                onValueChange={(val) => handleItemChange(idx, "discountType", val === "none" ? "" : val)}
                              >
                                <SelectTrigger className="w-full h-8 px-2 text-sm border-border bg-background focus:ring-1 focus:ring-primary">
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent className="z-[200]">
                                  <SelectItem value="none">None</SelectItem>
                                  {lineDiscountOptions.map((opt) => (
                                    <SelectItem key={opt.id} value={opt.id.toString()}>
                                      {opt.discount_type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                readOnly
                                disabled
                                className="w-full text-right border border-border bg-muted/30 text-muted-foreground rounded h-8 text-sm outline-none cursor-not-allowed"
                                value={item.discountAmount ? Number(item.discountAmount).toFixed(2) : ""}
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-sm text-foreground whitespace-nowrap">
                              ₱{item.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                placeholder="Enter reason"
                                className="w-full border border-border rounded h-8 text-sm px-2 outline-none focus:border-primary"
                                value={item.reason || ""}
                                onChange={(e) => handleItemChange(idx, "reason", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Select
                                value={item.returnType || ""}
                                onValueChange={(val) => { handleItemChange(idx, "returnType", val); setReturnTypeError(false); }}
                              >
                                <SelectTrigger
                                  className={`w-full h-8 px-2 text-sm transition-colors [&>span]:truncate ${returnTypeError && (!item.returnType || item.returnType === "")
                                      ? "border-destructive ring-1 ring-destructive/30 bg-destructive/5 text-destructive"
                                      : "border-border bg-background focus:ring-1 focus:ring-primary"
                                    }`}
                                >
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent className="z-[200]">
                                  {returnTypeOptions.length > 0 ? (
                                    returnTypeOptions.map((type) => (
                                      <SelectItem key={type.type_id} value={type.type_name}>
                                        {type.type_name}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <>
                                      <SelectItem value="Good Order">Good Order</SelectItem>
                                      <SelectItem value="Bad Order">Bad Order</SelectItem>
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="sticky right-0 z-10 px-2 py-2 text-center bg-background border-l border-transparent group-hover:border-primary/20">
                              <button
                                onClick={() => handleRemoveItem(idx)}
                                className="text-destructive/70 hover:text-destructive h-7 w-7 rounded-md flex items-center justify-center transition-colors"
                                title="Remove Item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {/* 2. RENDER RFID ITEMS (Grouped) */}
                      {Object.values(
                        items.filter(i => i.rfidTags && i.rfidTags.length > 0).reduce((acc, item) => {
                          const idx = items.findIndex(d => d === item);
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
                          <tr className="bg-muted/10 font-semibold border-b border-border">
                            <td className="px-4 py-2 font-mono text-sm text-foreground">
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
                            </td>
                            <td className="px-4 py-2 text-foreground">
                              <div className="text-sm text-foreground font-medium" title={group.description}>
                                {group.description}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <span className="bg-background text-foreground px-2 py-0.5 rounded text-sm border border-border font-normal">
                                {group.unit}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center text-primary text-sm font-bold">
                              {group.totalQty}
                            </td>
                            <td className="px-4 py-2 text-right text-muted-foreground">
                              -
                            </td>
                            <td className="px-4 py-2 text-right text-muted-foreground font-mono text-sm">
                              ₱{group.totalGross.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-center text-muted-foreground">
                              -
                            </td>
                            <td className="px-4 py-2 text-right text-muted-foreground font-mono text-sm">
                              ₱{group.totalDiscount.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-right font-bold text-primary text-sm">
                              ₱{group.totalNet.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-center text-muted-foreground">
                              -
                            </td>
                            <td className="px-4 py-2">
                              {group.returnType !== "Unassigned" ? (
                                <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-medium">
                                  {group.returnType}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/60 italic text-xs">Unassigned</span>
                              )}
                            </td>
                            <td></td>
                          </tr>

                          {/* Child Rows (Individual Scans/Additions) */}
                          {expandedGroups[group.key] && group.children.map(({ item, idx }: { item: SalesReturnItem, idx: number }) => (
                            <tr key={item.id || idx} className="hover:bg-muted/20 transition-colors duration-200 border-b border-border">
                              <td className="px-4 py-2 font-mono text-sm text-foreground font-bold pl-10" colSpan={2}>
                                {item.rfidTags && item.rfidTags.length > 0 ? (
                                  <div className="flex items-center gap-1.5 bg-background border border-border pl-2.5 pr-2 py-1 rounded-md w-fit truncate max-w-[200px]" title={item.rfidTags[0]}>
                                    <span className="text-primary truncate">{item.rfidTags[0]}</span>
                                    <span className="text-[10px] text-muted-foreground font-sans uppercase">RFID</span>
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-4 py-2"></td>
                              <td className="px-4 py-2">
                                <div className="text-center font-semibold text-sm">{item.quantity}</div>
                              </td>
                              <td className="px-4 py-2 text-right text-sm">
                                ₱{item.unitPrice.toLocaleString()}
                              </td>
                              <td className="px-4 py-2 text-right text-muted-foreground font-mono text-sm">
                                ₱{(item.grossAmount || 0).toLocaleString()}
                              </td>
                              <td className="px-4 py-2">
                                <Select
                                  value={item.discountType?.toString() || "none"}
                                  onValueChange={(val) => handleItemChange(idx, "discountType", val === "none" ? "" : val)}
                                >
                                  <SelectTrigger className="w-full h-8 px-2 text-sm border-border bg-background focus:ring-1 focus:ring-primary">
                                    <SelectValue placeholder="None" />
                                  </SelectTrigger>
                                  <SelectContent className="z-[200]">
                                    <SelectItem value="none">None</SelectItem>
                                    {lineDiscountOptions.map((opt) => (
                                      <SelectItem key={opt.id} value={opt.id.toString()}>
                                        {opt.discount_type}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  readOnly
                                  disabled
                                  className="w-full text-right border border-border bg-muted/30 text-muted-foreground rounded h-8 text-sm outline-none cursor-not-allowed"
                                  value={item.discountAmount ? Number(item.discountAmount).toFixed(2) : ""}
                                />
                              </td>
                              <td className="px-4 py-2 text-right font-bold text-foreground text-sm">
                                ₱{item.totalAmount.toLocaleString()}
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  placeholder="Enter reason..."
                                  className="w-full border border-border rounded h-8 text-sm px-2 outline-none focus:border-primary"
                                  value={item.reason || ""}
                                  onChange={(e) => handleItemChange(idx, "reason", e.target.value)}
                                />
                              </td>
                              <td className="px-4 py-2">
                                <Select
                                  value={item.returnType || ""}
                                  onValueChange={(val) => { handleItemChange(idx, "returnType", val); setReturnTypeError(false); }}
                                >
                                  <SelectTrigger
                                    className={`w-full h-8 px-2 text-sm transition-colors [&>span]:truncate ${returnTypeError && (!item.returnType || item.returnType === "")
                                        ? "border-destructive ring-1 ring-destructive/30 bg-destructive/5 text-destructive"
                                        : "border-border bg-background focus:ring-1 focus:ring-primary"
                                      }`}
                                  >
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent className="z-[200]">
                                    {returnTypeOptions.length > 0 ? (
                                      returnTypeOptions.map((type) => (
                                        <SelectItem key={type.type_id} value={type.type_name}>
                                          {type.type_name}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <>
                                        <SelectItem value="Good Order">Good Order</SelectItem>
                                        <SelectItem value="Bad Order">Bad Order</SelectItem>
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="sticky right-0 z-10 px-2 py-2 text-center bg-background border-l border-transparent group-hover:border-primary/20">
                                <button
                                  onClick={() => handleRemoveItem(idx)}
                                  className="text-destructive/70 hover:text-destructive h-7 w-7 rounded-md flex items-center justify-center transition-colors"
                                  title="Remove Item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. BOTTOM SUMMARY */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
            <div className="space-y-4 bg-background p-5 rounded-lg border border-border shadow-sm h-full">
              <h4 className="font-bold text-foreground text-sm mb-2">
                Additional Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5" ref={orderWrapperRef}>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                    Order No. <span className="text-destructive">*</span>
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      className={`w-full h-9 border rounded-md text-sm px-3 pr-8 bg-background outline-none transition-all shadow-sm ${orderError
                          ? "border-destructive bg-destructive/5 ring-1 ring-destructive"
                          : "border-border focus:ring-2 focus:border-primary"
                        }`}
                      placeholder="Search Order No..."
                      value={orderSearch || orderNo}
                      onChange={(e) => {
                        setOrderSearch(e.target.value);
                        setOrderNo(e.target.value);
                        setIsOrderOpen(true);
                      }}
                      onFocus={() => setIsOrderOpen(true)}
                    />
                    <ChevronDown className="h-3 w-3 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    {isOrderOpen && (
                      <div className="absolute bottom-[calc(100%+4px)] left-0 w-full z-50 bg-background border border-border rounded-md shadow-xl max-h-48 overflow-y-auto">
                        {filteredOrders.length > 0 ? (
                          filteredOrders.map((inv) => (
                            <div
                              key={`order-${inv.id}`}
                              className="px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 text-foreground"
                              onClick={() => {
                                setOrderNo(inv.order_id);
                                setOrderSearch(inv.order_id);
                                setIsOrderOpen(false);
                                // Auto-fill invoice
                                setInvoiceNo(inv.invoice_no);
                                setInvoiceSearch(inv.invoice_no);
                                setAppliedInvoiceId(Number(inv.id));
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
                            {selectedSalesmanId && customerCode ? "No orders found" : "Select salesman & customer first"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* INVOICE NO DROPDOWN */}
                <div className="space-y-1.5" ref={invoiceWrapperRef}>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                    Invoice No. <span className="text-destructive">*</span>
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      className={`w-full h-9 border rounded-md text-sm px-3 pr-8 bg-background outline-none transition-all shadow-sm ${invoiceError
                          ? "border-destructive bg-destructive/5 ring-1 ring-destructive"
                          : "border-border focus:ring-2 focus:border-primary"
                        }`}
                      placeholder="Search Invoice No..."
                      value={invoiceSearch || invoiceNo}
                      onChange={(e) => {
                        setInvoiceSearch(e.target.value);
                        setInvoiceNo(e.target.value);
                        setIsInvoiceOpen(true);
                        setAppliedInvoiceId(null);
                      }}
                      onFocus={() => setIsInvoiceOpen(true)}
                    />
                    <ChevronDown className="h-3 w-3 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    {isInvoiceOpen && (
                      <div className="absolute bottom-[calc(100%+4px)] left-0 w-full z-50 bg-background border border-border rounded-md shadow-xl max-h-48 overflow-y-auto">
                        {filteredInvoices.length > 0 ? (
                          filteredInvoices.map((inv) => (
                            <div
                              key={`inv-${inv.id}`}
                              className="px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 text-foreground"
                              onClick={() => {
                                setInvoiceNo(inv.invoice_no);
                                setInvoiceSearch(inv.invoice_no);
                                setAppliedInvoiceId(Number(inv.id));
                                setIsInvoiceOpen(false);
                                // Auto-fill order
                                setOrderNo(inv.order_id);
                                setOrderSearch(inv.order_id);
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
                            {selectedSalesmanId && customerCode ? "No invoices found" : "Select salesman & customer first"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                  Remarks
                </label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="resize-none h-24 border-border focus:border-primary focus:bg-background"
                  placeholder="Add any notes regarding this return..."
                />
              </div>
            </div>

            <div className="bg-background rounded-lg border border-border p-0 shadow-sm overflow-hidden h-fit">
              <div className="p-4 bg-muted/30 border-b border-border">
                <h4 className="font-bold text-foreground">Financial Summary</h4>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Total Gross Amount</span>
                  <span className="font-medium text-foreground tabular-nums">
                    ₱
                    {totalGross.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-destructive">
                  <span>Total Discount</span>
                  <span className="font-medium tabular-nums">
                    - ₱
                    {totalDiscount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="my-2 border-t border-dashed border-border"></div>
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-foreground">
                    Net Amount
                  </span>
                  <span className="text-2xl font-bold text-primary tabular-nums">
                    ₱
                    {totalNet.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 bg-background border-t border-border flex justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateReturn}
            disabled={isBranchLockedError || isSubmitting}
            className={`shadow-lg ${isBranchLockedError || isSubmitting
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary hover:bg-primary text-white shadow-primary/20"
              }`}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 mx-auto animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSubmitting ? "Submitting..." : "Create Sales Return"}
          </Button>
        </div>
      </div>

      <ProductLookupModal
        isOpen={isProductLookupOpen}
        onClose={() => setIsProductLookupOpen(false)}
        onConfirm={handleAddProducts}
        priceType={priceType} // 🟢 Pass prop
      />

      {/* SUCCESS MODAL */}
      <Dialog
        open={isSuccessOpen}
        onOpenChange={(open) => !open && handleFinalize()}
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
                Sales Return created successfully.
              </div>
            </div>

            <Button
              onClick={handleFinalize}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base rounded-xl shadow-primary/20 shadow-lg transition-all active:scale-95"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
