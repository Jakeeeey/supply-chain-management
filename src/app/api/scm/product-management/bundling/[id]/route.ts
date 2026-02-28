import { NextRequest, NextResponse } from "next/server";
import { bundleService } from "@/modules/supply-chain-management/product-management/bundling/bundle-creation/services/bundle";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

/**
 * GET /api/scm/product-management/bundling/[id]
 * Fetches a single draft or bundle by ID.
 */
export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "draft";

    const data =
      type === "approved"
        ? await bundleService.fetchBundleById(id)
        : await bundleService.fetchDraftById(id);

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("[Bundle GET By ID Error]:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/scm/product-management/bundling/[id]
 * Action-based endpoint for status transitions.
 * Body: { action: "submit" | "approve" | "reject" }
 */
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const action = body.action;

    if (action === "submit") {
      await bundleService.submitForApproval(id);
      return NextResponse.json({ success: true });
    }

    if (action === "approve") {
      const result = await bundleService.approveDraft(id);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === "reject") {
      await bundleService.rejectDraft(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[Bundle Action Error]:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/scm/product-management/bundling/[id]
 * Deletes a draft bundle and its associated items.
 */
export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    await bundleService.deleteDraft(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Bundle DELETE Error]:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
