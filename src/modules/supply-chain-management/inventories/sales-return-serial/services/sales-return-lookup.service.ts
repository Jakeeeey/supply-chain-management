/* eslint-disable @typescript-eslint/no-explicit-any */
import type { 
  SalesmanOption, 
  CustomerOption, 
  BranchOption, 
  InvoiceOption, 
  Brand, 
  Category, 
  Supplier, 
  Unit, 
  Product, 
  ProductSupplierConnection, 
  API_LineDiscount, 
  API_SalesReturnType, 
  PriceTypeOption 
} from "../types/sales-return.types";
import * as lookupRepo from "./sales-return-lookup.repo";

/**
 * Builds a Map<discount_type_id, total_percentage> by summing linked
 * line_discount.percentage values through the line_per_discount_type junction.
 */
async function buildDiscountPercentMap(): Promise<Map<number, number>> {
  const [junctionRes, lineDiscRes] = await Promise.all([
    lookupRepo.getRawLinePerDiscountType(),
    lookupRepo.getRawLineDiscounts(),
  ]);

  const junctionRows = (junctionRes.data || []) as { type_id: number; line_id: number }[];
  const lineDiscRows = (lineDiscRes.data || []) as { id: number; percentage: string | number }[];

  const linePercentMap = new Map<number, number>();
  lineDiscRows.forEach((ld) => linePercentMap.set(ld.id, parseFloat(String(ld.percentage)) || 0));

  const discountMap = new Map<number, number>();
  junctionRows.forEach((row) => {
    const existing = discountMap.get(row.type_id) || 0;
    const linePct = linePercentMap.get(row.line_id) || 0;
    discountMap.set(row.type_id, Math.round((existing + linePct) * 10000) / 10000);
  });

  return discountMap;
}

/**
 * Fetches all reference data for dropdowns.
 * @returns A promise resolving to an object containing all reference data.
 */
export async function fetchReferences(): Promise<{
  salesmen: { value: string; label: string; code: string; branch: string; branchId: number }[];
  filterSalesmen: { value: string; label: string; code: string; branch: string; branchId: number }[];
  formSalesmen: SalesmanOption[];
  customers: { value: string; label: string }[];
  formCustomers: CustomerOption[];
  branches: BranchOption[];
  lineDiscounts: API_LineDiscount[];
  returnTypes: API_SalesReturnType[];
  priceTypes: PriceTypeOption[];
}> {
  const [salesmenRes, customersRes, branchesRes, lineDiscountsRes, returnTypesRes] =
    await lookupRepo.getRawReferences();

  let priceTypesData: PriceTypeOption[] = [];
  try {
    const priceTypesRes = await lookupRepo.getRawPriceTypes();
    priceTypesData = ((priceTypesRes.data || []) as unknown as PriceTypeOption[]);
  } catch (err) {
    console.error("Failed to fetch price types:", err);
  }

  const salesmenData = (salesmenRes.data || []) as any[];
  const customersData = (customersRes.data || []) as any[];
  const branchesData = (branchesRes.data || []) as any[];

  const branchMap = new Map<number, string>();
  branchesData.forEach((b: any) => branchMap.set(b.id, b.branch_name));

  const salesmen = salesmenData.map((item: any) => ({
    value: item.id.toString(),
    label: item.salesman_name,
    code: item.salesman_code || "N/A",
    branch: branchMap.get(item.branch_code) || "N/A",
    branchId: item.branch_code,
  }));

  const filterSalesmen = salesmenData
    .filter((item: any) => (item.isActive === 1 || item.isActive === true) && Number(item.division_id) === 1)
    .map((item: any) => ({
      value: item.id.toString(),
      label: item.salesman_name,
      code: item.salesman_code || "N/A",
      branch: branchMap.get(item.branch_code) || "N/A",
      branchId: item.branch_code,
    }));

  const formSalesmen: SalesmanOption[] = salesmenData
    .filter((item: any) => (item.isActive === 1 || item.isActive === true) && Number(item.division_id) === 1)
    .map((item: any) => ({
      id: item.id,
      name: item.salesman_name,
      code: item.salesman_code,
      priceType: item.price_type || "A",
      branchId: item.branch_code,
    }));

  const customers = customersData.map((item: any) => ({
    value: item.customer_code,
    label: item.customer_name,
  }));

  const formCustomers: CustomerOption[] = customersData.map((item: any) => ({
    id: item.id,
    name: item.customer_name || item.store_name,
    code: item.customer_code,
  }));

  const branches: BranchOption[] = branchesData.map((item: any) => ({
    id: item.id,
    name: item.branch_name,
  }));

  const discountPercentMap = await buildDiscountPercentMap();
  const rawDiscountTypes = (lineDiscountsRes.data || []) as any[];
  const enrichedLineDiscounts: API_LineDiscount[] = rawDiscountTypes.map((dt: any) => ({
    id: dt.id,
    discount_type: dt.discount_type,
    total_percent: String(discountPercentMap.get(dt.id) || 0),
  }));

  return {
    salesmen,
    filterSalesmen,
    formSalesmen,
    customers,
    formCustomers,
    branches,
    lineDiscounts: enrichedLineDiscounts,
    returnTypes: (returnTypesRes.data || []) as unknown as API_SalesReturnType[],
    priceTypes: priceTypesData,
  };
}

