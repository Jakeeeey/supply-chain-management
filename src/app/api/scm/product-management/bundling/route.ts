import { NextRequest, NextResponse } from "next/server";
import { bundleService } from "@/modules/supply-chain-management/product-management/bundling/bundle-creation/services/bundle";
import { bundleDraftSchema } from "@/modules/supply-chain-management/product-management/bundling/bundle-creation/types/bundle.schema";

export const runtime = "nodejs";

/**
 * GET /api/scm/product-management/bundling
 * Query params:
 *   type: "drafts" | "approved" | "master" | "for_approval"
 *   limit, offset, search, status
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "drafts";
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    const search = searchParams.get("search") || undefined;

    if (type === "master") {
      const data = await bundleService.fetchMasterData();
      return NextResponse.json({ data });
    }

    if (type === "approved") {
      const result = await bundleService.fetchApproved(limit, offset, search);
      return NextResponse.json(result);
    }

    if (type === "for_approval") {
      const result = await bundleService.fetchDrafts(
        limit,
        offset,
        "FOR_APPROVAL",
        search,
      );
      return NextResponse.json(result);
    }

    // Default: drafts
    const status = searchParams.get("status") || "DRAFT";
    const result = await bundleService.fetchDrafts(
      limit,
      offset,
      status,
      search,
    );
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Bundle GET Error]:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/scm/product-management/bundling
 * Creates a new bundle draft. Validates payload with Zod.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validated = bundleDraftSchema.parse(body);
    const data = await bundleService.createDraft(validated);

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error(
      "[POST /api/scm/product-management/bundling] Error:",
      error.message,
    );
    if (error.errors) {
      console.error(
        "[POST /api/scm/product-management/bundling] Zod Details:",
        JSON.stringify(error.errors, null, 2),
      );
    }
    return NextResponse.json(
      {
        error: error.message,
        details: error.errors || [],
      },
      { status: 400 },
    );
  }
}
