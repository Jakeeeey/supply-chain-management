/* eslint-disable @typescript-eslint/no-explicit-any */
import type { 
  SalesReturnItem, 
  Product, 
  ProductSupplierConnection, 
  SupplierCategoryDiscount 
} from "../types/sales-return.types";

/**
 * Parses various true/false representations into a boolean.
 */
export const parseBoolean = (val: any): boolean => {
  if (typeof val === "number") return val === 1;
  if (val && val.type === "Buffer" && Array.isArray(val.data)) {
    return val.data[0] === 1;
  }
  return val === true;
};

export const nowPH = (): string => {
  // Add 8 hours (UTC+8) to UTC time to get Manila time.
  // Uses getUTC* methods to avoid any server local-timezone influence.
  const manilaMs = Date.now() + 8 * 60 * 60 * 1000;
  const d = new Date(manilaMs);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hour = String(d.getUTCHours()).padStart(2, "0");
  const minute = String(d.getUTCMinutes()).padStart(2, "0");
  const second = String(d.getUTCSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
};

/**
 * Safely formats a date string into YYYY-MM-DD for the API.
 */
export const formatDateForAPI = (dateString: string | Date | undefined | null) => {
  try {
    if (!dateString) {
      return nowPH();
    }
    let dateStr = "";
    if (typeof dateString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      dateStr = dateString;
    } else {
      const date = typeof dateString === "string" ? new Date(dateString) : dateString;
      const manilaMs = date.getTime() + 8 * 60 * 60 * 1000;
      const d = new Date(manilaMs);
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      dateStr = `${year}-${month}-${day}`;
    }

    const nowD = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const hour = String(nowD.getUTCHours()).padStart(2, "0");
    const minute = String(nowD.getUTCMinutes()).padStart(2, "0");
    const second = String(nowD.getUTCSeconds()).padStart(2, "0");
    return `${dateStr}T${hour}:${minute}:${second}`;
  } catch {
    return nowPH();
  }
};

/**
 * Cleans an ID, converting it to a number if valid, or leaving it as string/null.
 */
export const cleanId = (id: any) => {
  if (id === null || id === undefined || id === "") return null;
  const num = Number(id);
  return isNaN(num) ? id : num;
};

/**
 * Formats a number to a currency string (2 decimal places).
 */
export const formatCurrency = (value: number) => {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Calculates the total gross, discount, and net amounts for a list of items.
 */
export const calculateTotals = (items: SalesReturnItem[]) => {
  const totalGross = items.reduce(
    (sum, item) => sum + (item.grossAmount || 0),
    0,
  );
  const totalDiscount = items.reduce(
    (sum, item) => sum + (item.discountAmount || 0),
    0,
  );
  const totalNet = items.reduce(
    (sum, item) => sum + (item.totalAmount || 0),
    0,
  );

  return { totalGross, totalDiscount, totalNet };
};

/**
 * Resolves the final discount type based on a 2-level override hierarchy:
 * 1. Specific Match: Customer + Supplier + Category
 * 2. General Match: Customer + Supplier (where Category is NULL)
 * 
 * If a match is found but discount_type is NULL, it returns NULL (No Discount).
 * If no match is found, it returns NULL (No Fallback).
 */
export function resolveFinalDiscount(
  product: Product,
  customerCode: string | undefined,
  catalog: {
    connections: ProductSupplierConnection[];
    supplierCategoryDiscount?: SupplierCategoryDiscount[];
  }
): string | number | null {
  if (!customerCode) return null;

  const productId = product.product_id;
  const categoryId = product.product_category;

  // 1. Find supplier ID from connections
  const psc = catalog.connections?.find(
    (c) => c.product_id === productId
  );
  const supplierId = psc?.supplier_id;

  if (!supplierId) return null;

  // 2. TIER 1: Specific Category Match (Priority A)
  const specificMatch = catalog.supplierCategoryDiscount?.find(
    (c) => 
      c.customer_code === customerCode && 
      c.supplier_id === supplierId && 
      c.category_id === categoryId
  );
  if (specificMatch) {
    // Terminal: Use whatever is in the record (even if NULL)
    return specificMatch.discount_type || null;
  }

  // 3. TIER 2: Supplier-wide Match (Category is NULL) (Priority B)
  const generalMatch = catalog.supplierCategoryDiscount?.find(
    (c) => 
      c.customer_code === customerCode && 
      c.supplier_id === supplierId && 
      (c.category_id === null || c.category_id === undefined)
  );
  if (generalMatch) {
    // Terminal: Use whatever is in the record (even if NULL)
    return generalMatch.discount_type || null;
  }

  // 4. Default: No match found = No Discount
  return null;
}

/**
 * AppError
 * Structured error class for application-level errors.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, message: string, status: number = 500) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

/**
 * handleApiError
 * Centralised error handler for Next.js API route handlers.
 */
export function handleApiError(error: unknown, NextResponse: any) {
  console.error("[API Error]", error);

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }

  // Handle Zod validation errors
  if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
    return NextResponse.json(
      { error: "Validation failed", details: (error as any).errors },
      { status: 400 }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: "An unexpected error occurred." },
    { status: 500 }
  );
}
