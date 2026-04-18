import { NextResponse } from 'next/server';
import { getDirectusBase, directusFetch as fetchJson } from "@/modules/supply-chain-management/supplier-management/purchase-order-summary/providers/fetchProviders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const base = getDirectusBase();
    const apiUrl = `${base}/items/purchase_order?limit=-1`;

    const data = await fetchJson(apiUrl);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Route Error:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}