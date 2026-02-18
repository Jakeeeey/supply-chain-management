/**
 * Inventory Performance Service
 *
 * Pure TypeScript — no React hooks.
 * Fetches raw data from Spring Boot (views) and Directus (PO receiving),
 * then computes ABC + FNS classifications.
 */

import type {
    RawRunningInventory,
    RawProductMovement,
    RawPurchaseOrderReceiving,
    InventoryPerformance,
    InventoryPerformanceData,
    FnsDistribution,
    GlobalFilter,
} from '../types';

// ── ENV ──
const SPRING_API = process.env.SPRING_API_BASE_URL?.replace(/\/$/, '');
const DIRECTUS_API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function directusHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        ...(DIRECTUS_TOKEN ? { Authorization: `Bearer ${DIRECTUS_TOKEN}` } : {}),
    };
}

function springHeaders(token?: string): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

// ─────────────────────────────────────────────
// 1.  DATA FETCHERS
// ─────────────────────────────────────────────

/** Fetch running inventory snapshot from Spring Boot view */
export async function fetchRunningInventory(
    filters: GlobalFilter,
    token?: string,
): Promise<RawRunningInventory[]> {
    if (!SPRING_API) throw new Error('SPRING_API_BASE_URL is not configured');

    const params = new URLSearchParams();
    if (filters.branchId && filters.branchId !== 'all') {
        params.append('branch_id', filters.branchId);
    }
    if (filters.supplierId && filters.supplierId !== 'all') {
        params.append('supplier_id', filters.supplierId);
    }

    const url = `${SPRING_API}/api/view-running-inventory/all${params.toString() ? `?${params}` : ''}`;
    console.log('[IPD Service] Fetching running inventory:', url);

    const res = await fetch(url, {
        headers: springHeaders(token),
        cache: 'no-store',
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Spring Boot view-running-inventory failed (${res.status}): ${text.substring(0, 200)}`);
    }

    const json = await res.json();
    // Spring Boot may wrap in { data: [...] } or return an array directly
    return Array.isArray(json) ? json : json.data ?? [];
}

/** Fetch product movements from Spring Boot view within a date range */
export async function fetchProductMovements(
    filters: GlobalFilter,
    token?: string,
): Promise<RawProductMovement[]> {
    if (!SPRING_API) throw new Error('SPRING_API_BASE_URL is not configured');

    const params = new URLSearchParams();
    if (filters.dateRange.from) params.append('from', filters.dateRange.from.toISOString());
    if (filters.dateRange.to) params.append('to', filters.dateRange.to.toISOString());
    if (filters.branchId && filters.branchId !== 'all') {
        params.append('branch_id', filters.branchId);
    }
    if (filters.supplierId && filters.supplierId !== 'all') {
        params.append('supplier_id', filters.supplierId);
    }

    const url = `${SPRING_API}/api/view-product-movements/all${params.toString() ? `?${params}` : ''}`;
    console.log('[IPD Service] Fetching product movements:', url);

    const res = await fetch(url, {
        headers: springHeaders(token),
        cache: 'no-store',
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Spring Boot view-product-movements failed (${res.status}): ${text.substring(0, 200)}`);
    }

    const json = await res.json();
    return Array.isArray(json) ? json : json.data ?? [];
}

/** Fetch latest unit prices per product from Directus purchase_order_receiving */
export async function fetchLatestUnitPrices(
    productIds: number[],
): Promise<Map<number, number>> {
    const priceMap = new Map<number, number>();
    if (!DIRECTUS_API || productIds.length === 0) return priceMap;

    // Directus filter: product_id in [...], sort by received_date desc
    // We fetch the most recent PO receiving per product in batches
    const batchSize = 100;
    for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        const filter = JSON.stringify({
            product_id: { _in: batch },
        });
        const params = new URLSearchParams({
            filter,
            sort: '-received_date',
            limit: String(batch.length * 2),
            'fields[]': 'product_id,unit_price,received_date',
        });

        const url = `${DIRECTUS_API}/items/purchase_order_receiving?${params}`;
        try {
            const res = await fetch(url, {
                headers: directusHeaders(),
                cache: 'no-store',
            });
            if (!res.ok) {
                console.warn(`[IPD Service] PO receiving fetch failed (${res.status})`);
                continue;
            }
            const json = await res.json();
            const items: RawPurchaseOrderReceiving[] = json.data ?? [];

            // Keep only the first (latest) price per product_id
            for (const item of items) {
                if (!priceMap.has(item.product_id)) {
                    priceMap.set(item.product_id, item.unit_price);
                }
            }
        } catch (err) {
            console.warn('[IPD Service] PO receiving batch error:', err);
        }
    }

    return priceMap;
}

// ─────────────────────────────────────────────
// 2.  CLASSIFICATION LOGIC
// ─────────────────────────────────────────────

