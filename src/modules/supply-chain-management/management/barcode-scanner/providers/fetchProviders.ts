import { Product, UpdateBarcodeDTO } from "../types";

const BASE_URL = "/api/scm/management/barcode-scanner";

export async function getProducts(): Promise<Product[]> {
  const res = await fetch(BASE_URL, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) throw new Error("Failed to fetch products");

  const json = await res.json();
  return (json.data ?? []) as Product[];
}

export async function updateProductBarcode(
  id: string,
  payload: UpdateBarcodeDTO,
): Promise<void> {
  const res = await fetch(`${BASE_URL}?id=${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Failed to update barcode");
}
