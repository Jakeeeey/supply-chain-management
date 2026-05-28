import { NextResponse } from "next/server";

// Environment variables
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

if (!BASE_URL) {
  console.error("NEXT_PUBLIC_API_BASE_URL is not defined");
}
if (!TOKEN) {
  console.error("DIRECTUS_STATIC_TOKEN is not defined");
}

interface ApiCluster { id: number; cluster_name: string; }
interface ApiCustomer { id: number; customer_code: string; customer_name: string; cluster_id?: number; province?: string; city?: string; }
interface ApiSalesman { id: number; salesman_name: string; salesman_code: string; }
interface ApiSalesOrder { order_id: number; order_no: string; customer_code: string; order_status: string; allocated_amount: number; order_date: string; salesman_id: number; }
interface ApiAreaPerCluster { id: number; cluster_id: number; province: string; city: string; }

interface CustomerGroupRaw { id: string; customerName: string; salesmanName: string; orders: ApiSalesOrder[]; }
interface ClusterGroupRaw { clusterId: string; clusterName: string; customers: CustomerGroupRaw[]; }

/**
 * Fetch with retry and timeout.
 * Retries up to `retries` times with exponential back‑off.
 * Aborts after `timeoutMs` if the request hangs.
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, timeoutMs = 8000): Promise<Response> {
  let backoff = 500;
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok && attempt < retries - 1) {
        await new Promise(r => setTimeout(r, backoff));
        backoff *= 2;
        continue;
      }
      return response;
    } catch (err) {
      clearTimeout(timeout);
      if (attempt === retries - 1) throw err;
      await new Promise(r => setTimeout(r, backoff));
      backoff *= 2;
    }
  }
  // Should never reach here
  throw new Error("fetchWithRetry exhausted retries");
}

export async function GET() {
  try {
    const fetchOptions = {
      cache: "no-store" as const,
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    };

    // Parallel fetches to reduce total latency
    const [clustersRes, salesmanRes, areaRes, customersRes, ordersRes] = await Promise.all([
      fetchWithRetry(`${BASE_URL}/items/cluster?limit=-1`, fetchOptions),
      fetchWithRetry(`${BASE_URL}/items/salesman?limit=-1`, fetchOptions),
      fetchWithRetry(`${BASE_URL}/items/area_per_cluster?limit=-1`, fetchOptions),
      fetchWithRetry(`${BASE_URL}/items/customer?limit=-1`, fetchOptions),
      fetchWithRetry(`${BASE_URL}/items/sales_order?limit=-1`, fetchOptions),
    ]);

    // Helper to safely extract data or fallback to empty array
    const safeJson = async (res: Response) => {
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error(`Upstream fetch failed: ${res.url}, status: ${res.status}, body: ${txt}`);
        return [];
      }
      const json = await res.json();
      return json.data ?? [];
    };

    const [clustersData, salesmanData, areaData, customersData, ordersData] = await Promise.all([
      safeJson(clustersRes),
      safeJson(salesmanRes),
      safeJson(areaRes),
      safeJson(customersRes),
      safeJson(ordersRes),
    ]);

    // Filter Invalid Orders
    const bannedTerms = [
      "en route", "en_route", "delivered", "on hold", "on_hold",
      "cancelled", "no fulfilled", "no_fulfilled", "not fulfilled", "not_fulfilled",
    ];

    const validOrders = (ordersData as ApiSalesOrder[]).filter(order => {
      const rawStatus = order.order_status || "";
      const normalized = rawStatus.toLowerCase().replace("_", " ").trim();
      return !bannedTerms.includes(normalized);
    });

    const areas = areaData as ApiAreaPerCluster[];
    const clusters = clustersData as ApiCluster[];
    const customers = customersData as ApiCustomer[];
    const salesmen = salesmanData as ApiSalesman[];

    // Build lookup maps
    const areaMap = new Map<string, number>();
    areas.forEach(area => {
      if (area.city && area.province) {
        const key = `${area.city.trim().toLowerCase()}|${area.province.trim().toLowerCase()}`;
        areaMap.set(key, area.cluster_id);
      }
    });

    const salesmanMap = new Map<number, string>();
    salesmen.forEach(s => {
      const code = s.salesman_code ? ` - ${s.salesman_code}` : "";
      salesmanMap.set(s.id, `${s.salesman_name}${code}`);
    });

    const customerMap = new Map<string, { name: string; clusterName: string }>();
    customers.forEach(c => {
      let finalClusterId: number | undefined;
      if (c.city && c.province) {
        const geoKey = `${c.city.trim().toLowerCase()}|${c.province.trim().toLowerCase()}`;
        finalClusterId = areaMap.get(geoKey);
      }
      if (!finalClusterId) finalClusterId = c.cluster_id;

      const foundCluster = clusters.find(cl => cl.id === finalClusterId);
      const clusterName = foundCluster ? foundCluster.cluster_name : (c.province || "Unassigned Cluster");

      customerMap.set(c.customer_code, { name: c.customer_name, clusterName });
    });

    const tempGroups: Record<string, { customers: Record<string, CustomerGroupRaw> }> = {};

    validOrders.forEach(order => {
      const custDetails = customerMap.get(order.customer_code);
      const customerName = custDetails ? custDetails.name : `Unknown (${order.customer_code})`;
      const clusterName = custDetails ? custDetails.clusterName : "Unassigned Cluster";

      if (!tempGroups[clusterName]) {
        tempGroups[clusterName] = { customers: {} };
      }

      const customerKey = order.customer_code;
      if (!tempGroups[clusterName].customers[customerKey]) {
        const salesmanName = salesmanMap.get(order.salesman_id) || "Unknown Salesman";
        tempGroups[clusterName].customers[customerKey] = {
          id: customerKey,
          customerName,
          salesmanName,
          orders: [],
        } as CustomerGroupRaw;
      }
      tempGroups[clusterName].customers[customerKey].orders.push(order);
    });

    const result: ClusterGroupRaw[] = Object.entries(tempGroups).map(([clusterName, groupData]) => ({
      clusterId: clusterName,
      clusterName,
      customers: Object.values(groupData.customers),
    }));

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("Consolidation Summary API Error:", err);
    return NextResponse.json({ error: "Failed to load Consolidation Summary" }, { status: 500 });
  }
}
