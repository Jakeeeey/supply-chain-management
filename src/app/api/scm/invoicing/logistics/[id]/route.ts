import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function directusHeaders() {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    return h;
}

/**
 * Robustly extracts an integer ID from a potentially nested Directus field
 */
function normalizeId(val: any): number | null {
    if (val === null || val === undefined) return null;
    if (typeof val === "number") return val;
    if (typeof val === "string") {
        const parsed = parseInt(val);
        return isNaN(parsed) ? null : parsed;
    }
    if (typeof val === "object") {
        const id = val.id || val.dispatch_id || val.dispatch_plan_id;
        return typeof id === "number" ? id : (typeof id === "string" ? parseInt(id) : null);
    }
    return null;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: orderId } = await params;
        if (!orderId) {
            return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
        }

        console.log(`[Logistics API] Fetching for Order: ${orderId}`);

        // 1. Get ALL Dispatch Plan IDs from Details
        const detailsRes = await fetch(`${DIRECTUS_BASE}/items/dispatch_plan_details?filter[sales_order_id][_eq]=${orderId}&fields=dispatch_id`, {
            headers: directusHeaders()
        });
        if (!detailsRes.ok) {
            const errBody = await detailsRes.text();
            throw new Error(`Details fetch failed (${detailsRes.status}): ${errBody}`);
        }
        const detailsData = await detailsRes.json();
        
        // Normalize IDs and remove duplicates
        const dispatchIds = Array.from(new Set(
            (detailsData.data || [])
                .map((d: any) => normalizeId(d.dispatch_id))
                .filter(Boolean)
        )) as number[];

        console.log(`[Logistics API] Found Dispatch IDs:`, dispatchIds);

        if (dispatchIds.length === 0) {
            return NextResponse.json([{
                pdp_no: "N/A",
                consolidation_no: "N/A",
                dispatch_no: "N/A",
                dispatch_date: null
            }]);
        }

        // 2. Fetch full details for each dispatch ID
        const logisticsResults = await Promise.all(dispatchIds.map(async (dispatchId: number) => {
            try {
                // Get Dispatch Info
                const dispatchPlanRes = await fetch(`${DIRECTUS_BASE}/items/dispatch_plan/${dispatchId}?fields=dispatch_no,dispatch_date`, {
                    headers: directusHeaders()
                });
                if (!dispatchPlanRes.ok) throw new Error(`Dispatch fetch failed (${dispatchPlanRes.status})`);
                
                const dispatchPlanData = await dispatchPlanRes.json();
                const dp = dispatchPlanData.data || {};
                const dispatchNo = dp.dispatch_no || "N/A";
                const dispatchDate = dp.dispatch_date || null;

                // Get PDP No
                const linkedPdpRes = await fetch(`${DIRECTUS_BASE}/items/post_dispatch_dispatch_plans?filter[dispatch_plan_id][_eq]=${dispatchId}&fields=post_dispatch_plan_id.doc_no`, {
                    headers: directusHeaders()
                });
                if (!linkedPdpRes.ok) throw new Error(`PDP fetch failed (${linkedPdpRes.status})`);
                
                const linkedPdpData = await linkedPdpRes.json();
                const pdpNo = linkedPdpData.data?.[0]?.post_dispatch_plan_id?.doc_no || "N/A";

                // Get Consolidation No
                const linkedConsolidatorRes = await fetch(`${DIRECTUS_BASE}/items/consolidator_dispatches?filter[dispatch_no][_eq]=${dispatchNo}&fields=consolidator_id.consolidator_no`, {
                    headers: directusHeaders()
                });
                if (!linkedConsolidatorRes.ok) throw new Error(`Consolidator fetch failed (${linkedConsolidatorRes.status})`);

                const linkedConsolidatorData = await linkedConsolidatorRes.json();
                const consolidationNo = linkedConsolidatorData.data?.[0]?.consolidator_id?.consolidator_no || "N/A";

                return {
                    id: dispatchId,
                    pdp_no: pdpNo,
                    consolidation_no: consolidationNo,
                    dispatch_no: dispatchNo,
                    dispatch_date: dispatchDate
                };
            } catch (innerErr: any) {
                console.error(`[Logistics API] Error fetching details for Dispatch ${dispatchId}:`, innerErr.message);
                return {
                    id: dispatchId,
                    pdp_no: "ERROR",
                    consolidation_no: "ERROR",
                    dispatch_no: "N/A",
                    dispatch_date: null
                };
            }
        }));

        // 3. Sort by dispatch_date (chronological)
        logisticsResults.sort((a, b) => {
            if (!a.dispatch_date) return -1;
            if (!b.dispatch_date) return 1;
            return new Date(a.dispatch_date).getTime() - new Date(b.dispatch_date).getTime();
        });

        return NextResponse.json(logisticsResults);

    } catch (err: any) {
        console.error("[Logistics API] Critical Failure:", err.message);
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
}
