import { Product, Supplier } from "../types";

const BASE_URL =
  "/api/scm/product-management/barcode-management/barcode-masterlist";

export async function getMasterlistProducts(): Promise<Product[]> {
  // Explicitly passing scope=products to match the route logic clearly
  const res = await fetch(`${BASE_URL}?scope=products`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    // Log the status text to help debugging if it fails again
    console.error(`Fetch failed: ${res.status} ${res.statusText}`);
    throw new Error("Failed to fetch masterlist products");
  }

  const json = await res.json();
  return (json.data ?? []) as Product[];
}

export async function getSuppliers(): Promise<Supplier[]> {
  const res = await fetch(`${BASE_URL}?scope=suppliers`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) throw new Error("Failed to fetch suppliers");

  const json = await res.json();
  return (json.data ?? []) as Supplier[];
}
