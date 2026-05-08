import { SummaryFilters, SummaryResult, SummaryReturnHeader, SummaryReturnItem } from "../type";
import * as Repo from "./sales-return-summary.repo";
import * as Helpers from "./sales-return-summary.helpers";

interface LookupData {
  customerMap: Map<string, Record<string, unknown>>;
  salesmanMap: Map<string, Record<string, unknown>>;
  returnTypeMap: Map<string, Record<string, unknown>>;
  discountTypeMap: Map<string, { name: string; percentage: number }>;
  brandMap: Map<string, Record<string, unknown>>;
  supplierMap: Map<string, Record<string, unknown>>;
  unitMap: Map<string, string>;
  categoryMap: Map<string, string>;
  suppliersByProduct: Map<string, Set<string>>;
  rawCustomers: Record<string, unknown>[];
  rawSalesmen: Record<string, unknown>[];
  rawBranches: Record<string, unknown>[];
  rawSuppliers: Record<string, unknown>[];
  rawReturnTypes: Record<string, unknown>[];
}

// ─── LOOKUP CACHE (Server Side) ────────────────────────────────────────────────
let lookupCache: LookupData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchLookups(): Promise<LookupData> {
  if (lookupCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return lookupCache;
  }

  const [
    customersReq,
    salesmenReq,
    branchesReq,
    returnTypesReq,
    lineDiscountsReq,
    brandsReq,
    suppliersAllReq,
    unitsReq,
    categoriesReq,
    ppsAllReq,
    discountTypesReq,
    junctionReq,
  ] = await Promise.allSettled([
    Repo.fetchCustomers(),
    Repo.fetchSalesmen(),
    Repo.fetchBranches(),
    Repo.fetchReturnTypes(),
    Repo.fetchLineDiscounts(),
    Repo.fetchBrands(),
    Repo.fetchSuppliers(),
    Repo.fetchUnits(),
    Repo.fetchCategories(),
    Repo.fetchProductPerSupplier(),
    Repo.fetchDiscountTypes(),
    Repo.fetchLinePerDiscountType(),
  ]);

  const extractData = (req: PromiseSettledResult<{ data: Record<string, unknown>[] }>) => 
    req.status === 'fulfilled' ? req.value.data : [];

  const customers = extractData(customersReq);
  const salesmen = extractData(salesmenReq);
  const branches = extractData(branchesReq);
  const returnTypes = extractData(returnTypesReq);
  const lineDiscounts = extractData(lineDiscountsReq);
  const brands = extractData(brandsReq);
  const suppliersAll = extractData(suppliersAllReq);
  const units = extractData(unitsReq);
  const categories = extractData(categoriesReq);
  const ppsAll = extractData(ppsAllReq);

  const customerMap = new Map<string, Record<string, unknown>>();
  for (const c of customers) customerMap.set(String(c["customer_code"]), c);

  const salesmanMap = new Map<string, Record<string, unknown>>();
  for (const s of salesmen) salesmanMap.set(String(s["id"]), s);

  const returnTypeMap = new Map<string, Record<string, unknown>>();
  for (const t of returnTypes) returnTypeMap.set(String(t["type_id"]), t);

  const discountTypes = extractData(discountTypesReq);
  const junctions = extractData(junctionReq);

  // 1. Build line_discount percentage map
  const linePercentMap = new Map<string, number>();
  for (const d of lineDiscounts) {
    linePercentMap.set(String(d["id"]), parseFloat(String(d["percentage"] || "0")) || 0);
  }

  // 2. Build aggregate discountTypeMap using junction
  const discountTypeMap = new Map<string, { name: string; percentage: number }>();
  
  // First, initialize with names from discount_type collection
  for (const dt of discountTypes) {
    discountTypeMap.set(String(dt["id"]), {
      name: String(dt["discount_type"] || ""),
      percentage: 0,
    });
  }

  // Then, sum percentages through junction line_per_discount_type
  for (const j of junctions) {
    const typeId = String(j["type_id"]);
    const lineId = String(j["line_id"]);
    const existing = discountTypeMap.get(typeId);
    if (existing) {
      const linePct = linePercentMap.get(lineId) || 0;
      existing.percentage += linePct;
    }
  }

  const brandMap = new Map<string, Record<string, unknown>>();
  for (const b of brands) brandMap.set(String(b["brand_id"]), b);

  const activeSuppliers = suppliersAll.filter((s: Record<string, unknown>) => Helpers.parseBoolean(s["nonBuy"]) === false);
  const supplierMap = new Map<string, Record<string, unknown>>();
  for (const s of activeSuppliers) supplierMap.set(String(s["id"]), s);

  const unitMap = new Map<string, string>();
  for (const u of units) unitMap.set(String(u["unit_id"]), String(u["unit_shortcut"] || u["unit_name"] || ""));

  const categoryMap = new Map<string, string>();
  for (const c of categories) categoryMap.set(String(c["category_id"]), String(c["category_name"] || ""));

  const suppliersByProduct = new Map<string, Set<string>>();
  for (const row of ppsAll) {
    const rawProd = row["product_id"];
    const rawSup = row["supplier_id"];

    const prodId = typeof rawProd === "object" && rawProd !== null 
      ? String((rawProd as Record<string, unknown>)["product_id"] || (rawProd as Record<string, unknown>)["id"] || "") 
      : String(rawProd || "");

    const supId = typeof rawSup === "object" && rawSup !== null 
      ? String((rawSup as Record<string, unknown>)["id"] || "") 
      : String(rawSup || "");

    const sup = supplierMap.get(supId);
    if (sup) {
      if (!suppliersByProduct.has(prodId)) suppliersByProduct.set(prodId, new Set());
      suppliersByProduct.get(prodId)!.add(String(sup["supplier_shortcut"] || sup["supplier_name"] || ""));
    }
  }

  lookupCache = {
    customerMap,
    salesmanMap,
    returnTypeMap,
    discountTypeMap,
    brandMap,
    supplierMap,
    unitMap,
    categoryMap,
    suppliersByProduct,
    rawCustomers: customers,
    rawSalesmen: salesmen,
    rawBranches: branches,
    rawSuppliers: activeSuppliers,
    rawReturnTypes: returnTypes,
  };
  cacheTimestamp = Date.now();
  return lookupCache;
}

