import { NextRequest, NextResponse } from "next/server";
import { skuService } from "@/modules/supply-chain-management/product-management/sku/sku-creation/services/sku";
import { skuSchema, SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";

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
    }    if (type === "drafts") {
      const status = searchParams.get("status") || undefined;
      const search = searchParams.get("search") || undefined;
      const supplierIdParam = searchParams.get("supplier");
      const supplierId = supplierIdParam ? parseInt(supplierIdParam) : undefined;
      const itemType = searchParams.get("itemType") || undefined;
      const isActive = searchParams.get("isActive") || undefined;

      const facets = {
        itemType,
        isActive,
      };

      if (status === "FOR_APPROVAL" || status === "DRAFT") {
        // Fetch ALL drafts to properly group them hierarchically
        const paginated = await skuService.fetchDrafts(
          1000,
          0,
          status,
          search,
          sort,
          supplierId,
          facets
        );
        const allDrafts = paginated.data || [];
        const draftIds = new Set(allDrafts.map((d) => String(d.id || d.product_id)));

        interface SKUWithSubRows extends SKU {
          subRows?: SKU[];
        }

        const roots: SKUWithSubRows[] = [];
        const childrenMap = new Map<string, SKU[]>();

        // Pre-group children by parent_id
        for (const draft of allDrafts) {
          const parentVal = draft.parent_id;
          if (parentVal) {
            const parentIdStr = typeof parentVal === "object"
              ? String((parentVal as { id?: number | string; product_id?: number | string }).id || (parentVal as { id?: number | string; product_id?: number | string }).product_id)
              : String(parentVal);
            if (!childrenMap.has(parentIdStr)) {
              childrenMap.set(parentIdStr, []);
            }
            childrenMap.get(parentIdStr)!.push(draft);
          }
        }

        // Identify roots
        for (const draft of allDrafts) {
          const parentVal = draft.parent_id;
          let isRoot = true;

          if (parentVal) {
            const parentIdStr = typeof parentVal === "object"
              ? String((parentVal as { id?: number | string; product_id?: number | string }).id || (parentVal as { id?: number | string; product_id?: number | string }).product_id)
              : String(parentVal);
            
            // If parent draft exists in the FOR_APPROVAL queue, this draft is NOT a root.
            if (draftIds.has(parentIdStr)) {
              isRoot = false;
            }
          }

          if (isRoot) {
            roots.push(draft as SKUWithSubRows);
          }
        }

        // Attach children (subRows) to roots
        for (const root of roots) {
          const rootIdStr = String(root.id || root.product_id);
          const children = childrenMap.get(rootIdStr) || [];
          if (children.length > 0) {
            root.subRows = children;
          }
        }

        // Apply pagination on roots
        const totalCount = roots.length;
        const slicedRoots = roots.slice(offset, offset + limit);

        return NextResponse.json({
          data: slicedRoots,
          meta: {
            total_count: totalCount,
            filter_count: totalCount,
          },
        });
      }

      const paginated = await skuService.fetchDrafts(
        limit,
        offset,
        status,
        search,
        sort,
        supplierId,
        facets
      );
      return NextResponse.json(paginated);
    }
    if (type === "pending-edits") {
      const idsParam = searchParams.get("ids") || "";
      const ids = idsParam.split(",").map(Number).filter(Boolean);
      if (ids.length === 0) {
        return NextResponse.json({ data: [] });
      }
      // Find drafts with remarks matching MASTER_EDIT:<id> pattern and status FOR_APPROVAL
      const { fetchItems } = await import(
        "@/modules/supply-chain-management/product-management/sku/sku-creation/services/sku-api"
      );
      const { data: pendingDrafts } = await fetchItems<{ remarks: string }>(
        "/items/product_draft",
        {
          filter: JSON.stringify({
            _and: [
              { status: { _eq: "FOR_APPROVAL" } },
              { remarks: { _starts_with: "MASTER_EDIT:" } },
            ],
          }),
          fields: "remarks",
          limit: -1,
        },
      );
      const pendingMasterIds = (pendingDrafts || [])
        .map((d) => {
          const match = d.remarks?.match(/^MASTER_EDIT:(\d+)$/);
          return match ? parseInt(match[1]) : null;
        })
        .filter((id): id is number => id !== null && ids.includes(id));
      return NextResponse.json({ data: pendingMasterIds });
    }

    if (type === "duplicate-check") {
      const name = searchParams.get("name") || "";
      const isDuplicate = await skuService.checkDuplicateName(name);
      return NextResponse.json({ isDuplicate });
    }

    const search = searchParams.get("search") || undefined;
    const supplierIdParam = searchParams.get("supplier");
    const supplierId = supplierIdParam ? parseInt(supplierIdParam) : undefined;
    const categoryId = searchParams.get("category") ? parseInt(searchParams.get("category")!) : undefined;
    const classId = searchParams.get("class") ? parseInt(searchParams.get("class")!) : undefined;
    const segmentId = searchParams.get("segment") ? parseInt(searchParams.get("segment")!) : undefined;
    const itemType = searchParams.get("itemType") || undefined;
    const brandId = searchParams.get("brand") ? parseInt(searchParams.get("brand")!) : undefined;
    const statusParam = searchParams.get("status") || undefined;
    
    const paginated = await skuService.fetchApproved(
      1000,
      0,
      search,
      sort,
      supplierId,
      { categoryId, classId, segmentId, itemType, brandId, status: statusParam },
    );
    
    const allApproved = paginated.data || [];
    const approvedIds = new Set(allApproved.map((d) => String(d.id || d.product_id)));

    interface SKUWithSubRows extends SKU {
      subRows?: SKU[];
    }

    const roots: SKUWithSubRows[] = [];
    const childrenMap = new Map<string, SKU[]>();

    // Pre-group children by parent_id
    for (const prod of allApproved) {
      const parentVal = prod.parent_id;
      if (parentVal) {
        const parentIdStr = typeof parentVal === "object"
          ? String((parentVal as { id?: number | string; product_id?: number | string }).id || (parentVal as { id?: number | string; product_id?: number | string }).product_id)
          : String(parentVal);
        if (!childrenMap.has(parentIdStr)) {
          childrenMap.set(parentIdStr, []);
        }
        childrenMap.get(parentIdStr)!.push(prod);
      }
    }

    // Identify roots
    for (const prod of allApproved) {
      const parentVal = prod.parent_id;
      let isRoot = true;

      if (parentVal) {
        const parentIdStr = typeof parentVal === "object"
          ? String((parentVal as { id?: number | string; product_id?: number | string }).id || (parentVal as { id?: number | string; product_id?: number | string }).product_id)
          : String(parentVal);
        
        if (approvedIds.has(parentIdStr)) {
          isRoot = false;
        }
      }

      if (isRoot) {
        roots.push(prod as SKUWithSubRows);
      }
    }

    // Attach children (subRows) to roots
    for (const root of roots) {
      const rootIdStr = String(root.id || root.product_id);
      const children = childrenMap.get(rootIdStr) || [];
      if (children.length > 0) {
        root.subRows = children;
      }
    }

    // Apply pagination on roots
    const totalCount = roots.length;
    const slicedRoots = roots.slice(offset, offset + limit);

    console.log(
      `API Route [approved]: Returning ${slicedRoots.length} root items (out of ${allApproved.length} total fetched), total roots: ${totalCount}`,
    );

    return NextResponse.json({
      data: slicedRoots,
      meta: {
        total_count: totalCount,
        filter_count: totalCount,
      },
    });
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

    // Sanitize body for essential fields that might be null from form/defaults
    const sanitizedBody = {
      ...body,
      isActive: body.isActive ?? 0,
      status: body.status ?? "DRAFT",
      inventory_type: body.inventory_type ?? "Regular",
      short_description: body.short_description || body.description || "",
      unit_of_measurement_count: body.unit_of_measurement_count ?? 1,
      barcode: body.barcode ?? "",
      unit_of_measurement: body.unit_of_measurement ?? body.base_unit,
      ...(userId ? { 
        created_by: userId, 
        updated_by: userId,
        user_created: userId,
        user_updated: userId
      } : {}),
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
