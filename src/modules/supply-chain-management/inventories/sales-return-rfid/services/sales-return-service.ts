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
  PriceTypeOption,
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

const nowPH = (): string => {
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
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

const formatDateForAPI = (dateString: string | Date) => {
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

const cleanId = (id: any) => {
  if (id === null || id === undefined || id === "") return null;
  const num = Number(id);
  return isNaN(num) ? id : num;
};

/**
 * Builds a Map<discount_type_id, total_percentage> by retrieving pre-calculated
 * sequential compounded percentages from the discount_type collection.
 */
async function buildDiscountPercentMap(): Promise<Map<number, number>> {
  const result = await repo.getRawDiscountTypes();
  const rows = (result.data || []) as { id: number; total_percent: string | number }[];

  const discountMap = new Map<number, number>();
  rows.forEach((dt) => {
    discountMap.set(dt.id, parseFloat(String(dt.total_percent)) || 0);
  });

  return discountMap;
}

// =============================================================================
// PUBLIC SERVICE METHODS
// =============================================================================

/**
 * Fetches paginated sales return list.
 */
export async function fetchReturns(
  page: number = 1,
  limit: number = 10,
  filters: { salesman?: string; customer?: string; status?: string; invoiceNo?: string } = {},
): Promise<{ data: SalesReturn[]; total: number }> {
  const result = await repo.getRawReturns(page, limit, filters);

  const mappedData: SalesReturn[] = (result.data || []).map((item: any) => ({
    id: item.return_id,
    returnNo: item.return_number,
    invoiceNo: item.invoice_no,
    customerCode: item.customer_code,
    salesmanId: item.salesman_id,
    returnDate: item.return_date
      ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(item.return_date))
      : "N/A",
    totalAmount: parseFloat(item.total_amount) || 0,
    status: item.status || "Pending",
    remarks: item.remarks,
    orderNo: item.order_id || "",
    isThirdParty: parseBoolean(item.isThirdParty),
    priceType: item.price_type || "-",
    createdAt: item.created_at
      ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(item.created_at))
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

  const [detailsRes, unitsRes, returnTypesRes] =
    await Promise.all([
      repo.getRawReturnDetails(returnNo),
      repo.getRawUnits(),
      repo.getRawReferences().then((refs) => refs[4]),
    ]);

  const rawItems = detailsRes.data || [];
  const units = (unitsRes.data || []) as unknown as Unit[];
  const returnTypes = (returnTypesRes.data || []) as unknown as API_SalesReturnType[];

  // Build aggregate discount percentage map from junction + line_discount tables
  const discountPercentMap = await buildDiscountPercentMap();

  // Fetch all RFIDs associated with these detail lines
  const detailIds = rawItems.map((item: any) => item.detail_id || item.id);
  const rfidMap = new Map<number, string[]>();

  if (detailIds.length > 0) {
    try {
      // Create a batched query to get all RFIDs for the relevant detail items
      const rfidRes = await repo.getRawRfidsByDetailIds(detailIds);

      const rfidData = rfidRes.data || [];
      for (const row of rfidData) {
        const dId = Number(row.sales_return_detail_id);
        const tag = String(row.rfid_tag);
        if (!rfidMap.has(dId)) {
          rfidMap.set(dId, []);
        }
        rfidMap.get(dId)!.push(tag);
      }
    } catch (err) {
      console.error("Failed to fetch rfids for details:", err);
    }
  }

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
        const percentage = discountPercentMap.get(discId) || 0;
        const gross = Number(detail.quantity) * Number(detail.unit_price);
        return Math.round(gross * (percentage / 100) * 100) / 100;
      })(),
      totalAmount: (() => {
        const gross = Number(detail.quantity) * Number(detail.unit_price);
        const discId = detail.discount_type
          ? Number(detail.discount_type)
          : null;
        if (!discId) return gross;
        const percentage = discountPercentMap.get(discId) || 0;
        return Math.round((gross - gross * (percentage / 100)) * 100) / 100;
      })(),
      reason: detail.reason || "",
      sales_return_type_id: detail.sales_return_type_id
        ? Number(detail.sales_return_type_id)
        : "",
      returnType: returnTypeObj ? returnTypeObj.type_name : "Good Order",
      rfidTags: rfidMap.get(detail.detail_id || detail.id) || [],
      priceA: product.priceA,
      priceB: product.priceB,
      priceC: product.priceC,
      priceD: product.priceD,
      priceE: product.priceE,
      unitMultiplier: product.unit_of_measurement_count || 1,
      unitOrder: unit ? unit.order : 0,
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
  priceTypes: PriceTypeOption[];
}> {
  const [salesmenRes, customersRes, branchesRes, lineDiscountsRes, returnTypesRes] =
    await repo.getRawReferences();

  // Fetch price types separately (not part of getRawReferences to avoid breaking the tuple)
  let priceTypesData: PriceTypeOption[] = [];
  try {
    const priceTypesRes = await repo.getRawPriceTypes();
    priceTypesData = ((priceTypesRes.data || []) as unknown as PriceTypeOption[]);
  } catch (err) {
    console.error("Failed to fetch price types:", err);
  }

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
    branchId: item.branch_code,
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

  // Enrich discount_type records with computed total_percent from junction + line_discount
  const discountPercentMap = await buildDiscountPercentMap();
  const rawDiscountTypes = (lineDiscountsRes.data || []) as any[];
  const enrichedLineDiscounts: API_LineDiscount[] = rawDiscountTypes.map((dt: any) => ({
    id: dt.id,
    discount_type: dt.discount_type,
    total_percent: String(dt.total_percent !== undefined && dt.total_percent !== null ? dt.total_percent : (discountPercentMap.get(dt.id) || 0)),
  }));

  return {
    salesmen,
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
  const catalogData = await repo.getRawProductCatalog();
  const [brandsRes, categoriesRes, suppliersRes, unitsRes, connectionsRes, productsRes] = catalogData;

  let scdpcRes = { data: [] as any[] };

  if (customerCode) {
    scdpcRes = await repo.getRawSupplierCategoryDiscount(customerCode);
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

  return {
    brands: (brandsRes.data || []) as unknown as Brand[],
    categories: (categoriesRes.data || []) as unknown as Category[],
    suppliers: (suppliersRes.data || []) as unknown as Supplier[],
    units: (unitsRes.data || []) as unknown as Unit[],
    connections: connections as ProductSupplierConnection[],
    supplierCategoryDiscount,
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
        ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(data.updated_at))
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
export async function submitReturn(payload: any, userId: number): Promise<any> {
  // Fetch line discounts for discount calculation
  const refsResult = await repo.getRawReferences();
  const returnTypes = (refsResult[4].data || []) as unknown as API_SalesReturnType[];

  // Build aggregate discount percentage map from junction + line_discount tables
  const lineDiscountMap = await buildDiscountPercentMap();

  const totalGross = payload.items.reduce(
    (sum: number, item: any) =>
      Math.round((sum + Number(item.quantity) * Number(item.unitPrice)) * 100) / 100,
    0,
  );

  const totalDiscount = payload.items.reduce(
    (sum: number, item: any) => {
      const gross = Math.round(Number(item.quantity) * Number(item.unitPrice) * 100) / 100;
      const discId = item.discountType ? Number(item.discountType) : null;
      const percentage = discId ? lineDiscountMap.get(discId) || 0 : 0;
      const discount = Math.round(gross * (percentage / 100) * 100) / 100;
      return Math.round((sum + discount) * 100) / 100;
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
    created_by: userId,
    invoice_no: payload.invoiceNo || "",
    customer_code: payload.customer || payload.customerCode,
    salesman_id: cleanId(payload.salesmanId),
    total_amount: Math.round(Number(payload.totalAmount) * 100) / 100,
    status: "Pending",
    return_date: formattedDate,
    price_type: payload.priceType || "A",
    remarks: payload.remarks || "Created via Web App",
    order_id: payload.orderNo || "",
    isThirdParty: payload.isThirdParty ? 1 : 0,
    created_at: nowPH(),
    updated_at: nowPH(),
  };

  const headerResult = await repo.createReturnHeader(headerPayload);
  const headerData = headerResult.data as any;
  const finalReturnNo = headerData?.return_number || generatedReturnNo;
  const returnId = headerData?.id;

  // 🟢 Handle Optional Junction Link to Invoice
  if (payload.appliedInvoiceId && returnId) {
    try {
      const returnAmount = Math.round(Number(payload.totalAmount) * 100) / 100;
      await repo.createJunctionLink({
        return_no: returnId,
        invoice_no: payload.appliedInvoiceId,
        linked_by: userId,
        amount: returnAmount,
        created_at: nowPH(),
        updated_at: nowPH(),
      });
    } catch (e) {
      console.error("Failed to create junction link during submission", e);
    }
  }

  const detailPromises = payload.items.map(async (item: any) => {
    const matchedType = returnTypes.find(
      (t: API_SalesReturnType) => t.type_name === item.returnType,
    );
    const typeId = matchedType
      ? matchedType.type_id
      : returnTypes[0]?.type_id || 1;

    const gross = Math.round(Number(item.quantity) * Number(item.unitPrice) * 100) / 100;
    const discId =
      item.discountType && item.discountType !== ""
        ? Number(item.discountType)
        : null;
    const percentage = discId ? lineDiscountMap.get(discId) || 0 : 0;
    const discountAmt = Math.round(gross * (percentage / 100) * 100) / 100;

    const detailPayload = {
      return_no: finalReturnNo,
      product_id: Number(item.productId || item.product_id || item.id),
      quantity: Number(item.quantity),
      unit_price: Number(item.unitPrice),
      gross_amount: gross,
      discount_amount: discountAmt,
      total_amount: Math.round((gross - discountAmt) * 100) / 100,
      sales_return_type_id: typeId,
      discount_type: discId,
      reason: item.reason || null,
      created_at: nowPH(),
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
            created_by: userId,
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
export async function updateReturn(
  payload: {
    returnId: number;
    returnNo: string;
    items: any[];
    remarks: string;
    invoiceNo?: string;
    orderNo?: string;
    appliedInvoiceId?: number | null;
    isThirdParty?: boolean;
  },
  userId: number,
): Promise<any> {
  // Fetch line discounts
  const refsResult = await repo.getRawReferences();
  const returnTypes = (refsResult[4].data || []) as unknown as API_SalesReturnType[];

  // Build aggregate discount percentage map from junction + line_discount tables
  const lineDiscountMap = await buildDiscountPercentMap();

  const totalGross = payload.items.reduce(
    (sum: number, item: any) =>
      Math.round((sum + Number(item.quantity) * Number(item.unitPrice)) * 100) / 100,
    0,
  );

  const totalDiscount = payload.items.reduce(
    (sum: number, item: any) => {
      const gross = Math.round(Number(item.quantity) * Number(item.unitPrice) * 100) / 100;
      const discId =
        item.discountType &&
          item.discountType !== "No Discount" &&
          item.discountType !== ""
          ? Number(item.discountType)
          : null;
      const percentage = discId ? lineDiscountMap.get(discId) || 0 : 0;
      const discount = Math.round(gross * (percentage / 100) * 100) / 100;
      return Math.round((sum + discount) * 100) / 100;
    },
    0,
  );

  const totalNet = Math.round((totalGross - totalDiscount) * 100) / 100;

  const headerPayload = {
    remarks: payload.remarks ?? "",
    gross_amount: totalGross,
    discount_amount: totalDiscount,
    total_amount: totalNet,
    invoice_no: payload.invoiceNo ?? "",
    order_id: payload.orderNo ?? "",
    isThirdParty: payload.isThirdParty ? 1 : 0,
    updated_at: nowPH(),
  };

  await repo.updateReturnHeader(payload.returnId, headerPayload);

  // 🟢 Handle Junction Table with explicit Unlinking (null check)
  if (payload.hasOwnProperty("appliedInvoiceId")) {
    try {
      const linkResult = await repo.getJunctionLink(payload.returnId);
      const existingLinks = (linkResult.data || []) as any[];

      if (payload.appliedInvoiceId) {
        // Link or Update
        if (existingLinks.length > 0) {
          const linkId = existingLinks[0].id;
          await repo.updateJunctionLink(linkId, {
            invoice_no: payload.appliedInvoiceId,
            linked_by: userId,
            amount: totalNet,
            updated_at: nowPH(),
          });
        } else {
          await repo.createJunctionLink({
            return_no: payload.returnId,
            invoice_no: payload.appliedInvoiceId,
            linked_by: userId,
            amount: totalNet,
            created_at: nowPH(),
            updated_at: nowPH(),
          });
        }
      } else if (payload.appliedInvoiceId === null && existingLinks.length > 0) {
        // Explicit Unlink (Delete)
        const linkId = existingLinks[0].id;
        await repo.deleteJunctionLink(linkId);
      }
    } catch (e) {
      console.error("Failed to sync junction link:", e);
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

    const gross = Math.round(Number(item.quantity) * Number(item.unitPrice) * 100) / 100;
    const discId =
      item.discountType &&
        item.discountType !== "No Discount" &&
        item.discountType !== ""
        ? Number(item.discountType)
        : null;
    const percentage = discId ? lineDiscountMap.get(discId) || 0 : 0;
    const discountAmt = Math.round(gross * (percentage / 100) * 100) / 100;

    const detailPayload = {
      quantity: Number(item.quantity),
      unit_price: Number(item.unitPrice),
      gross_amount: gross,
      discount_amount: discountAmt,
      total_amount: Math.round((gross - discountAmt) * 100) / 100,
      sales_return_type_id: typeId,
      discount_type: discId,
      reason: item.reason || null,
      updated_at: nowPH(),
    };

    if (typeof item.id === "string" && item.id.startsWith("added-")) {
      const detailResult = await repo.createReturnDetail({
        ...detailPayload,
        return_no: payload.returnNo,
        product_id: Number(item.productId || item.product_id),
        created_at: nowPH(),
      });

      // Save RFID tags for newly added items
      if (item.rfidTags && Array.isArray(item.rfidTags) && item.rfidTags.length > 0) {
        const detailId = (detailResult.data as any)?.detail_id;
        if (detailId) {
          for (const tag of item.rfidTags) {
            await repo.createRfidTag({
              sales_return_detail_id: detailId,
              rfid_tag: tag,
              created_by: userId,
            });
          }
        }
      }
    } else {
      await repo.updateReturnDetail(item.id, detailPayload);

      // 🟢 Sync RFID Tags for existing items
      if (item.rfidTags && Array.isArray(item.rfidTags)) {
        // 1. Fetch current tags from DB
        const existingTagsRes = await repo.getRfidTagsByDetailId(item.id);
        const existingTags = (existingTagsRes.data || []) as any[];

        // 2. Identify tags to delete
        const tagsToDelete = existingTags.filter(et => !item.rfidTags.includes(et.rfid_tag));
        for (const t of tagsToDelete) {
          await repo.deleteRfidTag(t.id);
        }

        // 3. Identify tags to add
        const currentTagStrings = existingTags.map(et => et.rfid_tag);
        const tagsToAdd = item.rfidTags.filter((tag: string) => !currentTagStrings.includes(tag));
        for (const tag of tagsToAdd) {
          await repo.createRfidTag({
            sales_return_detail_id: item.id,
            rfid_tag: tag,
            created_by: userId,
          });
        }
      }
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
  isReceived?: number,
  received_at?: string,
): Promise<any> {
  return repo.updateReturnStatus(id, status, isReceived, received_at);
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
 * Checks if an RFID tag is already present in any sales return record.
 */
export async function checkRfidDuplicate(rfidTag: string) {
  const result = await repo.checkRfidDuplicate(rfidTag);
  if (result.data && result.data.length > 0) {
    const firstMatch = result.data[0];
    const returnNo = (firstMatch.sales_return_detail_id as any)?.return_no || "Unknown";
    return {
      isDuplicate: true,
      returnNo,
    };
  }
  return { isDuplicate: false };
}

/**
 * Looks up an RFID tag to find the associated product and returns product info.
 * Used for automatic product addition on RFID scan.
 */
export async function lookupRfid(
  rfidTag: string,
  branchId: number,
  token: string,
): Promise<{ isOnInventory: boolean; productId?: number } | null> {
  const SPRING_URL = process.env.SPRING_API_BASE_URL;
  if (!SPRING_URL) throw new Error("SPRING_API_BASE_URL is not defined");

  const targetUrl = `${SPRING_URL.replace(/\/$/, "")}/api/view-rfid-onhand?rfid=${encodeURIComponent(rfidTag)}&branch_id=${branchId}`;

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { isOnInventory: false };
    }

    const results = await res.json();
    const isOnInventory = Array.isArray(results) && results.length > 0;
    const productId = isOnInventory ? Number(results[0].productId) : undefined;

    return { isOnInventory, productId };
  } catch (err) {
    console.error("[Sales Return RFID] Product lookup failed:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}
