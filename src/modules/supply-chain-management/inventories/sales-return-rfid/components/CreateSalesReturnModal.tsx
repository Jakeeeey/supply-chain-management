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
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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
// Import RFID Scanner Hook
import { useRfidScanner } from "../hooks/useRfidScanner";

import { useSearchParams } from "next/navigation";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const RFID_HEX_LENGTH = 24;

function extractHexCharacters(value: string): string {
    return value.toUpperCase().replace(/[^0-9A-F]/g, "");
}

function finalizeHexTag(rawValue: string): string {
    const hex = extractHexCharacters(rawValue);

    if (hex.length < RFID_HEX_LENGTH) {
        return "";
    }

    if (hex.length === RFID_HEX_LENGTH) {
        return hex;
    }

    return hex.slice(-RFID_HEX_LENGTH);
}

function sameTag(a: string, b: string): boolean {
    return finalizeHexTag(a) === finalizeHexTag(b);
}



// =============================================================================
// OPTIMIZED SUB-COMPONENTS (PERFORMANCE FIX)
// =============================================================================

const RemarksInputSection = React.memo(({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const [localRemarks, setLocalRemarks] = useState(value);

  useEffect(() => {
    setLocalRemarks(value);
  }, [value]);

  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
        Remarks
      </label>
      <Textarea
        value={localRemarks}
        onChange={(e) => setLocalRemarks(e.target.value)}
        onBlur={() => onChange(localRemarks)}
        className="resize-none h-24 border-border focus:border-primary focus:bg-background"
        placeholder="Add any notes regarding this return..."
      />
    </div>
  );
});
RemarksInputSection.displayName = "RemarksInputSection";

