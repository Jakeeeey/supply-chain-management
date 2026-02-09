import { NextRequest, NextResponse } from "next/server";
import { skuService } from "@/modules/supply-chain-management/product-management/sku-creation/services/sku.service";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export async function POST(
  req: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const action = body.action; // 'submit' or 'approve'
    
    if (action === "submit") {
      await skuService.submitForApproval(id);
      return NextResponse.json({ success: true });
    }

    if (action === "approve") {
      const masterData = await skuService.fetchMasterData();
      await skuService.approveDraft(id, masterData);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
