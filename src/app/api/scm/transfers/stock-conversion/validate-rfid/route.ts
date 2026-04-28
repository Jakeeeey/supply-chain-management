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

    const directusToken = process.env.DIRECTUS_STATIC_TOKEN || process.env.DIRECTUS_TOKEN || token || "";
    const directusHeaders: Record<string, string> = { 
      Accept: "application/json",
      Authorization: `Bearer ${directusToken}`
    };

    const mode = searchParams.get("mode") || "target"; // "source" or "target"

    if (action === "validate_tag" && rfid) {
      const onHandUrl = new URL(`${springApiUrl}/api/view-rfid-onhand`);
      onHandUrl.searchParams.set("rfid", rfid);
      
      const directusApi = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
      
      try {
        const queries = [
           fetch(onHandUrl.toString(), { method: "GET", headers, cache: "no-store" }),
           fetch(`${directusApi}/items/stock_adjustment_rfid?filter[rfid_tag][_eq]=${encodeURIComponent(rfid)}&fields=stock_adjustment_id.type&limit=5`, { headers: directusHeaders, cache: "no-store" }),
           fetch(`${directusApi}/items/rfid_tags?filter[rfid_tag][_eq]=${encodeURIComponent(rfid)}&fields=status&limit=1`, { headers: directusHeaders, cache: "no-store" })
        ];

        const [onHandRes, historyRes, masterRes] = await Promise.all(queries);

        let existsInOnHand = false;
        let hasOutMovement = false;
        let isInactive = false;
        let hasAnyHistory = false;

        if (onHandRes.ok) {
          const items = await onHandRes.json();
          existsInOnHand = (Array.isArray(items) ? items : [items]).some(i => i && String(i.rfid || i.rfid_tag) === rfid);
        }

        if (historyRes.ok) {
          const payload = await historyRes.json();
          const records = (payload.data || []) as Array<{ stock_adjustment_id?: { type?: string } }>;
          hasAnyHistory = records.length > 0;
          hasOutMovement = records.some((r) => r.stock_adjustment_id?.type === "OUT");
        }

        if (masterRes.ok) {
          const payload = await masterRes.json();
          isInactive = (payload.data?.[0] as { status?: string })?.status === "inactive";
        }

        let isBlocked = false;
        let reason = null;

        if (mode === "target") {
          if (hasAnyHistory || existsInOnHand) {
            isBlocked = true;
            reason = hasAnyHistory ? "history" : "onhand";
          }
        } else {
          if (!existsInOnHand || hasOutMovement || isInactive) {
            isBlocked = true;
            reason = (hasOutMovement || isInactive) ? "history" : "not_found";
          }
        }
        
        return NextResponse.json({ exists: isBlocked, reason });
      } catch {
         return NextResponse.json({ exists: true, reason: "error" });
      }
    }

    if (action === "check_product_rfids" && branchId && productId) {
      const targetUrl = new URL(`${springApiUrl}/api/view-rfid-onhand`);
      targetUrl.searchParams.set("branchId", branchId);
      
      try {
        const onHandRes = await fetch(targetUrl.toString(), { method: "GET", headers, cache: "no-store" });
        if (onHandRes.ok) {
           const payload = await onHandRes.json();
           const items = Array.isArray(payload) ? payload : (payload.data && Array.isArray(payload.data) ? payload.data : []);
           const hasRfids = items.some((item: Record<string, unknown>) => String(item.productId || item.product_id) === String(productId));
           return NextResponse.json({ hasRfids });
        }
        return NextResponse.json({ hasRfids: false });
      } catch {
         return NextResponse.json({ hasRfids: false });
      }
    }

    return NextResponse.json({ error: "Invalid action or missing parameters" }, { status: 400 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