export async function getCustomersList() {
  const lookups = await fetchLookups();
  return lookups.rawCustomers.map((c) => ({
    value: String(c.customer_code),
    label: String(c.customer_name || c.store_name || c.customer_code),
    store: String(c.store_name || ""),
  }));
}

export async function getSalesmenList() {
  const lookups = await fetchLookups();
  return lookups.rawSalesmen.map((s) => {
    const b = lookups.rawBranches.find((x) => String(x.id) === String(s.branch_code));
    return {
      value: String(s.id),
      label: String(s.salesman_name),
      code: String(s.salesman_code || ""),
      branch: String(b?.branch_name || ""),
    };
  });
}

export async function getSuppliersList() {
  const lookups = await fetchLookups();
  return lookups.rawSuppliers.map((s) => ({
    id: String(s.id),
    name: String(s.supplier_name),
    shortcut: String(s.supplier_shortcut),
  }));
}

export async function getSalesReturnTypesList() {
  const lookups = await fetchLookups();
  return lookups.rawReturnTypes;
}

export async function getSummaryReturnsWithItems(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  filters: SummaryFilters = {}
): Promise<SummaryResult> {
  const f = Helpers.normalizeFilters(filters);
  const lookups = await fetchLookups();

  const parentRes = await Repo.fetchSalesReturnHeaders(page, limit, search, f);
  const parentsRaw = parentRes.data || [];
  let total = parentRes.meta?.filter_count || 0;

  const returnNos: string[] = parentsRaw.map((r: Record<string, unknown>) => String(r["return_number"] || "")).filter(Boolean);

  let allDetails: Record<string, unknown>[] = [];
  if (returnNos.length > 0) {
    const detailChunks = Helpers.chunkArray(returnNos, 50);
    const results = await Promise.all(
      detailChunks.map(async (list) => {
        const res = await Repo.fetchSalesReturnDetails(list);
        return res.data || [];
      })
    );
    allDetails = results.flat();
  }

  const supplierNamesFor = (baseProdId: string): string => {
    const set = lookups.suppliersByProduct.get(baseProdId);
    return set ? Array.from(set).sort().join(", ") : "";
  };

  const detailsByReturnNo = new Map<string, SummaryReturnItem[]>();
  for (const d of allDetails) {
    const returnNo = String(d["return_no"] || "").trim();
    const rawProduct = d["product_id"];
    const product = (typeof rawProduct === "object" && rawProduct !== null ? rawProduct : {}) as Record<string, unknown>;
    const productIdFromRaw = (typeof rawProduct === "number" || typeof rawProduct === "string") ? String(rawProduct) : "";

    const baseProdId = String(product["parent_id"] || product["product_id"] || productIdFromRaw || "");

    const brandId =
      product["product_brand"] && typeof product["product_brand"] === "object"
        ? String((product["product_brand"] as Record<string, unknown>)["brand_id"])
        : String(product["product_brand"] || "");

    const returnTypeName = String(lookups.returnTypeMap.get(String(d["sales_return_type_id"]))?.["type_name"] || "");

    const unitId =
      product["unit_of_measurement"] && typeof product["unit_of_measurement"] === "object"
        ? String((product["unit_of_measurement"] as Record<string, unknown>)["unit_id"])
        : String(product["unit_of_measurement"] || "");

    const catId =
      product["product_category"] && typeof product["product_category"] === "object"
        ? String((product["product_category"] as Record<string, unknown>)["category_id"])
        : String(product["product_category"] || "");

    const discountData = lookups.discountTypeMap.get(String(d["discount_type"]));
    const discountApplied = discountData ? discountData.name : "No Discount";

    const qty = Helpers.toNum(d["quantity"]);
    const price = Helpers.toNum(d["unit_price"]);
    
    // 🟢 Trust the amounts saved by the Sales Return module
    const grossAmount = Helpers.toNum(d["gross_amount"]) || Helpers.roundToTwo(qty * price);
    const discountAmount = Helpers.toNum(d["discount_amount"]) || 0;
    const netAmount = Helpers.toNum(d["total_amount"]) || Helpers.roundToTwo(grossAmount - discountAmount);

    const item: SummaryReturnItem = {
      detailId: String(d["detail_id"]),
      returnNo,
      productCode: String(product["product_code"] || ""),
      productName: String(product["product_name"] || ""),
      brandName: String(lookups.brandMap.get(brandId)?.["brand_name"] || ""),
      unit: String(lookups.unitMap.get(unitId) || "Pcs"),
      productCategory: String(lookups.categoryMap.get(catId) || "-"),
      supplierName: supplierNamesFor(baseProdId),
      returnCategory: returnTypeName,
      specificReason: String(d["reason"] || ""),
      quantity: qty,
      unitPrice: price,
      grossAmount,
      discountAmount,
      discountApplied,
      netAmount,
    };

    if (!detailsByReturnNo.has(returnNo)) detailsByReturnNo.set(returnNo, []);
    detailsByReturnNo.get(returnNo)!.push(item);
  }

  let data: SummaryReturnHeader[] = parentsRaw.map((r: Record<string, unknown>) => {
    const cust = lookups.customerMap.get(String(r["customer_code"]));
    const sm = lookups.salesmanMap.get(String(r["salesman_id"]));
    const rawItems = detailsByReturnNo.get(String(r["return_number"])) || [];
    const items = rawItems.map((item) => ({
      ...item,
      invoiceNo: String(r["invoice_no"] || "-"),
    }));

    return {
      returnId: String(r["return_id"] || ""),
      returnNumber: String(r["return_number"] || "").trim(),
      returnDate: String(r["return_date"] || ""),
      returnStatus: String(r["status"] || ""),
      customerName: String(cust?.["customer_name"] || ""),
      storeName: String(cust?.["store_name"] || ""),
      salesmanName: String(sm?.["salesman_name"] || ""),
      invoiceNo: String(r["invoice_no"] || ""),
      netTotal: Helpers.toNum(r["total_amount"]),
      remarks: String(r["remarks"] || ""),
      items,
    };
  }).filter(row => row.items.length > 0);

  if (f.supplierName && f.supplierName !== "All") {
    const needle = String(f.supplierName).toLowerCase();
    data = data
      .map((row) => ({
        ...row,
        items: row.items.filter((it) => (it.supplierName || "").toLowerCase().includes(needle)),
      }))
      .filter((row) => row.items.length > 0);
    total = data.length;
  }

  if (f.returnCategory && f.returnCategory !== "All") {
    const cat = String(f.returnCategory).toLowerCase();
    data = data
      .map((row) => ({
        ...row,
        items: row.items.filter((it) => (it.returnCategory || "").toLowerCase() === cat),
      }))
      .filter((row) => row.items.length > 0);
    total = data.length;
  }

  return { data, total };
}