/**
 * Fetches the product catalog for the ProductLookupModal.
 * @param customerCode Optional customer code to fetch specific discounts.
 * @returns A promise resolving to the catalog data.
 */
export async function fetchProductCatalog(customerCode?: string): Promise<{
  brands: Brand[];
  categories: Category[];
  suppliers: Supplier[];
  units: Unit[];
  connections: ProductSupplierConnection[];
  supplierCategoryDiscount: any[];
  products: Product[];
}> {
  const catalogData = await lookupRepo.getRawProductCatalog();
  const [brandsRes, categoriesRes, suppliersRes, unitsRes, connectionsRes, productsRes] = catalogData;

  let scdpcRes = { data: [] as any[] };
  if (customerCode) {
    scdpcRes = await lookupRepo.getRawSupplierCategoryDiscount(customerCode);
  }

  const connections = ((connectionsRes.data || []) as any[]).map((item: any) => ({
    id: item.id,
    supplier_id: item.supplier_id,
    product_id:
      typeof item.product_id === "object"
        ? item.product_id.product_id
        : item.product_id,
    discount_type: item.discount_type,
  }));

  const supplierCategoryDiscount = (scdpcRes.data || []).map((item: any) => ({
    id: item.id,
    customer_code: item.customer_code,
    supplier_id: item.supplier_id,
    category_id: item.category_id,
    discount_type: item.discount_type,
  }));

  const suppliers = (suppliersRes.data || []) as unknown as Supplier[];
  const products = (productsRes.data || []) as unknown as Product[];

  // 🟢 Filter products to only those linked to Division 1 suppliers
  const allowedSupplierIds = new Set(suppliers.map((s) => s.id));
  const allowedProductIds = new Set(
    connections
      .filter((conn) => allowedSupplierIds.has(conn.supplier_id))
      .map((conn) => conn.product_id),
  );

  const filteredProducts = products.filter((p) =>
    allowedProductIds.has(p.product_id),
  );

  return {
    brands: (brandsRes.data || []) as unknown as Brand[],
    categories: (categoriesRes.data || []) as unknown as Category[],
    suppliers: suppliers,
    units: (unitsRes.data || []) as unknown as Unit[],
    connections: connections as ProductSupplierConnection[],
    supplierCategoryDiscount,
    products: filteredProducts,
  };
}

/**
 * Fetches invoices, optionally filtered by salesman and customer code.
 * @param salesmanId Optional salesman ID filter.
 * @param customerCode Optional customer code filter.
 * @returns A promise resolving to the list of invoices.
 */
export async function fetchInvoices(
  salesmanId?: string,
  customerCode?: string,
): Promise<InvoiceOption[]> {
  const result = await lookupRepo.getRawInvoices(salesmanId, customerCode);
  const rawData = (result.data || []) as any[];

  const uniqueInvoices = new Map<string, InvoiceOption>();
  rawData.forEach((item: any) => {
    const key = `${item.order_id || ""}_${item.invoice_no || ""}`;
    if (!uniqueInvoices.has(key)) {
      uniqueInvoices.set(key, {
        id: item.invoice_id,
        invoice_no: (item.invoice_no || "").toString(),
        order_id: (item.order_id || "").toString(),
        customerCode: item.customer_code || "",
        salesman_id: item.salesman_id || 0,
        amount: item.total_amount ? parseFloat(item.total_amount) : 0,
      });
    }
  });

  return Array.from(uniqueInvoices.values());
}

/**
 * Checks if a serial number is already present in any sales return record.
 * @param serialNumber The serial number to check.
 * @returns A promise resolving to the duplicate check result.
 */
export async function checkSerialDuplicate(serialNumber: string) {
  const result = await lookupRepo.checkSerialDuplicate(serialNumber);
  
  if (result && result.data && result.data.length > 0) {
    const firstMatch = result.data[0];
    console.debug("Serial duplicate check match:", firstMatch);
    
    let returnNo = "Unknown";
    if (firstMatch.sales_return_detail_id && typeof firstMatch.sales_return_detail_id === "object") {
      returnNo = firstMatch.sales_return_detail_id.return_no || "Unknown";
    } else if (firstMatch.return_no) {
      returnNo = firstMatch.return_no;
    }

    return {
      isDuplicate: true,
      returnNo,
    };
  }
  return { isDuplicate: false, returnNo: null };
}

/**
 * Checks if a serial number is currently on-hand at a branch.
 * @param serial The serial number to check.
 * @param branchId The branch ID to check against.
 * @param token Authentication token.
 * @returns A promise resolving to the on-hand check result.
 */
export async function checkSerialOnHand(
  serial: string,
  branchId: number,
  token: string): Promise<{ isOnInventory: boolean; branchId?: number; branchName?: string }> {
  const data = await lookupRepo.getRawSerialOnHand(serial, branchId, token);
  
  if (data && data.length > 0) {
    const item = data[0];
    return {
      isOnInventory: true,
      branchId: item.branch_id || item.branch_code || item.branchCode,
      branchName: item.branch_name || item.branchName,
    };
  }

  return { isOnInventory: false };
}
