import { NextRequest, NextResponse } from "next/server";
import { skuService } from "@/modules/supply-chain-management/product-management/sku/sku-creation/services/sku";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const item = await skuService.fetchDraftById(id);
    return NextResponse.json({ data: item });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const isMaster = req.nextUrl.searchParams.get("type") === "master";
    const body = await req.json();

    if (isMaster) {
      const data = await skuService.updateMaster(id, body);
      return NextResponse.json({ data });
    } else {
      const data = await skuService.updateDraft(id, body);
      return NextResponse.json({ data });
    }
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    await skuService.deleteDraft(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const action = body.action;

    if (action === "submit") {
      await skuService.submitForApproval(id);
      return NextResponse.json({ success: true });
    }

    if (action === "approve") {
      const masterData = await skuService.fetchMasterData();
      await skuService.approveDraft(id, masterData);
      return NextResponse.json({ success: true });
    }

    if (action === "reject") {
      const remarks = body.remarks;
      await skuService.rejectDraft(id, remarks);
      return NextResponse.json({ success: true });
    }

    if (action === "approve-segment") {
      const { product_class, product_segment, product_section } = body;
      await skuService.approveSegment(id, product_class, product_segment, product_section);
      return NextResponse.json({ success: true });
    }

    if (action === "reject-segment") {
      await skuService.rejectSegment(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
