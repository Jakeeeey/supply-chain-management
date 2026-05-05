import { SummaryFilters, SummaryResult, SummaryReturnHeader, SummaryReturnItem } from "../type";
import * as Repo from "./sales-return-summary.repo";
import * as Helpers from "./sales-return-summary.helpers";

interface LookupData {
  customerMap: Map<string, any>;
  salesmanMap: Map<string, any>;
  returnTypeMap: Map<string, any>;
  lineDiscountMap: Map<string, { name: string; percentage: number }>;
  brandMap: Map<string, any>;
  supplierMap: Map<string, any>;
  unitMap: Map<string, string>;
  categoryMap: Map<string, string>;
  suppliersByProduct: Map<string, Set<string>>;
  rawCustomers: any[];
  rawSalesmen: any[];
  rawBranches: any[];
  rawSuppliers: any[];
  rawReturnTypes: any[];
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
  ]);

  const extractData = (req: PromiseSettledResult<{ data: any[] }>) => 
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

  const customerMap = new Map<string, any>();
  for (const c of customers) customerMap.set(String(c.customer_code), c);

  const salesmanMap = new Map<string, any>();
  for (const s of salesmen) salesmanMap.set(String(s.id), s);

  const returnTypeMap = new Map<string, any>();
  for (const t of returnTypes) returnTypeMap.set(String(t.type_id), t);

  const lineDiscountMap = new Map<string, { name: string; percentage: number }>();
  for (const d of lineDiscounts) {
    lineDiscountMap.set(String(d.id), {
      name: d.line_discount,
      percentage: parseFloat(d.percentage) || 0,
    });
  }

  const brandMap = new Map<string, any>();
  for (const b of brands) brandMap.set(String(b.brand_id), b);

  const activeSuppliers = suppliersAll.filter((s: any) => Helpers.parseBoolean(s.nonBuy) === false);
  const supplierMap = new Map<string, any>();
  for (const s of activeSuppliers) supplierMap.set(String(s.id), s);

  const unitMap = new Map<string, string>();
  for (const u of units) unitMap.set(String(u.unit_id), u.unit_name);

  const categoryMap = new Map<string, string>();
  for (const c of categories) categoryMap.set(String(c.category_id), c.category_name);

  const suppliersByProduct = new Map<string, Set<string>>();
  for (const row of ppsAll) {
    const prodId = typeof row.product_id === "object" ? String(row.product_id?.product_id || row.product_id?.id) : String(row.product_id);
    const supId = typeof row.supplier_id === "object" ? String(row.supplier_id?.id) : String(row.supplier_id);
    const sup = supplierMap.get(supId);
    if (sup) {
      if (!suppliersByProduct.has(prodId)) suppliersByProduct.set(prodId, new Set());
      suppliersByProduct.get(prodId)!.add(String(sup.supplier_shortcut));
    }
  }

  lookupCache = {
    customerMap,
    salesmanMap,
    returnTypeMap,
    lineDiscountMap,
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
  return lookups.rawCustomers.map((c: any) => ({
    value: c.customer_code,
    label: c.customer_name || c.store_name || c.customer_code,
    store: c.store_name || "",
  }));
}

export async function getSalesmenList() {
  const lookups = await fetchLookups();
  return lookups.rawSalesmen.map((s: any) => {
    const b = lookups.rawBranches.find((x: any) => String(x.id) === String(s.branch_code));
    return {
      value: String(s.id),
      label: s.salesman_name,
      code: s.salesman_code || "",
      branch: b?.branch_name || "",
    };
  });
}

export async function getSuppliersList() {
  const lookups = await fetchLookups();
  return lookups.rawSuppliers.map((s: any) => ({
    id: s.id,
    name: s.supplier_shortcut,
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

  const returnNos: string[] = parentsRaw.map((r: any) => String(r.return_number)).filter(Boolean);

  let allDetails: any[] = [];
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
    const returnNo = String(d.return_no);
    const product = d.product_id || {};
    const baseProdId = String(product.parent_id || product.product_id || "");

    const brandId =
      product.product_brand && typeof product.product_brand === "object"
        ? String(product.product_brand.brand_id)
        : String(product.product_brand || "");

    const returnTypeName = lookups.returnTypeMap.get(String(d.sales_return_type_id))?.type_name || "";

    const unitId =
      product.unit_of_measurement && typeof product.unit_of_measurement === "object"
        ? String(product.unit_of_measurement.unit_id)
        : String(product.unit_of_measurement || "");

    const catId =
      product.product_category && typeof product.product_category === "object"
        ? String(product.product_category.category_id)
        : String(product.product_category || "");

    const discountData = lookups.lineDiscountMap.get(String(d.discount_type));
    const discountApplied = discountData ? discountData.name : "No Discount";

    const qty = Helpers.toNum(d.quantity);
    const price = Helpers.toNum(d.unit_price);
    const calculatedGross = Helpers.roundToTwo(qty * price);
    const discountPercentage = discountData ? discountData.percentage : 0;
    const discountAmt = Helpers.calculateDiscount(calculatedGross, discountPercentage);
    const calculatedNet = Helpers.roundToTwo(calculatedGross - discountAmt);

    const item: SummaryReturnItem = {
      detailId: d.detail_id,
      returnNo,
      productCode: product.product_code || "",
      productName: product.product_name || "",
      brandName: lookups.brandMap.get(brandId)?.brand_name || "",
      unit: lookups.unitMap.get(unitId) || "Pcs",
      productCategory: lookups.categoryMap.get(catId) || "-",
      supplierName: supplierNamesFor(baseProdId),
      returnCategory: returnTypeName,
      specificReason: d.reason || "",
      quantity: qty,
      unitPrice: price,
      grossAmount: calculatedGross,
      discountAmount: discountAmt,
      discountApplied,
      netAmount: calculatedNet,
    };

    if (!detailsByReturnNo.has(returnNo)) detailsByReturnNo.set(returnNo, []);
    detailsByReturnNo.get(returnNo)!.push(item);
  }

  let data: SummaryReturnHeader[] = parentsRaw.map((r: any) => {
    const cust = lookups.customerMap.get(String(r.customer_code));
    const sm = lookups.salesmanMap.get(String(r.salesman_id));
    const rawItems = detailsByReturnNo.get(String(r.return_number)) || [];
    const items = rawItems.map((item) => ({
      ...item,
      invoiceNo: r.invoice_no || "-",
    }));

    return {
      returnId: r.return_id,
      returnNumber: r.return_number,
      returnDate: r.return_date,
      returnStatus: r.status,
      customerName: cust?.customer_name || "",
      storeName: cust?.store_name || "",
      salesmanName: sm?.salesman_name || "",
      invoiceNo: r.invoice_no || "",
      netTotal: Helpers.toNum(r.total_amount),
      remarks: r.remarks || "",
      items,
    };
  });

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
