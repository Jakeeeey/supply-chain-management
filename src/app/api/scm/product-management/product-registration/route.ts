import { NextRequest, NextResponse } from "next/server";
import { productRegistrationService } from "@/modules/supply-chain-management/product-management/product-registration/services/product-registration.service";
import { skuSchema } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "products";

    if (type === "master") {
      const data = await productRegistrationService.fetchMasterData();
      return NextResponse.json({ data });
    }

    if (type === "duplicate-check") {
      const name = searchParams.get("name") || "";
      const isDuplicate = await productRegistrationService.checkDuplicateName(name);
      return NextResponse.json({ isDuplicate });
    }

    // Default: fetch paginated master products
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    const sort = searchParams.get("sort") || undefined;
    const search = searchParams.get("search") || undefined;
    const supplierIdParam = searchParams.get("supplier");
    const supplierId = supplierIdParam ? parseInt(supplierIdParam) : undefined;
    const categoryId = searchParams.get("category") ? parseInt(searchParams.get("category")!) : undefined;
    const classId = searchParams.get("class") ? parseInt(searchParams.get("class")!) : undefined;
    const segmentId = searchParams.get("segment") ? parseInt(searchParams.get("segment")!) : undefined;
    const itemType = searchParams.get("itemType") || undefined;
    const brandId = searchParams.get("brand") ? parseInt(searchParams.get("brand")!) : undefined;
    const statusParam = searchParams.get("status") || undefined;

    const paginated = await productRegistrationService.fetchProducts(
      limit,
      offset,
      search,
      sort,
      supplierId,
      { categoryId, classId, segmentId, itemType, brandId, status: statusParam },
    );

    return NextResponse.json(paginated);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Product Registration GET Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();

    // Sanitize body for essential fields
    const sanitizedBody = {
      ...body,
      isActive: body.isActive ?? 1,
      status: "ACTIVE",
      inventory_type: body.inventory_type ?? "Regular",
      unit_of_measurement_count: body.unit_of_measurement_count ?? 1,
      barcode: body.barcode ?? "",
      unit_of_measurement: body.unit_of_measurement ?? body.base_unit,
    };

    // Prune ID fields if they are not positive numbers (creating new)
    if (!sanitizedBody.id || typeof sanitizedBody.id !== "number")
      delete (sanitizedBody as { id?: number }).id;
    if (!sanitizedBody.product_id || typeof sanitizedBody.product_id !== "number")
      delete (sanitizedBody as { product_id?: number }).product_id;

    // Prune empty strings for numeric fields
    [
      "price_per_unit",
      "cost_per_unit",
      "estimated_unit_cost",
      "maintaining_quantity",
      "product_shelf_life",
      "product_weight",
    ].forEach((key) => {
      const b = sanitizedBody as Record<string, unknown>;
      if (b[key] === "") b[key] = null;
    });

    const validated = skuSchema.parse(sanitizedBody);
    const data = await productRegistrationService.createDirectProduct(validated);
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const err = error as Error & { details?: unknown[]; errors?: unknown[] };
    console.error("Product Registration POST error:", err);
    return NextResponse.json(
      {
        error: err.message,
        details: err.details || err.errors || [],
      },
      { status: 400 },
    );
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { ids, isActive } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid 'ids' array" },
        { status: 400 },
      );
    }

    await productRegistrationService.bulkUpdateStatus(ids, isActive);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Product Registration PATCH Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
