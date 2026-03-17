import { NextRequest, NextResponse } from "next/server";
import { bundleService } from "@/modules/supply-chain-management/product-management/bundling/services/bundle";
import { bundleDraftSchema } from "@/modules/supply-chain-management/product-management/bundling/types/bundle.schema";

export const runtime = "nodejs";

const CACHE_TTL = 60000; // 60 seconds
let cachedMasterData: { data: any; timestamp: number } | null = null;

/**
 * GET /api/scm/product-management/bundling
 * Query params:
 *   type: "drafts" | "approved" | "master" | "for_approval" | "all"
 *   limit, offset, search, status
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "drafts";
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    const search = searchParams.get("search") || undefined;

    if (type === "all") {
      const now = Date.now();
      const statusFilter = searchParams.get("status") || "ALL";
      const typeFilter = searchParams.get("typeId");

      const draftLimit = parseInt(searchParams.get("draftLimit") || "10");
      const draftOffset = parseInt(searchParams.get("draftOffset") || "0");
      const pendingLimit = parseInt(searchParams.get("pendingLimit") || "10");
      const pendingOffset = parseInt(searchParams.get("pendingOffset") || "0");
      const approvedLimit = parseInt(searchParams.get("approvedLimit") || "10");
      const approvedOffset = parseInt(
        searchParams.get("approvedOffset") || "0",
      );

      // Fetch sequentially to avoid exhausting Directus DB connection pool
      const drafts = await bundleService.fetchDrafts(
        draftLimit,
        draftOffset,
        "DRAFT",
        search,
        typeFilter ? parseInt(typeFilter) : undefined,
      );
      const pending = await bundleService.fetchDrafts(
        pendingLimit,
        pendingOffset,
        "FOR_APPROVAL",
        search,
        typeFilter ? parseInt(typeFilter) : undefined,
      );
      const approved = await bundleService.fetchApproved(
        approvedLimit,
        approvedOffset,
        search,
        statusFilter,
        typeFilter ? parseInt(typeFilter) : undefined,
      );
      const master =
        cachedMasterData && now - cachedMasterData.timestamp < CACHE_TTL
          ? cachedMasterData.data
          : await bundleService.fetchMasterData().then((data) => {
              cachedMasterData = { data, timestamp: now };
              return data;
            });

      return NextResponse.json({
        drafts,
        pending,
        approved,
        master,
      });
    }

    if (type === "master") {
      const now = Date.now();
      if (cachedMasterData && now - cachedMasterData.timestamp < CACHE_TTL) {
        return NextResponse.json({ data: cachedMasterData.data });
      }
      const data = await bundleService.fetchMasterData();
      cachedMasterData = { data, timestamp: now };
      return NextResponse.json({ data });
    }

    if (type === "approved") {
      const statusFilter = searchParams.get("status") || "ALL";
      const typeFilter = searchParams.get("typeId");
      const result = await bundleService.fetchApproved(
        limit,
        offset,
        search,
        statusFilter,
        typeFilter ? parseInt(typeFilter) : undefined,
      );
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
