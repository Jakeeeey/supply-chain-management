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

    const token = req.cookies.get("vos_access_token")?.value;
    let userId: string | number | undefined = undefined;
    if (token) {
      try {
        const parts = token.split(".");
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
          userId = payload.user_id ?? payload.userId ?? payload.id ?? payload.sub;
        }
      } catch (e) {
        console.warn("Failed to decode token", e);
      }
    }

    if (userId) {
      body.updated_by = userId;
      body.user_updated = userId;
    }

    if (isMaster) {
      const data = await skuService.submitMasterEdit(id, body);
      return NextResponse.json({ data, message: "Edit submitted for approval" });
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



    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