const ReasonInputSection = React.memo(({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const [localReason, setLocalReason] = useState(value);

  useEffect(() => {
    setLocalReason(value);
  }, [value]);

  return (
    <input
      type="text"
      placeholder="Enter reason"
      className="w-full border border-border rounded h-8 text-sm px-2 outline-none focus:border-primary"
      value={localReason}
      onChange={(e) => setLocalReason(e.target.value)}
      onBlur={() => onChange(localReason)}
    />
  );
});
ReasonInputSection.displayName = "ReasonInputSection";

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
          className={cn("w-full justify-between font-normal text-xs px-2 h-8", !value && "text-muted-foreground", className)}
          disabled={disabled}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[9999]" align="start">
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

export function CreateSalesReturnModal({ isOpen, onClose, onSuccess }: Props) {
  const searchParams = useSearchParams();
  const fromClearance = searchParams.get("fromClearance");
  // --- 1. FORM STATE ---
  const [returnDate, setReturnDate] = useState(() => {
    const manilaMs = Date.now() + 8 * 60 * 60 * 1000;
    const d = new Date(manilaMs);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

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
  const [isConfirmCreateOpen, setIsConfirmCreateOpen] = useState(false);

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

  // --- 3. CART STATE ---
  const [items, setItems] = useState<SalesReturnItem[]>([]);
  const [isProductLookupOpen, setIsProductLookupOpen] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

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

  // 🟢 NEW: Effect to automatically update discounts when Customer changes
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
  }, [customerCode, customers, lineDiscountOptions, items.length]);

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

    const cleanedTag = finalizeHexTag(tag);
    if (!cleanedTag) {
      toast.error(`Invalid RFID Tag: "${tag}" must be a 24-character hexadecimal string.`);
      return;
    }

    // Check for duplicate RFID already in items
    const isDuplicate = items.some(
      (item) => item.rfidTags && item.rfidTags.some(existingTag => sameTag(existingTag, cleanedTag)),
    );
    if (isDuplicate) {
      toast.error(`RFID tag "${cleanedTag}" is already in the list.`);
      return;
    }

    if (selectedRowIndex === null) {
      toast.warning("Please select a product row from the table before scanning.");
      return;
    }

    const selectedRow = items[selectedRowIndex];
    if (selectedRow?.unitOrder !== 3) {
      toast.error(`RFID tagging is only allowed for Box units (Order 3). "${selectedRow.description}" is using a "${selectedRow.unit}" unit.`);
      return;
    }

    setRfidScanning(true);
    setLastScannedRfid(cleanedTag);

    try {
      // 1. Global Duplicate Check (Has this tag been returned before?)
      const dupCheck = await SalesReturnProvider.checkRfidDuplicate(cleanedTag);
      if (dupCheck.isDuplicate) {
        setLastScannedRfid("");
        toast.error(`Tag "${cleanedTag}" already returned in SR #${dupCheck.returnNo}`);
        return;
      }

      // 2. Inventory Check (Is it currently on-hand?)
      const result = await SalesReturnProvider.lookupRfid(cleanedTag, branchId);

      if (result?.isOnInventory) {
        if (Number(result.currentBranchId) === Number(branchId)) {
          setLastScannedRfid("");
          toast.error("Already in Stock", {
            description: "This item is already in the branch's inventory. Sales Return is not allowed for on-hand items.",
            duration: 5000,
          });
          return;
        } else {
          setLastScannedRfid("");
          toast.error("Invalid Branch Location", {
            description: `This product belongs to ${result.currentBranchName || 'another branch'}. It cannot be returned to the selected salesman's branch.`,
            duration: 5000,
          });
          return;
        }
      }

      // 3. Local Duplicate Check (Is it already in our current session?)
      if (items.some((i) => i.rfidTags?.some(existingTag => sameTag(existingTag, cleanedTag)))) {
        setLastScannedRfid("");
        toast.warning("Tag already scanned in this session.");
        return;
      }

      // 4. Accept Scan: Tag to selected row
      setItems((prev) => {
        const next = [...prev];
        const row = next[selectedRowIndex];
        if (!row) return prev;

        const newTags = [...(row.rfidTags || []), cleanedTag];
        const newQty = newTags.length;
        
        // Recalculate amounts for this row
        const unitPrice = Number(row.unitPrice) || 0;
        const grossAmount = Math.round(unitPrice * newQty * 100) / 100;
        
        // Calculate discount
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
          rfidTags: newTags,
          quantity: newQty,
          grossAmount,
          discountAmount: discountAmt,
          totalAmount: Math.round((grossAmount - discountAmt) * 100) / 100,
        };
        return next;
      });

      toast.success(`Tag accepted for ${items[selectedRowIndex].description}`);

      // Auto-clear display after 2 seconds
      setTimeout(() => setLastScannedRfid(""), 2000);
    } catch (err: unknown) {
      console.error("RFID lookup failed:", err);
      setLastScannedRfid(""); // Clear checkmark
      toast.error("RFID Lookup Failed", {
        description: (err as Error).message || "An unexpected error occurred during scanning. Please try again.",
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
    const manilaMs = Date.now() + 8 * 60 * 60 * 1000;
    const d = new Date(manilaMs);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    setReturnDate(`${year}-${month}-${day}`);
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
    !inv.isPosted && inv.invoice_no.toLowerCase().includes(invoiceSearch.toLowerCase()),
  );

  const filteredOrders = invoiceOptions.filter((inv) =>
    !inv.isPosted && inv.order_id.toLowerCase().includes(orderSearch.toLowerCase()),
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

    if (isBranchLockedError) {
      toast.error("Invalid Branch: Clear the products or revert the salesman to proceed.");
      return;
    }

    if (items.length > 0) {
      const invalidItems = items.some(
        (item) => item.quantity > 0 && (!item.returnType || item.returnType === ""),
      );
      if (invalidItems) {
        toast.error("Please select a Return Type for all items.");
        setReturnTypeError(true);
        return;
      }
    }

    const hasNewTags = items.some(item => item.rfidTags && item.rfidTags.length > 0);
    if (hasNewTags) {
      setIsConfirmCreateOpen(true);
    } else {
      handleConfirmCreate();
    }
  };

  const handleConfirmCreate = async () => {
    setIsConfirmCreateOpen(false);
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
        const incomingQty = item.unitOrder === 3 ? 0 : (item.quantity || 1);

        if (existingIndex >= 0) {
          const existing = updated[existingIndex];
          existing.quantity += incomingQty;
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
          const incomingDiscountType = item.discountType || "";
          let initialDiscountAmt = 0;
          const unitPrice = Math.round(Number(item.unitPrice || 0) * 100) / 100;
          const initialGross = Math.round(unitPrice * incomingQty * 100) / 100;

          if (incomingDiscountType) {
            const selectedOption = lineDiscountOptions.find(
              (d) => d.id.toString() === incomingDiscountType.toString(),
            );
            if (selectedOption) {
              const percentage = parseFloat(selectedOption.total_percent) || 0;
              initialDiscountAmt =
                Math.round(initialGross * (percentage / 100) * 100) / 100;
            }
          }

          updated.push({
            ...item,
            productId,
            product_id: productId,
            code: item.code || "N/A",
            description: item.description || "Unknown Item",
            unit: item.unit || "Pcs",
            quantity: incomingQty,
            unitPrice,
            grossAmount: initialGross,
            discountType: incomingDiscountType,
            discountAmount: initialDiscountAmt,
            totalAmount: Math.round((initialGross - initialDiscountAmt) * 100) / 100,
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
                      Unit Price
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
                      {items.map((item, idx) => {
                        const isSelected = selectedRowIndex === idx;
                        return (
                          <tr 
                            key={item.id || idx} 
                            onClick={() => {
                              if (item.unitOrder === 3) {
                                setSelectedRowIndex(idx);
                              } else {
                                toast.info("RFID tagging is limited to Box units (Order 3).", {
                                  description: `"${item.description}" uses "${item.unit}", which must be handled manually.`
                                });
                              }
                            }}
                            className={cn(
                              "hover:bg-muted/10 transition-colors duration-200 border-b border-border cursor-pointer group",
                              isSelected && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                              item.unitOrder !== 3 && "cursor-default hover:bg-transparent opacity-90"
                            )}
                          >
                            <td className="px-4 py-2 font-mono text-sm text-foreground">
                              <div className="flex items-center gap-2">
                                {isSelected ? (
                                  <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)] animate-pulse" />
                                ) : (
                                  <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                                )}
                                <span>{item.code}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-foreground">
                              <div className="text-sm text-foreground font-medium" title={item.description}>
                                {item.description}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <span className="bg-background text-foreground px-2 py-0.5 rounded text-sm border border-border font-normal">
                                {item.unit}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <div className="flex flex-col items-center gap-1">
                                {item.unitOrder === 3 ? (
                                  <Badge variant="outline" className={cn(
                                    "font-bold transition-all min-w-[40px] flex justify-center",
                                    "border-primary/40 bg-primary/10 text-primary shadow-sm"
                                  )}>
                                    {item.quantity}
                                  </Badge>
                                ) : (
                                  <input
                                    type="number"
                                    min={1}
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      if (!isNaN(val) && val > 0) {
                                        handleItemChange(idx, "quantity", val);
                                      }
                                    }}
                                    className="w-16 h-7 text-center text-xs font-bold text-foreground border border-border rounded-md shadow-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-background"
                                  />
                                )}
                                <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">
                                  {item.unitOrder === 3 ? "Box Units" : "Manual Qty"}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right text-sm whitespace-nowrap">
                              ₱{item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground font-mono text-sm whitespace-nowrap">
                              ₱{(item.grossAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2">
                              {(() => {
                                const noDiscountOpt = lineDiscountOptions.find(o => o.discount_type === "No Discount");
                                const defaultVal = noDiscountOpt ? noDiscountOpt.id.toString() : "";
                                const currentDiscVal = item.discountType?.toString() ? (
                                  lineDiscountOptions.some(o => o.id.toString() === item.discountType?.toString())
                                    ? item.discountType.toString()
                                    : defaultVal
                                ) : defaultVal;
                                return (
                                  <LocalSearchableSelect
                                    value={currentDiscVal}
                                    onValueChange={(val) => handleItemChange(idx, "discountType", val)}
                                    options={lineDiscountOptions.map((opt) => ({
                                      value: opt.id.toString(),
                                      label: opt.discount_type,
                                    }))}
                                    placeholder="Select Discount..."
                                    className="w-full h-8 text-xs"
                                  />
                                );
                              })()}
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                readOnly
                                disabled
                                className="w-full text-right border border-border bg-muted/30 text-muted-foreground rounded h-8 text-sm outline-none cursor-not-allowed"
                                value={item.discountAmount ? Number(item.discountAmount).toFixed(2) : "0.00"}
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-sm text-foreground whitespace-nowrap">
                              ₱{item.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                             <td className="px-4 py-2">
                               <ReasonInputSection
                                 value={item.reason || ""}
                                 onChange={(val) => handleItemChange(idx, "reason", val)}
                               />
                             </td>
                            <td className="px-3 py-2">
                              <SearchableSelect
                                value={item.returnType || ""}
                                onValueChange={(val) => { handleItemChange(idx, "returnType", val); setReturnTypeError(false); }}
                                options={returnTypeOptions.length > 0 
                                  ? returnTypeOptions.map((type) => ({ value: type.type_name, label: type.type_name }))
                                  : [
                                      { value: "Good Order", label: "Good Order" },
                                      { value: "Bad Order", label: "Bad Order" }
                                    ]
                                }
                                placeholder="Select type"
                                className={cn(
                                  "h-8 text-sm px-2",
                                  returnTypeError && (!item.returnType || item.returnType === "") && "border-destructive ring-1 ring-destructive/30 bg-destructive/5 text-destructive"
                                )}
                              />
                            </td>
                            <td className="sticky right-0 z-10 px-2 py-2 text-center bg-background border-l border-transparent group-hover:border-primary/20">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveItem(idx);
                                  if (selectedRowIndex === idx) setSelectedRowIndex(null);
                                }}
                                className="text-destructive/70 hover:text-destructive h-7 w-7 rounded-md flex items-center justify-center transition-colors"
                                title="Remove Item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 🟢 NEW: TAG MANAGEMENT SECTION */}
          {selectedRowIndex !== null && items[selectedRowIndex] && (
            <div className="bg-background rounded-lg border-2 border-primary/20 shadow-md p-5 mb-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-foreground flex items-center gap-2 text-base">
                  <div className="bg-emerald-500/10 p-1.5 rounded text-emerald-600">
                    <ScanLine className="h-5 w-5" />
                  </div>
                  Tagged RFIDs for: <span className="text-primary underline decoration-primary/30 underline-offset-4">{items[selectedRowIndex].description}</span>
                </h4>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1 font-bold">
                  {items[selectedRowIndex].rfidTags?.length || 0} ITEMS SCANNED
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {(!items[selectedRowIndex].rfidTags || items[selectedRowIndex].rfidTags!.length === 0) ? (
                  <div className="col-span-full py-12 text-center border border-dashed rounded-lg text-muted-foreground bg-muted/5">
                    <div className="flex flex-col items-center gap-2">
                      <ScanLine className="h-8 w-8 opacity-20" />
                      <p className="font-medium">No RFIDs tagged yet</p>
                      <span className="text-xs">Start scanning to add items to this row.</span>
                    </div>
                  </div>
                ) : (
                  items[selectedRowIndex].rfidTags!.map((tag, tIdx) => (
                    <div key={tag} className="flex items-center justify-between bg-muted/20 border border-border p-2.5 rounded-md hover:border-primary/30 transition-all group hover:shadow-sm">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-bold text-foreground">{tag}</span>
                        <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black">Tag #{tIdx + 1}</span>
                      </div>
                      <button
                        onClick={() => {
                          setItems(prev => {
                            const next = [...prev];
                            const row = next[selectedRowIndex];
                            const newTags = row.rfidTags!.filter(t => t !== tag);
                            const newQty = newTags.length;
                            
                            const unitPrice = Number(row.unitPrice) || 0;
                            const gross = Math.round(unitPrice * newQty * 100) / 100;
                            let discAmt = 0;
                            if (row.discountType) {
                              const opt = lineDiscountOptions.find(d => d.id.toString() === row.discountType?.toString());
                              if (opt) discAmt = Math.round(gross * (parseFloat(opt.total_percent) / 100) * 100) / 100;
                            }

                            next[selectedRowIndex] = {
                              ...row,
                              rfidTags: newTags,
                              quantity: newQty,
                              grossAmount: gross,
                              discountAmount: discAmt,
                              totalAmount: Math.round((gross - discAmt) * 100) / 100
                            };
                            return next;
                          });
                        }}
                        className="p-1.5 text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        title="Remove Tag"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 3. BOTTOM SUMMARY */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
            <div className="space-y-4 bg-background p-5 rounded-lg border border-border shadow-sm h-full">
              <h4 className="font-bold text-foreground text-sm mb-2">
                Additional Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5" ref={orderWrapperRef}>
                  <Label className="text-xs uppercase font-bold text-muted-foreground">
                    Order No.
                  </Label>
                  {/* Order No Dropdown */}
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
                      <div className="absolute bottom-[calc(100%+4px)] left-0 w-full z-50 bg-background border border-border rounded-md shadow-xl max-h-48 overflow-y-auto divide-y">
                        {/* 🟢 Clear Option */}
                        <div
                          className="px-3 py-2 text-xs font-medium cursor-pointer hover:bg-destructive/10 text-destructive flex items-center gap-2"
                          onClick={() => {
                            setOrderNo("");
                            setOrderSearch("");
                            setAppliedInvoiceId(null);
                            setIsOrderOpen(false);
                          }}
                        >
                          <X className="h-3 w-3" /> Clear Selection
                        </div>
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
                  <Label className="text-xs uppercase font-bold text-muted-foreground">
                    Invoice No.
                  </Label>
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
                      <div className="absolute bottom-[calc(100%+4px)] left-0 w-full z-50 bg-background border border-border rounded-md shadow-xl max-h-48 overflow-y-auto divide-y">
                        {/* 🟢 Clear Option */}
                        <div
                          className="px-3 py-2 text-xs font-medium cursor-pointer hover:bg-destructive/10 text-destructive flex items-center gap-2"
                          onClick={() => {
                            setInvoiceNo("");
                            setInvoiceSearch("");
                            setAppliedInvoiceId(null);
                            setIsInvoiceOpen(false);
                          }}
                        >
                          <X className="h-3 w-3" /> Clear Selection
                        </div>
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
              <RemarksInputSection
                value={remarks}
                onChange={setRemarks}
              />
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
        customerCode={customerCode} // 🟢 Pass prop
        lineDiscounts={lineDiscountOptions}
      />

      {/* CONFIRM CREATE DIALOG */}
      <AlertDialog open={isConfirmCreateOpen} onOpenChange={setIsConfirmCreateOpen}>
        <AlertDialogContent className="max-w-md bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="bg-primary/10 text-primary p-2 rounded-full">
                <FileText className="h-5 w-5" />
              </span>
              Create Sales Return?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base mt-2">
              Once this Sales Return is saved, you will no longer be able to delete any tagged RFID items. 
              <br /><br />
              Please review your entries before confirming.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel
              disabled={isSubmitting}
              onClick={() => setIsConfirmCreateOpen(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={handleConfirmCreate}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                "Confirm & Create"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