/** ABC Pareto classification (80 / 15 / 5) */
function classifyAbc(
    items: { id: number; metric: number }[],
): Map<number, 'A' | 'B' | 'C'> {
    const result = new Map<number, 'A' | 'B' | 'C'>();
    if (items.length === 0) return result;

    // Sort descending by metric
    const sorted = [...items].sort((a, b) => b.metric - a.metric);
    const total = sorted.reduce((sum, i) => sum + i.metric, 0);

    if (total === 0) {
        sorted.forEach((i) => result.set(i.id, 'C'));
        return result;
    }

    let cumulative = 0;
    for (const item of sorted) {
        cumulative += item.metric;
        const pct = cumulative / total;
        if (pct <= 0.8) {
            result.set(item.id, 'A');
        } else if (pct <= 0.95) {
            result.set(item.id, 'B');
        } else {
            result.set(item.id, 'C');
        }
    }

    return result;
}

/** FNS classification based on pick frequency percentiles (top 20 / mid 60 / bottom 20) */
function classifyFns(
    pickFrequencies: { id: number; picks: number }[],
): Map<number, 'F' | 'N' | 'S'> {
    const result = new Map<number, 'F' | 'N' | 'S'>();
    if (pickFrequencies.length === 0) return result;

    const sorted = [...pickFrequencies].sort((a, b) => b.picks - a.picks);
    const total = sorted.length;

    sorted.forEach((item, index) => {
        const percentile = index / total;
        if (percentile < 0.2) {
            result.set(item.id, 'F');
        } else if (percentile < 0.8) {
            result.set(item.id, 'N');
        } else {
            result.set(item.id, 'S');
        }
    });

    return result;
}

// ─────────────────────────────────────────────
// 3.  ORCHESTRATOR
// ─────────────────────────────────────────────

export async function getInventoryPerformanceData(
    filters: GlobalFilter,
    token?: string,
): Promise<InventoryPerformanceData> {
    // 1.  Fetch raw data in parallel
    const [rawInventory, rawMovements] = await Promise.all([
        fetchRunningInventory(filters, token),
        fetchProductMovements(filters, token),
    ]);

    console.log(`[IPD Service] Raw inventory: ${rawInventory.length} rows, movements: ${rawMovements.length} rows`);

    // 2.  Aggregate running inventory by product (across branches if "all")
    const productMap = new Map<
        number,
        { code: string; name: string; totalQty: number }
    >();

    for (const row of rawInventory) {
        const existing = productMap.get(row.product_id);
        if (existing) {
            existing.totalQty += row.running_inventory;
        } else {
            productMap.set(row.product_id, {
                code: row.product_code,
                name: row.product_name,
                totalQty: row.running_inventory,
            });
        }
    }

    const productIds = Array.from(productMap.keys());

    // 3.  Fetch latest unit prices from Directus
    const priceMap = await fetchLatestUnitPrices(productIds);

    // 4.  Compute pick frequencies from movements
    const pickMap = new Map<number, number>();
    for (const mov of rawMovements) {
        if (mov.out_base > 0) {
            pickMap.set(mov.product_id, (pickMap.get(mov.product_id) ?? 0) + 1);
        }
    }

    // 5.  Build value + volume metric arrays for ABC classification
    const valueMetrics = productIds.map((id) => ({
        id,
        metric: (productMap.get(id)!.totalQty) * (priceMap.get(id) ?? 0),
    }));

    const volumeMetrics = productIds.map((id) => ({
        id,
        metric: productMap.get(id)!.totalQty,
    }));

    const pickFrequencies = productIds.map((id) => ({
        id,
        picks: pickMap.get(id) ?? 0,
    }));

    // 6.  Classify
    const abcValue = classifyAbc(valueMetrics);
    const abcVolume = classifyAbc(volumeMetrics);
    const fnsMap = classifyFns(pickFrequencies);

    // 7.  Build final items array
    const items: InventoryPerformance[] = productIds.map((id) => {
        const product = productMap.get(id)!;
        const unitPrice = priceMap.get(id) ?? 0;
        return {
            sku: product.code,
            name: product.name,
            value: Math.round(product.totalQty * unitPrice * 100) / 100,
            volume: product.totalQty,
            pickFrequency: pickMap.get(id) ?? 0,
            abcValueClass: abcValue.get(id) ?? 'C',
            abcVolumeClass: abcVolume.get(id) ?? 'C',
            fnsClass: fnsMap.get(id) ?? 'S',
        };
    });

    // Sort by value descending for default presentation
    items.sort((a, b) => b.value - a.value);

    // 8.  Build FNS Distribution
    const fnsCounts = { F: 0, N: 0, S: 0 };
    items.forEach((i) => fnsCounts[i.fnsClass]++);
    const totalItems = items.length || 1;

    const fnsDistribution: FnsDistribution[] = [
        {
            label: 'Fast',
            count: fnsCounts.F,
            percentage: Math.round((fnsCounts.F / totalItems) * 100 * 10) / 10,
            color: '#10b981',
        },
        {
            label: 'Normal',
            count: fnsCounts.N,
            percentage: Math.round((fnsCounts.N / totalItems) * 100 * 10) / 10,
            color: '#f59e0b',
        },
        {
            label: 'Slow',
            count: fnsCounts.S,
            percentage: Math.round((fnsCounts.S / totalItems) * 100 * 10) / 10,
            color: '#ef4444',
        },
    ];

    console.log(`[IPD Service] Final: ${items.length} items, FNS: F=${fnsCounts.F} N=${fnsCounts.N} S=${fnsCounts.S}`);

    return { items, fnsDistribution };
}
