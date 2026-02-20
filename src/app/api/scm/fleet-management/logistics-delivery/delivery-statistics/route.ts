import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DIRECTUS_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function itemsBase(base: string) {
  const clean = base.replace(/\/+$/, "");
  if (!clean) return "";
  if (clean.endsWith("/items")) return clean;
  return `${clean}/items`;
}

function authHeaders(req: NextRequest) {
  const h = new Headers();
  const incoming = req.headers.get("authorization");
  if (incoming) {
    h.set("authorization", incoming);
    return h;
  }
  if (STATIC_TOKEN) h.set("authorization", `Bearer ${STATIC_TOKEN}`);
  return h;
}

async function fetchDirectusJson(req: NextRequest, url: string) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: authHeaders(req),
  });

  const text = await res.text().catch(() => "");
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    return {
      ok: false as const,
      status: res.status,
      url,
      body: json ?? text,
    };
  }

  return {
    ok: true as const,
    status: res.status,
    url,
    body: json,
  };
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

interface ApiSalesItem {
  invoice_id: number;
  dispatch_date: string;
  total_amount: string;
  discount_amount: string;
}

interface ApiDeliveryItem {
  invoice_id: number;
  status: string;
}

interface ChartEntry {
  name: string;
  sortIndex: number;
  Fulfilled: number;
  "Not Fulfilled": number;
  "Fulfilled With Concerns": number;
  "Fulfilled With Returns": number;
  sales: number;
}

export async function GET(req: NextRequest) {
  try {
    if (!DIRECTUS_BASE) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_API_BASE_URL in .env.local" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const viewType = searchParams.get("viewType") || "month";

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }

    const base = itemsBase(DIRECTUS_BASE);
    if (!base) return NextResponse.json({ error: "Invalid NEXT_PUBLIC_API_BASE_URL" }, { status: 500 });

    // ✅ IMPORTANT: remove forbidden "id"
    const salesUrl =
      `${base}/sales_invoice?limit=-1` +
      `&filter[dispatch_date][_between]=${startDate},${endDate}` +
      `&fields=invoice_id,dispatch_date,total_amount,discount_amount`;

    const salesRes = await fetchDirectusJson(req, salesUrl);
    if (!salesRes.ok) {
      return NextResponse.json(
        { error: "Directus sales_invoice fetch failed", details: salesRes },
        { status: 500 }
      );
    }

    const salesItems: ApiSalesItem[] = salesRes.body?.data || [];

    if (!salesItems.length) {
      return NextResponse.json({
        chartData: [],
        deliveryStatusCounts: [],
        totalSales: 0,
        avgSales: 0,
      });
    }

    const invoiceIds = [...new Set(salesItems.map((s) => s.invoice_id).filter(Boolean))] as number[];

    let deliveryItems: ApiDeliveryItem[] = [];
    if (invoiceIds.length) {
      const chunks = chunkArray(invoiceIds, 50);

      const results = await Promise.all(
        chunks.map(async (chunk) => {
          const ids = chunk.join(",");

          // ✅ remove forbidden "id" here too
          const url =
            `${base}/post_dispatch_invoices?limit=-1` +
            `&filter[invoice_id][_in]=${ids}` +
            `&fields=invoice_id,status`;

          const r = await fetchDirectusJson(req, url);
          if (!r.ok) return [];
          return (r.body?.data || []) as ApiDeliveryItem[];
        })
      );

      deliveryItems = results.flat();
    }

    const deliveryMap = new Map<number, string>();
    deliveryItems.forEach((d) => deliveryMap.set(d.invoice_id, d.status));

    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const groupMap = new Map<string, ChartEntry>();

    let totalSales = 0;
    const counts: Record<string, number> = {
      Fulfilled: 0,
      "Not Fulfilled": 0,
      "Fulfilled With Concerns": 0,
      "Fulfilled With Returns": 0,
    };

    salesItems.forEach((sale) => {
      const date = new Date(sale.dispatch_date);
      const status = deliveryMap.get(sale.invoice_id);
      if (!status) return;

      if (counts[status] !== undefined) counts[status]++;

      let netAmount = 0;
      const validStatuses = ["Fulfilled", "Fulfilled With Returns", "Fulfilled With Concerns"];
      if (validStatuses.includes(status)) {
        const total = parseFloat(sale.total_amount) || 0;
        const discount = parseFloat(sale.discount_amount) || 0;
        netAmount = total - discount;
        totalSales += netAmount;
      }

      let key: string;
      let sortIndex: number;

      if (viewType === "month") {
        key = monthNames[date.getMonth()];
        sortIndex = date.getMonth();
      } else {
        key = `${monthNames[date.getMonth()]} ${date.getDate()}`;
        sortIndex = date.getTime();
      }

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          name: key,
          sortIndex,
          Fulfilled: 0,
          "Not Fulfilled": 0,
          "Fulfilled With Concerns": 0,
          "Fulfilled With Returns": 0,
          sales: 0,
        });
      }

      const entry = groupMap.get(key)!;
      if ((entry as any)[status] !== undefined) (entry as any)[status]++;
      entry.sales += netAmount;
    });

    const sortedChartData = Array.from(groupMap.values()).sort((a, b) => a.sortIndex - b.sortIndex);

    const COLORS = ["#10b981", "#f59e0b", "#facc15", "#ef4444"];
    const deliveryStatusCounts = [
      { name: "Fulfilled", value: counts["Fulfilled"], color: COLORS[0] },
      { name: "Not Fulfilled", value: counts["Not Fulfilled"], color: COLORS[1] },
      { name: "Fulfilled With Concerns", value: counts["Fulfilled With Concerns"], color: COLORS[2] },
      { name: "Fulfilled With Returns", value: counts["Fulfilled With Returns"], color: COLORS[3] },
    ];

    const totalDeliveries = Object.values(counts).reduce((a, b) => a + b, 0);
    const avgSales = totalDeliveries > 0 ? totalSales / totalDeliveries : 0;

    return NextResponse.json({
      chartData: sortedChartData.map(({ sortIndex, ...rest }) => rest),
      deliveryStatusCounts,
      totalSales,
      avgSales,
    });
  } catch (err: any) {
    console.error("Delivery Statistics API Error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
