import { NextResponse, NextRequest } from "next/server";
import { stockAdjustmentService } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-registration/services/stock-adjustment-service";
import { handleApiError } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-registration/utils/error-handler";

/**
 * GET /api/scm/inventory-management/stock-adjustment-registration/resolve-rfid
 * 
 * Query parameters:
 *   - rfid (required)
 *   - branchId (required)
 *   - supplierId (required)
 *   - type (required: "IN" | "OUT")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rfid = searchParams.get("rfid");
    const branchId = searchParams.get("branchId");
    const supplierId = searchParams.get("supplierId");
    const type = searchParams.get("type");

    if (!rfid || !branchId || !supplierId || !type) {
      return NextResponse.json(
        { error: "Missing required parameters (rfid, branchId, supplierId, type)" },
        { status: 400 }
      );
    }

    if (type !== "OUT") {
      return NextResponse.json(
        { error: "RFID tag resolution is only supported for Stock OUT adjustments." },
        { status: 400 }
      );
    }

    const token = request.cookies.get("vos_access_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No access token found" }, { status: 401 });
    }

    // ── Stock OUT: Resolve product from Spring API & validate Supplier/Branch via Directus ──
    const springUrl = new URL(`${process.env.SPRING_API_BASE_URL}/api/view-rfid-onhand`);
    springUrl.searchParams.set("rfid", rfid);
    springUrl.searchParams.set("branchId", branchId);
    springUrl.searchParams.set("branch_id", branchId);

    const springRes = await fetch(springUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!springRes.ok) {
      return NextResponse.json(
        { error: "RFID tag is not currently on-hand at the selected branch." },
        { status: 400 }
      );
    }

    const data = await springRes.json();
    const list = Array.isArray(data) ? data : [data];
    if (list.length === 0 || !list[0] || (!list[0].productId && !list[0].product_id)) {
      return NextResponse.json(
        { error: "RFID tag is not currently on-hand at the selected branch." },
        { status: 400 }
      );
    }

    const productId = Number(list[0].productId || list[0].product_id);

    // Validate branch, supplier, product and original Stock IN record
    const result = await stockAdjustmentService.validateRFIDForStockOut(
      rfid,
      Number(branchId),
      Number(supplierId),
      productId,
      token
    );

    if (!result.valid) {
      return NextResponse.json({ error: result.reason || "RFID validation failed for Stock OUT." }, { status: 400 });
    }

    // Fetch full product details to return to the cart
    const product = await stockAdjustmentService.fetchProductById(productId);
    if (!product) {
      return NextResponse.json({ error: "Product associated with RFID tag not found." }, { status: 404 });
    }

    return NextResponse.json({ valid: true, product });
  } catch (error) {
    return handleApiError(error);
  }
}
