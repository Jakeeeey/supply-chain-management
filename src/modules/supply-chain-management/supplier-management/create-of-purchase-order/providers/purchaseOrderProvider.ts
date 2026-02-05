const BASE = "/api/scm/supplier-management/purchase-order";

async function fetchJson(url: string) {
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Request failed");
    return json;
}

const unwrap = (json: any) => (Array.isArray(json?.data) ? json.data : []);

export async function fetchSuppliers() {
    return unwrap(await fetchJson(`${BASE}/suppliers`));
}

export async function fetchBranches() {
    return unwrap(await fetchJson(`${BASE}/branches`));
}

export async function fetchProductSupplierLinks(supplierId: string) {
    return unwrap(await fetchJson(`${BASE}?supplierId=${encodeURIComponent(String(supplierId))}`));
}

export async function fetchProductsByIds(productIds: Array<string | number>) {
    const ids = productIds
        .map((x) => String(x).trim())
        .filter((x) => /^\d+$/.test(x));

    if (!ids.length) return [];

    // avoid long URL
    const chunkSize = 50;
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += chunkSize) chunks.push(ids.slice(i, i + chunkSize));

    const results = await Promise.all(
        chunks.map(async (chunk) => {
            const q = encodeURIComponent(chunk.join(","));
            return unwrap(await fetchJson(`${BASE}/products?ids=${q}`));
        })
    );

    return results.flat();
}
