/* eslint-disable @typescript-eslint/no-explicit-any */
// =============================================================================
// Sales Return — Core Service Logic
// =============================================================================
import type {
  SalesReturn,
  SalesReturnItem,
  SalesReturnStatusCard,
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
} from "../type";

import * as repo from "../repositories/sales-return-repository";

// =============================================================================
// HELPERS
// =============================================================================

const parseBoolean = (val: any): boolean => {
  if (typeof val === "number") return val === 1;
  if (val && val.type === "Buffer" && Array.isArray(val.data)) {
    return val.data[0] === 1;
  }
  return val === true;
};

const formatDateForAPI = (dateString: string | Date) => {
  try {
    if (!dateString) return new Date().toISOString().split("T")[0];
    return new Date(dateString).toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
};

const cleanId = (id: any) => {
  if (id === null || id === undefined || id === "") return null;
  const num = Number(id);
  return isNaN(num) ? id : num;
};

// =============================================================================
// PUBLIC SERVICE METHODS
// =============================================================================

/**
 * Fetches paginated sales return list.
 */
export async function fetchReturns(
  page: number = 1,
  limit: number = 10,
  filters: { salesman?: string; customer?: string; status?: string } = {},
): Promise<{ data: SalesReturn[]; total: number }> {
  const result = await repo.getRawReturns(page, limit, filters);

  const mappedData: SalesReturn[] = (result.data || []).map((item: any) => ({
    id: item.return_id,
    returnNo: item.return_number,
    invoiceNo: item.invoice_no,
    customerCode: item.customer_code,
    salesmanId: item.salesman_id,
    returnDate: item.return_date
      ? new Date(item.return_date).toLocaleDateString()
      : "N/A",
    totalAmount: parseFloat(item.total_amount) || 0,
    status: item.status || "Pending",
    remarks: item.remarks,
    orderNo: item.order_id || "",
    isThirdParty: parseBoolean(item.isThirdParty),
    priceType: item.price_type || "-",
    createdAt: item.created_at
      ? new Date(item.created_at).toLocaleDateString()
      : "-",
  }));

  return { data: mappedData, total: result.meta?.filter_count || 0 };
}

/**
 * Fetches return detail line items with product/unit/discount enrichment.
 */
export async function fetchReturnDetails(
  returnId: number,
  returnNo: string,
): Promise<SalesReturnItem[]> {
  if (!returnNo) return [];

  const [detailsRes, unitsRes, lineDiscountsRes, returnTypesRes] =
    await Promise.all([
      repo.getRawReturnDetails(returnNo),
      repo.getRawUnits(),
      repo.getRawReferences().then((refs) => refs[3]),
      repo.getRawReferences().then((refs) => refs[4]),
    ]);

  const rawItems = detailsRes.data || [];
  const units = (unitsRes.data || []) as unknown as Unit[];
  const lineDiscounts = (lineDiscountsRes.data || []) as unknown as API_LineDiscount[];
  const returnTypes = (returnTypesRes.data || []) as unknown as API_SalesReturnType[];

  return rawItems.map((detail: any) => {
    const product =
      typeof detail.product_id === "object" && detail.product_id !== null
        ? detail.product_id
        : {
            product_code: "N/A",
            product_name: `Unknown (ID: ${detail.product_id})`,
          };

    const unitId =
      typeof product.unit_of_measurement === "object"
        ? product.unit_of_measurement?.unit_id
        : product.unit_of_measurement;
    const unit = units.find((u: Unit) => u.unit_id === unitId);
    const returnTypeObj = returnTypes.find(
      (rt: API_SalesReturnType) => rt.type_id == detail.sales_return_type_id,
    );

    return {
      id: detail.detail_id || detail.id,
      productId: product.product_id,
      code: product.product_code || "N/A",
      description:
        product.product_name || product.description || "Unknown Item",
      unit: unit ? unit.unit_shortcut : "Pcs",
      quantity: Number(detail.quantity),
      unitPrice: Number(detail.unit_price),
      grossAmount: Number(detail.gross_amount),
      discountType: detail.discount_type ? Number(detail.discount_type) : "",
      discountAmount: (() => {
        const discId = detail.discount_type
          ? Number(detail.discount_type)
          : null;
        if (!discId) return 0;
        const disc = lineDiscounts.find(
          (ld: API_LineDiscount) => ld.id === discId,
        );
        if (!disc) return 0;
        const percentage = parseFloat(disc.percentage) || 0;
        const gross = Number(detail.quantity) * Number(detail.unit_price);
        return Math.round(gross * (percentage / 100) * 100) / 100;
      })(),
      totalAmount: (() => {
        const gross = Number(detail.quantity) * Number(detail.unit_price);
        const discId = detail.discount_type
          ? Number(detail.discount_type)
          : null;
        if (!discId) return gross;
        const disc = lineDiscounts.find(
          (ld: API_LineDiscount) => ld.id === discId,
        );
        if (!disc) return gross;
        const percentage = parseFloat(disc.percentage) || 0;
        return Math.round((gross - gross * (percentage / 100)) * 100) / 100;
      })(),
      reason: detail.reason || "",
      sales_return_type_id: detail.sales_return_type_id
        ? Number(detail.sales_return_type_id)
        : "",
      returnType: returnTypeObj ? returnTypeObj.type_name : "Good Order",
    } as SalesReturnItem;
  });
}

/**
 * Fetches all reference data for dropdowns.
 */
export async function fetchReferences(): Promise<{
  salesmen: { value: string; label: string; code: string; branch: string }[];
  formSalesmen: SalesmanOption[];
  customers: { value: string; label: string }[];
  formCustomers: CustomerOption[];
  branches: BranchOption[];
  lineDiscounts: API_LineDiscount[];
  returnTypes: API_SalesReturnType[];
}> {
  const [salesmenRes, customersRes, branchesRes, lineDiscountsRes, returnTypesRes] =
    await repo.getRawReferences();

  const salesmenData = (salesmenRes.data || []) as any[];
  const customersData = (customersRes.data || []) as any[];
  const branchesData = (branchesRes.data || []) as any[];

  // Build branch lookup for salesman enrichment
  const branchMap = new Map<number, string>();
  branchesData.forEach((b: any) => branchMap.set(b.id, b.branch_name));

  // Dropdown-formatted salesmen
  const salesmen = salesmenData.map((item: any) => ({
    value: item.id.toString(),
    label: item.salesman_name,
    code: item.salesman_code || "N/A",
    branch: branchMap.get(item.branch_code) || "N/A",
  }));

  // Form-formatted salesmen
  const formSalesmen: SalesmanOption[] = salesmenData.map((item: any) => ({
    id: item.id,
    name: item.salesman_name,
    code: item.salesman_code,
    priceType: item.price_type || "A",
    branchId: item.branch_code,
  }));

  // Dropdown-formatted customers
  const customers = customersData.map((item: any) => ({
    value: item.customer_code,
    label: item.customer_name,
  }));

  // Form-formatted customers
  const formCustomers: CustomerOption[] = customersData.map((item: any) => ({
    id: item.id,
    name: item.customer_name || item.store_name,
    code: item.customer_code,
  }));

  // Branches
  const branches: BranchOption[] = branchesData.map((item: any) => ({
    id: item.id,
    name: item.branch_name,
  }));

  return {
    salesmen,
    formSalesmen,
    customers,
    formCustomers,
    branches,
    lineDiscounts: (lineDiscountsRes.data || []) as unknown as API_LineDiscount[],
    returnTypes: (returnTypesRes.data || []) as unknown as API_SalesReturnType[],
  };
}

/**
 * Fetches the product catalog for the ProductLookupModal.
 */
export async function fetchProductCatalog(): Promise<{
  brands: Brand[];
  categories: Category[];
  suppliers: Supplier[];
  units: Unit[];
  connections: ProductSupplierConnection[];
  products: Product[];
}> {
  const [brandsRes, categoriesRes, suppliersRes, unitsRes, connectionsRes, productsRes] =
    await repo.getRawProductCatalog();

  const connections = ((connectionsRes.data || []) as any[]).map((item: any) => ({
    id: item.id,
    supplier_id: item.supplier_id,
    product_id:
      typeof item.product_id === "object"
        ? item.product_id.product_id
        : item.product_id,
  }));

  return {
    brands: (brandsRes.data || []) as unknown as Brand[],
    categories: (categoriesRes.data || []) as unknown as Category[],
    suppliers: (suppliersRes.data || []) as unknown as Supplier[],
    units: (unitsRes.data || []) as unknown as Unit[],
    connections: connections as ProductSupplierConnection[],
    products: (productsRes.data || []) as unknown as Product[],
  };
}

/**
 * Fetches invoices, optionally filtered by salesman and customer code.
 */
export async function fetchInvoices(
  salesmanId?: string,
  customerCode?: string,
): Promise<InvoiceOption[]> {
  const result = await repo.getRawInvoices(salesmanId, customerCode);
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
 * Fetches the status card data for a return.
 */
export async function fetchStatusCard(
  returnId: number,
): Promise<SalesReturnStatusCard | null> {
  try {
    const result = await repo.getRawReturnById(returnId);
    const data = result.data as any;

    // Fetch linked invoice
    let appliedToText = "-";
    try {
      const linkRes = await repo.getRawLinkedInvoice(returnId);
      const linkData = (linkRes.data || []) as any[];
      if (linkData.length > 0) {
        const linkedRec = linkData[0];
        if (linkedRec.invoice_no && linkedRec.invoice_no.invoice_no) {
          appliedToText = linkedRec.invoice_no.invoice_no;
        }
      }
    } catch {
      // Ignore link fetch errors
    }

    return {
      returnId: data.return_id,
      isApplied: data.isApplied === 1,
      dateApplied: data.updated_at
        ? new Date(data.updated_at).toLocaleDateString()
        : "-",
      transactionStatus: data.status || "Closed",
      isPosted: parseBoolean(data.isPosted),
      isReceived: parseBoolean(data.isReceived),
      appliedTo: appliedToText,
    };
  } catch {
    return null;
  }
}

/**
 * Creates a new sales return (header + details).
 */
export async function submitReturn(payload: any): Promise<any> {
  // Fetch line discounts for discount calculation
  const refsResult = await repo.getRawReferences();
  const lineDiscounts = (refsResult[3].data || []) as unknown as API_LineDiscount[];
  const returnTypes = (refsResult[4].data || []) as unknown as API_SalesReturnType[];

  const lineDiscountMap = new Map<number, number>();
  lineDiscounts.forEach((ld) =>
    lineDiscountMap.set(ld.id, parseFloat(ld.percentage) || 0),
  );

  const totalGross = payload.items.reduce(
    (sum: number, item: any) =>
      sum + Number(item.quantity) * Number(item.unitPrice),
    0,
  );

  const totalDiscount = payload.items.reduce(
    (sum: number, item: any) => {
      const gross = Number(item.quantity) * Number(item.unitPrice);
      const discId = item.discountType ? Number(item.discountType) : null;
      const percentage = discId ? lineDiscountMap.get(discId) || 0 : 0;
      return sum + gross * (percentage / 100);
    },
    0,
  );

  const formattedDate = formatDateForAPI(payload.returnDate);
  const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
  const shortTimestamp = Math.floor(Date.now() / 1000).toString().slice(-4);
  const generatedReturnNo = `SR-${shortTimestamp}-${uniqueSuffix}`;

  const headerPayload = {
    return_number: generatedReturnNo,
    gross_amount: totalGross,
    discount_amount: totalDiscount,
    created_by: 205,
    invoice_no: payload.invoiceNo || "",
    customer_code: payload.customer || payload.customerCode,
    salesman_id: cleanId(payload.salesmanId),
    total_amount: payload.totalAmount,
    status: "Pending",
    return_date: formattedDate,
    price_type: payload.priceType || "A",
    remarks: payload.remarks || "Created via Web App",
    order_id: payload.orderNo || "",
    isThirdParty: payload.isThirdParty ? 1 : 0,
  };

  const headerResult = await repo.createReturnHeader(headerPayload);
  const finalReturnNo =
    (headerResult.data as any)?.return_number || generatedReturnNo;

  const detailPromises = payload.items.map(async (item: any) => {
    const matchedType = returnTypes.find(
      (t: API_SalesReturnType) => t.type_name === item.returnType,
    );
    const typeId = matchedType
      ? matchedType.type_id
      : returnTypes[0]?.type_id || 1;

    const gross = Number(item.quantity) * Number(item.unitPrice);
    const discId =
      item.discountType && item.discountType !== ""
        ? Number(item.discountType)
        : null;
    const percentage = discId ? lineDiscountMap.get(discId) || 0 : 0;
    const discountAmt = gross * (percentage / 100);

    const detailPayload = {
      return_no: finalReturnNo,
      product_id: Number(item.productId || item.product_id || item.id),
      quantity: Number(item.quantity),
      unit_price: Number(item.unitPrice),
      gross_amount: gross,
      discount_amount: discountAmt,
      total_amount: gross - discountAmt,
      sales_return_type_id: typeId,
      discount_type: discId,
      reason: item.reason || null,
    };

    const detailResult = await repo.createReturnDetail(detailPayload);

    // Save RFID tags if present
    if (item.rfidTags && Array.isArray(item.rfidTags) && item.rfidTags.length > 0) {
      const detailId = (detailResult.data as any)?.detail_id;
      if (detailId) {
        for (const tag of item.rfidTags) {
          await repo.createRfidTag({
            sales_return_detail_id: detailId,
            rfid_tag: tag,
            created_by: 205,
          });
        }
      }
    }
  });

  await Promise.all(detailPromises);
  return headerResult;
}

/**
 * Updates an existing sales return (header + details).
 */
export async function updateReturn(payload: {
  returnId: number;
  returnNo: string;
  items: any[];
  remarks: string;
  invoiceNo?: string;
  orderNo?: string;
  appliedInvoiceId?: number;
  isThirdParty?: boolean;
}): Promise<any> {
  // Fetch line discounts
  const refsResult = await repo.getRawReferences();
  const lineDiscounts = (refsResult[3].data || []) as unknown as API_LineDiscount[];
  const returnTypes = (refsResult[4].data || []) as unknown as API_SalesReturnType[];

  const lineDiscountMap = new Map<number, number>();
  lineDiscounts.forEach((ld) =>
    lineDiscountMap.set(ld.id, parseFloat(ld.percentage) || 0),
  );

  const totalGross = payload.items.reduce(
    (sum: number, item: any) =>
      sum + Number(item.quantity) * Number(item.unitPrice),
    0,
  );

  const totalDiscount = payload.items.reduce(
    (sum: number, item: any) => {
      const gross = Number(item.quantity) * Number(item.unitPrice);
      const discId =
        item.discountType &&
        item.discountType !== "No Discount" &&
        item.discountType !== ""
          ? Number(item.discountType)
          : null;
      const percentage = discId ? lineDiscountMap.get(discId) || 0 : 0;
      return sum + gross * (percentage / 100);
    },
    0,
  );

  const totalNet = totalGross - totalDiscount;

  const headerPayload = {
    remarks: payload.remarks ?? "",
    gross_amount: totalGross,
    discount_amount: totalDiscount,
    total_amount: totalNet,
    invoice_no: payload.invoiceNo ?? "",
    order_id: payload.orderNo ?? "",
    isThirdParty: payload.isThirdParty ? 1 : 0,
  };

  await repo.updateReturnHeader(payload.returnId, headerPayload);

  // Handle Junction Table
  if (payload.appliedInvoiceId) {
    try {
      const linkResult = await repo.getJunctionLink(payload.returnId);
      const existingLinks = (linkResult.data || []) as any[];

      if (existingLinks.length > 0) {
        const linkId = existingLinks[0].id;
        await repo.updateJunctionLink(linkId, {
          invoice_no: payload.appliedInvoiceId,
          linked_by: 205,
        });
      } else {
        await repo.createJunctionLink({
          return_no: payload.returnId,
          invoice_no: payload.appliedInvoiceId,
          linked_by: 205,
        });
      }
    } catch {
      // Ignore junction errors
    }
  }

  // Handle detail items: delete removed, update existing, create new
  const currentItems = await fetchReturnDetails(
    payload.returnId,
    payload.returnNo,
  );

  const payloadIds = payload.items
    .filter((item: any) => typeof item.id === "number")
    .map((item: any) => item.id);

  const itemsToDelete = currentItems.filter(
    (dbItem) => !payloadIds.includes(dbItem.id),
  );

  for (const item of itemsToDelete) {
    if (item.id) await repo.deleteReturnDetail(item.id as number);
  }

  for (const item of payload.items) {
    const matchedType = returnTypes.find(
      (t: API_SalesReturnType) => t.type_name === item.returnType,
    );
    const typeId = matchedType
      ? matchedType.type_id
      : returnTypes[0]?.type_id || 1;

    const gross = Number(item.quantity) * Number(item.unitPrice);
    const discId =
      item.discountType &&
      item.discountType !== "No Discount" &&
      item.discountType !== ""
        ? Number(item.discountType)
        : null;
    const percentage = discId ? lineDiscountMap.get(discId) || 0 : 0;
    const discountAmt = gross * (percentage / 100);

    const detailPayload = {
      quantity: Number(item.quantity),
      unit_price: Number(item.unitPrice),
      gross_amount: gross,
      discount_amount: discountAmt,
      total_amount: gross - discountAmt,
      sales_return_type_id: typeId,
      discount_type: discId,
      reason: item.reason || null,
    };

    if (typeof item.id === "string" && item.id.startsWith("added-")) {
      await repo.createReturnDetail({
        ...detailPayload,
        return_no: payload.returnNo,
        product_id: Number(item.productId || item.product_id),
      });
    } else {
      await repo.updateReturnDetail(item.id, detailPayload);
    }
  }

  return { success: true };
}

/**
 * Updates the status of a sales return.
 */
export async function updateStatus(
  id: number,
  status: string,
): Promise<any> {
  return repo.updateReturnStatus(id, status);
}

/**
 * Fetches RFID tags for a detail record.
 */
export async function fetchRfidTags(
  detailId: number,
): Promise<{ id: number; rfid_tag: string; created_at?: string }[]> {
  const result = await repo.getRfidTagsByDetailId(detailId);
  return (result.data || []).map((item: any) => ({
    id: item.id,
    rfid_tag: item.rfid_tag,
    created_at: item.created_at,
  }));
}

/**
 * Looks up an RFID tag to find the associated product and returns product info.
 * Used for automatic product addition on RFID scan.
 */
export async function lookupRfid(
  rfidTag: string,
  branchId: number,
  token: string,
): Promise<{
  productId: number;
  productCode: string;
  productName: string;
  unitPrice: number;
  unitShortcut: string;
  unitOfMeasurementCount: number;
} | null> {
  const results = await repo.getSpringRfidLookup(rfidTag, branchId, token);
  if (!results || results.length === 0) return null;

  const firstResult = results[0];
  const productId = Number(firstResult.productId);
  if (!productId) return null;

  // Fetch product details from Directus
  try {
    const productRes = await repo.getRawProductById(productId);
    const product = productRes.data as any;
    if (!product) return null;

    // Resolve unit shortcut
    const unitsRes = await repo.getRawUnits();
    const units = (unitsRes.data || []) as any[];
    const unitId =
      typeof product.unit_of_measurement === "object"
        ? product.unit_of_measurement?.unit_id
        : product.unit_of_measurement;
    const matchedUnit = units.find((u: any) => u.unit_id === unitId);

    return {
      productId: product.product_id,
      productCode: product.product_code || "N/A",
      productName: product.product_name || product.description || "Unknown",
      unitPrice: Number(product.priceA) || 0,
      unitShortcut: matchedUnit?.unit_shortcut || "Pcs",
      unitOfMeasurementCount: Number(product.unit_of_measurement_count) || 1,
    };
  } catch (err) {
    console.error("[Sales Return RFID] Product lookup failed:", err);
    return null;
  }
}
