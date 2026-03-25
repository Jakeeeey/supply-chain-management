import { Product, Supplier, BundleItem } from "../types";

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

export async function getMasterlistBundles(): Promise<unknown[]> {
  const res = await fetch(`${BASE_URL}?scope=bundles`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Failed to fetch bundles");

  const json = await res.json();
  return json.data ?? [];
}

export async function getBundleItems(bundleId: string): Promise<BundleItem[]> {
  const res = await fetch(`${BASE_URL}?scope=bundle_items&bundle_id=${bundleId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) throw new Error("Failed to fetch bundle items");

  const json = await res.json();
  // Normalize product_id relation to flat fields
  return (json.data ?? []).map((item: {
    id: number;
    product_id?: { product_code: string; product_name: string };
    quantity: number | string;
  }) => ({
    id: item.id,
    product_code: item.product_id?.product_code || "-",
    product_name: item.product_id?.product_name || "Unknown",
    quantity: Number(item.quantity),
  }));
}
