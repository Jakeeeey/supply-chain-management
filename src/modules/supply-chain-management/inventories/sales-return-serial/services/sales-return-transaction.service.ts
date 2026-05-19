/* eslint-disable @typescript-eslint/no-explicit-any */
import { 
  CreateSalesReturnSchema, 
  UpdateSalesReturnSchema, 
  UpdateSalesReturnStatusSchema,
  type CreateSalesReturnPayload,
  type UpdateSalesReturnPayload
} from "../types/sales-return.schema";
import type { API_SalesReturnType } from "../types/sales-return.types";
import { formatDateForAPI, cleanId } from "./sales-return.helpers";
import * as transactionRepo from "./sales-return-transaction.repo";
import * as lookupRepo from "./sales-return-lookup.repo";
import { fetchReturnDetails } from "./sales-return-query.service";

/**
 * Builds a Map<discount_type_id, total_percentage> for transactions.
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
 * Creates a new sales return (header + details + serials).
 * @param rawPayload The unvalidated payload object.
 * @param userId The ID of the user creating the return.
 * @returns A promise resolving to the creation result.
 */
export async function submitReturn(rawPayload: any, userId: number): Promise<any> {
  const payload: CreateSalesReturnPayload = CreateSalesReturnSchema.parse(rawPayload);

  const refsResult = await lookupRepo.getRawReferences();
  const returnTypes = (refsResult[4].data || []) as unknown as API_SalesReturnType[];
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

  const totalNet = Math.round((totalGross - totalDiscount) * 100) / 100;

  // We rely on current date if not provided in payload (CreateSalesReturnSchema doesn't have returnDate currently)
  // Or we can just use new Date() if returnDate is removed from payload. Assuming new Date() for now.
  const formattedDate = formatDateForAPI(new Date());
  const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
  const shortTimestamp = Math.floor(Date.now() / 1000).toString().slice(-4);
  const generatedReturnNo = `SR-${shortTimestamp}-${uniqueSuffix}`;

  const headerPayload = {
    return_number: generatedReturnNo,
    gross_amount: totalGross,
    discount_amount: totalDiscount,
    created_by: userId,
    invoice_no: payload.invoiceNo || "",
    customer_code: payload.customerCode,
    salesman_id: cleanId(payload.salesmanId),
    total_amount: totalNet,
    status: "Pending",
    return_date: formattedDate,
    price_type: payload.priceType || "A",
    remarks: payload.remarks || "Created via Web App",
    order_id: payload.orderNo || "",
    isThirdParty: rawPayload.isThirdParty ? 1 : 0, // Fallback if isThirdParty not in schema
    received_at: null,
  };

  const headerResult = await transactionRepo.createReturnHeader(headerPayload);
  const headerData = headerResult.data as any;
  const finalReturnNo = headerData?.return_number || generatedReturnNo;
  const returnId = headerData?.id;

  if (rawPayload.appliedInvoiceId && returnId) {
    try {
      await transactionRepo.createJunctionLink({
        return_no: returnId,
        invoice_no: rawPayload.appliedInvoiceId,
        linked_by: userId,
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
      product_id: Number(item.productId),
      quantity: Number(item.quantity),
      unit_price: Number(item.unitPrice),
      gross_amount: gross,
      discount_amount: discountAmt,
      total_amount: Math.round((gross - discountAmt) * 100) / 100,
      sales_return_type_id: typeId,
      discount_type: discId,
      reason: item.reason || null,
    };

    const detailResult = await transactionRepo.createReturnDetail(detailPayload);

    // Save Serials if present
    if (item.serialNumbers && Array.isArray(item.serialNumbers) && item.serialNumbers.length > 0) {
      const detailId = (detailResult.data as any)?.detail_id || (detailResult.data as any)?.id;
      if (detailId) {
        for (const sn of item.serialNumbers) {
          await transactionRepo.createSerialRecord({
            sales_return_detail_id: detailId,
            serial_number: sn,
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
 * Updates an existing sales return (header + details + serials).
 * @param rawPayload The unvalidated payload object.
 * @param userId The ID of the user updating the return.
 * @returns A promise resolving to the update result.
 */
export async function updateReturn(
  rawPayload: any,
  userId: number,
): Promise<any> {
  const payload: UpdateSalesReturnPayload = UpdateSalesReturnSchema.parse(rawPayload);

  const refsResult = await lookupRepo.getRawReferences();
  const returnTypes = (refsResult[4].data || []) as unknown as API_SalesReturnType[];
  const lineDiscountMap = await buildDiscountPercentMap();

  const items = payload.items || [];

  const totalGross = items.reduce(
    (sum: number, item: any) =>
      Math.round((sum + Number(item.quantity) * Number(item.unitPrice)) * 100) / 100,
    0,
  );

  const totalDiscount = items.reduce(
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
    isThirdParty: rawPayload.isThirdParty ? 1 : 0,
  };

  await transactionRepo.updateReturnHeader(payload.id as number, headerPayload);

  // Handle junction
  const hasAppliedInvoiceProp = Object.prototype.hasOwnProperty.call(rawPayload, "appliedInvoiceId");

  if (hasAppliedInvoiceProp) {
    try {
      const linkResult = await lookupRepo.getJunctionLink(payload.id as number);
      const existingLinks = (linkResult.data || []) as any[];

      if (rawPayload.appliedInvoiceId) {
        if (existingLinks.length > 0) {
          await transactionRepo.updateJunctionLink(existingLinks[0].id, {
            invoice_no: rawPayload.appliedInvoiceId,
            linked_by: userId,
          });
        } else {
          await transactionRepo.createJunctionLink({
            return_no: payload.id,
            invoice_no: rawPayload.appliedInvoiceId,
            linked_by: userId,
          });
        }
      } else {
        // Unlink if it was explicitly set to null/falsy
        if (existingLinks.length > 0) {
          await transactionRepo.deleteJunctionLink(existingLinks[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to update junction link during update", e);
    }
  }

  const currentItems = await fetchReturnDetails(payload.id as number, payload.returnNo as string);
  const payloadIds = items
    .filter((item: any) => rawPayload.items?.find((ri:any) => ri.productId === item.productId)?.id && !String(rawPayload.items?.find((ri:any) => ri.productId === item.productId)?.id).startsWith("added-"))
    .map((item: any) => Number(rawPayload.items?.find((ri:any) => ri.productId === item.productId)?.id));

  const itemsToDelete = currentItems.filter(dbItem => !payloadIds.includes(Number(dbItem.id)));
  for (const item of itemsToDelete) {
    if (item.id) await transactionRepo.deleteReturnDetail(Number(item.id));
  }

  for (const item of rawPayload.items || []) {
    const matchedType = returnTypes.find((t: API_SalesReturnType) => t.type_name === item.returnType);
    const typeId = matchedType ? matchedType.type_id : returnTypes[0]?.type_id || 1;

    const gross = Math.round(Number(item.quantity) * Number(item.unitPrice) * 100) / 100;
    const discId = item.discountType && item.discountType !== "" ? Number(item.discountType) : null;
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
    };

    if (typeof item.id === "string" && item.id.startsWith("added-")) {
      const detailResult = await transactionRepo.createReturnDetail({
        ...detailPayload,
        return_no: payload.returnNo,
        product_id: Number(item.productId || item.product_id),
      });

      const detailId = (detailResult.data as any)?.detail_id || (detailResult.data as any)?.id;
      if (detailId && item.serialNumbers && Array.isArray(item.serialNumbers)) {
        for (const sn of item.serialNumbers) {
          await transactionRepo.createSerialRecord({
            sales_return_detail_id: detailId,
            serial_number: sn,
            created_by: userId,
          });
        }
      }
    } else if (item.id) {
      await transactionRepo.updateReturnDetail(Number(item.id), detailPayload);

      if (item.serialNumbers && Array.isArray(item.serialNumbers)) {
        const existingSerialsRes = await lookupRepo.getSerialsByDetailId(Number(item.id));
        const existingSerials = (existingSerialsRes.data || []) as any[];

        const serialsToDelete = existingSerials.filter(es => !item.serialNumbers.includes(es.serial_number));
        for (const s of serialsToDelete) await transactionRepo.deleteSerialRecord(s.id);

        const currentSerialStrings = existingSerials.map(es => es.serial_number);
        const serialsToAdd = item.serialNumbers.filter((sn: string) => !currentSerialStrings.includes(sn));
        for (const sn of serialsToAdd) {
          await transactionRepo.createSerialRecord({
            sales_return_detail_id: Number(item.id),
            serial_number: sn,
            created_by: userId,
          });
        }
      }
    } else {
      console.warn(`Skipping update for item with missing ID: ${item.description}`);
    }
  }

  return { success: true };
}

/**
 * Updates the status of a sales return.
 * @param id The ID of the return.
 * @param status The new status string.
 * @param isReceived Whether the return has been received.
 * @param received_at The date of receipt.
 * @returns A promise resolving to the status update result.
 */
export async function updateStatus(
  id: number,
  status: string,
  isReceived?: number,
  received_at?: string,
): Promise<any> {
  const validated = UpdateSalesReturnStatusSchema.parse({
    id,
    status,
    isReceived,
    receivedAt: received_at
  });
  return transactionRepo.updateReturnStatus(
    validated.id, 
    validated.status, 
    validated.isReceived as number | undefined, 
    validated.receivedAt as string | undefined
  );
}
