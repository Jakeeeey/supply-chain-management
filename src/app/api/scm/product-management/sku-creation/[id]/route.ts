import { NextRequest, NextResponse } from "next/server";
import { skuService } from "@/modules/supply-chain-management/product-management/sku-creation/services/sku";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export async function GET(
  req: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = await params;
    // For now, we fetch from drafts as that's where maintenance happens
    // We fetch a larger limit to find the item, or ideally the service should have a fetchById
    const response = await skuService.fetchDrafts(100, 0);
    const item = response.data.find(d => (d as any).id.toString() === id);
    return NextResponse.json({ data: item });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = await skuService.updateDraft(id, body);
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = await params;
    await skuService.deleteDraft(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
