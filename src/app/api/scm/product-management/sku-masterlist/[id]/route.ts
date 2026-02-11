import { NextRequest, NextResponse } from "next/server";
import { skuService } from "@/modules/supply-chain-management/product-management/sku-creation/services/sku";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = await params;
    const { description } = await req.json();
    
    if (typeof description !== 'string') {
        return NextResponse.json({ error: "Invalid description" }, { status: 400 });
    }

    const data = await skuService.updateProductDescription(id, description);
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
