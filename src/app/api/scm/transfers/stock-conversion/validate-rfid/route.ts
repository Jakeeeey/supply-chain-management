import { handleApiError } from "@/modules/supply-chain-management/inventory-management/stock-adjustment/utils/error-handler";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const rfid = searchParams.get("rfid");
    const branchId = searchParams.get("branchId");
    const productId = searchParams.get("productId");

    const springApiUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");
    const token = req.cookies.get("springboot_token")?.value || req.cookies.get("vos_access_token")?.value;

    if (!springApiUrl) {
      return NextResponse.json({ error: "Spring API URL not configured" }, { status: 500 });
    }

    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    if (action === "validate_tag" && rfid) {
      // Check if a specific RFID exists in the warehouse (for preventing duplicates)
      const targetUrl = new URL(`${springApiUrl}/api/view-rfid-onhand`);
      targetUrl.searchParams.set("rfid", rfid);
      
      try {
        const onHandRes = await fetch(targetUrl.toString(), { method: "GET", headers, cache: "no-store" });
        if (onHandRes.ok) {
          const payload = await onHandRes.json();
          const items = Array.isArray(payload) ? payload : (payload ? [payload] : []);
          
          const exists = items.some((item: any) => item.rfid === rfid || item.rfid_tag === rfid);
          return NextResponse.json({ exists });
        }
        // If not ok, assume it doesn't exist
        return NextResponse.json({ exists: false });
      } catch (e) {
         console.warn("[Validation] Fallback, assuming does not exist", e);
         return NextResponse.json({ exists: false });
      }
    }

    if (action === "check_product_rfids" && branchId && productId) {
      // Check if the product has ANY RFIDs in the specific branch
      const targetUrl = new URL(`${springApiUrl}/api/view-rfid-onhand`);
      targetUrl.searchParams.set("branchId", branchId);
      
      try {
        const onHandRes = await fetch(targetUrl.toString(), { method: "GET", headers, cache: "no-store" });
        if (onHandRes.ok) {
           const payload = await onHandRes.json();
           const items = Array.isArray(payload) ? payload : (payload.data && Array.isArray(payload.data) ? payload.data : []);
           
           const hasRfids = items.some((item: any) => String(item.productId || item.product_id) === String(productId));
           return NextResponse.json({ hasRfids });
        }
        return NextResponse.json({ hasRfids: false });
      } catch (e) {
         console.warn("[Validation] Fallback, assuming no RFIDs", e);
         return NextResponse.json({ hasRfids: false });
      }
    }

    return NextResponse.json({ error: "Invalid action or missing parameters" }, { status: 400 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
