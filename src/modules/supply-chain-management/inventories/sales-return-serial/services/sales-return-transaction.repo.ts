import { directusMutate } from "./sales-return.client";

export async function createReturnHeader(payload: Record<string, unknown>) {
  return directusMutate<{ data: Record<string, unknown> }>(
    "/items/sales_return",
    "POST",
    payload,
  );
}

export async function createReturnDetail(payload: Record<string, unknown>) {
  return directusMutate<{ data: Record<string, unknown> }>(
    "/items/sales_return_details",
    "POST",
    payload,
  );
}

export async function updateReturnHeader(
  id: number,
  payload: Record<string, unknown>,
) {
  return directusMutate<{ data: Record<string, unknown> }>(
    `/items/sales_return/${id}`,
    "PATCH",
    payload,
  );
}

export async function deleteReturnDetail(id: number) {
  return directusMutate<void>(
    `/items/sales_return_details/${id}`,
    "DELETE",
  );
}

export async function updateReturnDetail(
  id: number,
  payload: Record<string, unknown>,
) {
  return directusMutate<{ data: Record<string, unknown> }>(
    `/items/sales_return_details/${id}`,
    "PATCH",
    payload,
  );
}

export async function updateReturnStatus(
  id: number,
  status: string,
  isReceived?: number,
  received_at?: string,
) {
  const payload: Record<string, unknown> = { status };
  if (isReceived !== undefined) payload.isReceived = isReceived;
  if (received_at !== undefined) payload.received_at = received_at;

  return directusMutate<{ data: Record<string, unknown> }>(
    `/items/sales_return/${id}`,
    "PATCH",
    payload,
  );
}

export async function createJunctionLink(payload: Record<string, unknown>) {
  return directusMutate<{ data: Record<string, unknown> }>(
    "/items/sales_invoice_sales_return",
    "POST",
    payload,
  );
}

export async function updateJunctionLink(
  linkId: number,
  payload: Record<string, unknown>,
) {
  return directusMutate<{ data: Record<string, unknown> }>(
    `/items/sales_invoice_sales_return/${linkId}`,
    "PATCH",
    payload,
  );
}

export async function deleteJunctionLink(linkId: number) {
  return directusMutate<void>(
    `/items/sales_invoice_sales_return/${linkId}`,
    "DELETE",
  );
}

export async function createSerialRecord(payload: Record<string, unknown>) {
  return directusMutate<{ data: Record<string, unknown> }>(
    "/items/sales_return_serial",
    "POST",
    payload,
  );
}

export async function deleteSerialRecord(id: number) {
  return directusMutate<void>(
    `/items/sales_return_serial/${id}`,
    "DELETE",
  );
}
