import { NextRequest, NextResponse } from "next/server";
import { skuService } from "@/modules/supply-chain-management/product-management/sku/sku-creation/services/sku";
import { skuSchema } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "approved";
    console.log(
      "SKU API Route GET type:",
      type,
      "API_BASE_URL:",
      process.env.NEXT_PUBLIC_API_BASE_URL,
    );
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    const sort = searchParams.get("sort") || undefined;

    if (type === "master") {
      const data = await skuService.fetchMasterData();
      return NextResponse.json({ data });
    }

    if (type === "drafts") {
      const status = searchParams.get("status") || undefined;
      const search = searchParams.get("search") || undefined;
      const paginated = await skuService.fetchDrafts(
        limit,
        offset,
        status,
        search,
        sort,
      );
      return NextResponse.json(paginated);
    }

    if (type === "duplicate-check") {
      const name = searchParams.get("name") || "";
      const isDuplicate = await skuService.checkDuplicateName(name);
      return NextResponse.json({ isDuplicate });
    }

    const search = searchParams.get("search") || undefined;
    const paginated = await skuService.fetchApproved(
      limit,
      offset,
      search,
      sort,
    );
    console.log(
      `API Route [approved]: Returning ${paginated.data.length} items, total: ${paginated.meta.total_count}`,
    );
    return NextResponse.json(paginated);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("SKU GET Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("POST body received:", JSON.stringify(body, null, 2));

    // Sanitize body for essential fields that might be null from form/defaults
    const sanitizedBody = {
      ...body,
      isActive: body.isActive ?? 0,
      status: body.status ?? "DRAFT",
      inventory_type: body.inventory_type ?? "Regular",
      unit_of_measurement_count: body.unit_of_measurement_count ?? 1,
      barcode: body.barcode ?? "",
      unit_of_measurement: body.unit_of_measurement ?? body.base_unit,
    };

    // Prune ID fields if they are not positive numbers (creating new)
    if (!sanitizedBody.id || typeof sanitizedBody.id !== "number")
      delete (sanitizedBody as { id?: number }).id;
    if (
      !sanitizedBody.product_id ||
      typeof sanitizedBody.product_id !== "number"
    )
      delete (sanitizedBody as { product_id?: number }).product_id;

    // Prune empty strings for fields that Zod might expect as numbers or nullable
    [
      "price_per_unit",
      "cost_per_unit",
      "estimated_unit_cost",
      "maintaining_quantity",
      "product_shelf_life",
      "product_weight",
    ].forEach((key) => {
      const b = sanitizedBody as Record<string, unknown>;
      if (b[key] === "")
        b[key] = null;
    });

    const validated = skuSchema.parse(sanitizedBody);
    const data = await skuService.createDraft(validated);
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const err = error as Error & { details?: unknown[]; errors?: unknown[] };
    console.error("SKU POST error:", err);
    return NextResponse.json(
      {
        error: err.message,
        details: err.details || err.errors || [],
        fullError: err,
      },
      { status: 400 },
    );
  }
}
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids, isActive } = body;

    console.log(
      `SKU API PATCH: Updating status to ${isActive ? "ACTIVE" : "INACTIVE"} for IDs:`,
      ids,
    );

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid 'ids' array" },
        { status: 400 },
      );
    }

    await skuService.bulkUpdateProductStatus(ids, isActive);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("SKU PATCH Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
