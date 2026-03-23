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

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: orderId } = await params;
        if (!orderId) {
            return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
        }

        // 1. Get Dispatch Plan ID from Details
        const detailsRes = await fetch(`${DIRECTUS_BASE}/items/dispatch_plan_details?filter[sales_order_id][_eq]=${orderId}&fields=dispatch_id`, {
            headers: directusHeaders()
        });
        const detailsData = await detailsRes.json();
        const dispatchId = detailsData.data?.[0]?.dispatch_id;

        if (!dispatchId) {
            return NextResponse.json({
                pdp_no: "N/A",
                consolidation_no: "N/A",
                dispatch_no: "N/A"
            });
        }

        // 2. Get Dispatch No from Dispatch Plan
        const dispatchPlanRes = await fetch(`${DIRECTUS_BASE}/items/dispatch_plan/${dispatchId}?fields=dispatch_no`, {
            headers: directusHeaders()
        });
        const dispatchPlanData = await dispatchPlanRes.json();
        const dispatchNo = dispatchPlanData.data?.dispatch_no || "N/A";

        // 3. Get PDP No (Post Dispatch Plan)
        // Join: dispatch_plan_id -> post_dispatch_dispatch_plans -> post_dispatch_plan_id -> post_dispatch_plan.doc_no
        const linkedPdpRes = await fetch(`${DIRECTUS_BASE}/items/post_dispatch_dispatch_plans?filter[dispatch_plan_id][_eq]=${dispatchId}&fields=post_dispatch_plan_id.doc_no`, {
            headers: directusHeaders()
        });
        const linkedPdpData = await linkedPdpRes.json();
        const pdpNo = linkedPdpData.data?.[0]?.post_dispatch_plan_id?.doc_no || "N/A";

        // 4. Get Consolidation No
        // Join: dispatch_no -> consolidator_dispatches -> consolidator_id -> consolidator.consolidator_no
        const linkedConsolidatorRes = await fetch(`${DIRECTUS_BASE}/items/consolidator_dispatches?filter[dispatch_no][_eq]=${dispatchNo}&fields=consolidator_id.consolidator_no`, {
            headers: directusHeaders()
        });
        const linkedConsolidatorData = await linkedConsolidatorRes.json();
        const consolidationNo = linkedConsolidatorData.data?.[0]?.consolidator_id?.consolidator_no || "N/A";

        return NextResponse.json({
            pdp_no: pdpNo,
            consolidation_no: consolidationNo,
            dispatch_no: dispatchNo
        });

    } catch (err: any) {
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
}
