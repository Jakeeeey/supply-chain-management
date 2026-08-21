import { NextRequest, NextResponse } from "next/server";
import { fetchItems } from "@/modules/supply-chain-management/product-management/sku/sku-creation/services/sku-api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code") || "A0-A-003LIT";
    
    // Find the item by code
    const { data } = await fetchItems<{ id: number; product_code: string; parent_id: any; status: string }>("/items/product_draft", {
      filter: JSON.stringify({ product_code: { _eq: code } }),
      limit: 1,
    });
    
    if (!data || data.length === 0) return NextResponse.json({ error: "Not found" });
    const target = data[0];
    
    // Now fetch its group
    const rootId = typeof target.parent_id === "object" ? target.parent_id?.id || target.id : target.parent_id || target.id;
    
    const { data: groupDrafts } = await fetchItems("/items/product_draft", {
      filter: JSON.stringify({
        _or: [
          { id: { _eq: Number(rootId) } },
          { parent_id: { _eq: Number(rootId) } }
        ]
      }),
      limit: -1,
    });

    return NextResponse.json({
      target,
      rootId,
      groupDrafts
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
