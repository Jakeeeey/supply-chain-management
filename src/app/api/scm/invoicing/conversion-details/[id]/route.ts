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
        // Common Directus expansion keys
        const id = val.product_id || val.id || val.order_id || val.dispatch_id;
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

        console.log(`[Conversion API] Processing Order ID: ${orderId}`);

        // 1. Fetch Sales Order Header
        const soHeaderRes = await fetch(`${DIRECTUS_BASE}/items/sales_order/${orderId}?fields=*,receipt_type.id,receipt_type.max_length,receipt_type.isOfficial,payment_terms.payment_name`, {
            headers: directusHeaders()
        });
        const soHeaderData = await soHeaderRes.json();
        const order = soHeaderData.data;

        if (!order) {
            console.error(`[Conversion API] Order ${orderId} not found`);
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const maxLength = order.receipt_type?.max_length || 15;
        const paymentName = order.payment_terms?.payment_name || "N/A";
        const customerCode = order.customer_code;

        // 1.1 Fetch Customer Details
        let customerInfo = null;
        if (customerCode) {
            const custRes = await fetch(`${DIRECTUS_BASE}/items/customer?filter[customer_code][_eq]=${customerCode}&fields=customer_name,store_name,customer_tin,province,city,brgy`, {
                headers: directusHeaders()
            });
            const custData = await custRes.json();
            customerInfo = custData.data?.[0] || null;
        }

        // 2. Fetch Sales Order Details
        const soDetailsRes = await fetch(`${DIRECTUS_BASE}/items/sales_order_details?filter[order_id][_eq]=${orderId}&fields=*`, {
            headers: directusHeaders()
        });
        const soDetailsData = await soDetailsRes.json();
        const items = soDetailsData.data || [];
        
        console.log(`[Conversion API] Found ${items.length} details for order ${orderId}`);

        // 3. Collect Unique Product IDs for lookup
        const productIds = Array.from(new Set(items.map((it: any) => normalizeId(it.product_id)).filter(Boolean)));
        console.log(`[Conversion API] Unique Product IDs to lookup:`, productIds);

        const productMap: Record<string, any> = {};

        if (productIds.length > 0) {
            // Fetch product_name and unit_shortcut
            const prodUrl = `${DIRECTUS_BASE}/items/products?filter[product_id][_in]=${productIds.join(",")}&fields=product_id,product_name,unit_of_measurement.unit_shortcut`;
            const prodRes = await fetch(prodUrl, { headers: directusHeaders() });
            const prodData = await prodRes.json();
            
            (prodData.data || []).forEach((p: any) => {
                if (p.product_id) {
                    productMap[String(p.product_id)] = {
                        name: p.product_name,
                        unit: p.unit_of_measurement?.unit_shortcut || "PCS"
                    };
                }
            });
            console.log(`[Conversion API] Mapped ${Object.keys(productMap).length} product names and units`);
        }

        // 4. Find the Consolidator and Logistics Info
        const dpdRes = await fetch(`${DIRECTUS_BASE}/items/dispatch_plan_details?filter[sales_order_id][_eq]=${orderId}&fields=dispatch_id.dispatch_no`, {
            headers: directusHeaders()
        });
        const dpdData = await dpdRes.json();
        const dispatchNo = dpdData.data?.[0]?.dispatch_id?.dispatch_no;

        let consolidatorNo = "N/A";
        let consolidatorId = null;

        if (dispatchNo) {
            const lcRes = await fetch(`${DIRECTUS_BASE}/items/consolidator_dispatches?filter[dispatch_no][_eq]=${dispatchNo}&fields=consolidator_id.id,consolidator_id.consolidator_no`, {
                headers: directusHeaders()
            });
            const lcData = await lcRes.json();
            const consolidator = lcData.data?.[0]?.consolidator_id;
            if (consolidator) {
                consolidatorId = normalizeId(consolidator);
                consolidatorNo = consolidator.consolidator_no || "N/A";
            }
        }

        // 5. Fetch Consolidation Details for quantity pool
        const conDetailsMap: Record<string, any> = {};
        if (consolidatorId) {
            const cdRes = await fetch(`${DIRECTUS_BASE}/items/consolidator_details?filter[consolidator_id][_eq]=${consolidatorId}&fields=*`, {
                headers: directusHeaders()
            });
            const cdData = await cdRes.json();
            (cdData.data || []).forEach((cd: any) => {
                const pid = normalizeId(cd.product_id);
                if (pid) conDetailsMap[String(pid)] = cd;
            });
        }

        // 6. Map everything together
        const mappedItems = items.map((sod: any) => {
            const pid = normalizeId(sod.product_id);
            const pidStr = pid ? String(pid) : "";
            
            const pInfo = productMap[pidStr] || { name: "N/A", unit: "PCS" };
            const pname = pInfo.name;
            const ushortcut = pInfo.unit;
            const cd = conDetailsMap[pidStr] || {};
            
            const picked = cd.picked_quantity || 0;
            const applied = cd.applied_quantity || 0;
            const remaining = picked - applied;

            return {
                product_id: pid || 0,
                product_name: pname,
                consolidator_no: consolidatorNo,
                order_no: order.order_no,
                ordered_quantity: sod.ordered_quantity,
                picked_quantity: picked,
                applied_quantity: applied,
                remaining_quantity: remaining,
                unit_price: sod.unit_price,
                discount_type: sod.discount_type,
                discount_amount: sod.discount_amount,
                net_amount: sod.net_amount,
                unit_shortcut: ushortcut
            };
        });

        const dtRes = await fetch(`${DIRECTUS_BASE}/items/discount_type?fields=*`, { headers: directusHeaders() });
        const dtData = await dtRes.json();

        return NextResponse.json({
            items: mappedItems,
            max_receipt_length: maxLength,
            is_official: order.receipt_type?.isOfficial ?? null,
            discount_types: dtData.data || [],
            customer: customerInfo,
            payment_name: paymentName
        });

    } catch (err: any) {
        console.error("Conversion Final Fix Error:", err);
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
}
