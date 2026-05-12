/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SalesReturn, SalesReturnItem, SalesReturnStatusCard, Unit, API_SalesReturnType } from "../types/sales-return.types";
import { parseBoolean } from "./sales-return.helpers";
import * as queryRepo from "./sales-return-query.repo";
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
 * Fetches paginated sales return list.
 * @param page The page number to fetch.
 * @param limit The number of records per page.
 * @param filters Filters for salesman, customer, status, invoiceNo.
 * @returns A promise resolving to the data and total count.
 */
export async function fetchReturns(
  page: number = 1,
  limit: number = 10,
  filters: { salesman?: string; customer?: string; status?: string; invoiceNo?: string } = {},
): Promise<{ data: SalesReturn[]; total: number }> {
  const result = await queryRepo.getRawReturns(page, limit, filters);

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
    receivedAt: item.received_at
      ? new Date(item.received_at).toLocaleDateString()
      : "-",
  }));

  return { data: mappedData, total: result.meta?.filter_count || 0 };
}

/**
 * Fetches return detail line items with product/unit/discount enrichment.
 * @param returnId The ID of the return.
 * @param returnNo The Return Number string.
 * @returns A promise resolving to the list of enriched SalesReturnItems.
 */
export async function fetchReturnDetails(
  returnId: number,
  returnNo: string,
): Promise<SalesReturnItem[]> {
  if (!returnNo) return [];

  const [detailsRes, unitsRes, returnTypesRes] =
    await Promise.all([
      queryRepo.getRawReturnDetails(returnNo),
      lookupRepo.getRawUnits(),
      lookupRepo.getRawReferences().then((refs) => refs[4]),
    ]);

  const rawItems = detailsRes.data || [];
  const units = (unitsRes.data || []) as unknown as Unit[];
  const returnTypes = (returnTypesRes.data || []) as unknown as API_SalesReturnType[];

  const discountPercentMap = await buildDiscountPercentMap();

  const detailIds = rawItems.map((item: any) => item.detail_id || item.id);
  const serialMap = new Map<number, string[]>();

  if (detailIds.length > 0) {
    try {
      const serialRes = await lookupRepo.getRawSerialsByDetailIds(detailIds);
      const serialData = serialRes.data || [];
      for (const row of serialData) {
        const dId = Number(row.sales_return_detail_id);
        const sn = String(row.serial_number);
        if (!serialMap.has(dId)) {
          serialMap.set(dId, []);
        }
        serialMap.get(dId)!.push(sn);
      }
    } catch (err) {
      console.error("Failed to fetch serials for details:", err);
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
      id: detail.id || detail.detail_id,
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
      serialNumbers: serialMap.get(detail.id || detail.detail_id) || [],
      priceA: product.priceA,
      priceB: product.priceB,
      priceC: product.priceC,
      priceD: product.priceD,
      priceE: product.priceE,
      unitMultiplier: product.unit_of_measurement_count || 1,
      unitOrder: unit ? unit.order : 0,
      isSerialized: product.is_serialized === 1,
    } as SalesReturnItem;
  });
}

/**
 * Fetches the status card data for a return.
 * @param returnId The ID of the return.
 * @returns A promise resolving to the status card data or null.
 */
export async function fetchStatusCard(
  returnId: number,
): Promise<SalesReturnStatusCard | null> {
  try {
    const result = await queryRepo.getRawReturnById(returnId);
    const data = result.data as any;

    let appliedToText = "-";
    try {
      const linkRes = await lookupRepo.getRawLinkedInvoice(returnId);
      const linkData = (linkRes.data || []) as any[];
      if (linkData.length > 0) {
        const linkedRec = linkData[0];
        if (linkedRec.invoice_no && linkedRec.invoice_no.invoice_no) {
          appliedToText = linkedRec.invoice_no.invoice_no;
        }
      }
    } catch {
      // Ignore
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
