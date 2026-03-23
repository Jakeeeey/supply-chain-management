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

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        
        const orderNo = searchParams.get("orderNo");
        const poNo = searchParams.get("poNo");
        const customerSearch = searchParams.get("customer");
        const salesman = searchParams.get("salesman");
        const supplier = searchParams.get("supplier");
        const branch = searchParams.get("branch");
        const fromDate = searchParams.get("fromDate");
        const toDate = searchParams.get("toDate");

        // Build Sales Order Query
        let filterParams = "filter[order_status][_eq]=For Invoicing";
        if (orderNo) filterParams += `&filter[order_no][_icontains]=${orderNo}`;
        if (poNo) filterParams += `&filter[po_no][_icontains]=${poNo}`;
        if (customerSearch) filterParams += `&filter[customer_code][_eq]=${customerSearch}`;
        if (salesman) filterParams += `&filter[salesman_id][_eq]=${salesman}`;
        if (supplier) filterParams += `&filter[supplier_id][_eq]=${supplier}`;
        if (branch) filterParams += `&filter[branch_id][_eq]=${branch}`;
        if (fromDate) filterParams += `&filter[order_date][_gte]=${fromDate}`;
        if (toDate) filterParams += `&filter[order_date][_lte]=${toDate}`;

        const fields = [
            "order_id",
            "order_date",
            "order_no",
            "po_no",
            "receipt_type.id",
            "receipt_type.type",
            "receipt_type.isOfficial",
            "supplier_id.supplier_shortcut",
            "supplier_id.supplier_name",
            "customer_code", // Fetch as raw string
            "salesman_id.salesman_name",
            "salesman_id.salesman_code",
            "branch_id.branch_name",
            "created_date",
            "total_amount",
            "net_amount",
            "discount_amount",
            "allocated_amount",
            "remarks",
            "for_approval_at",
            "for_consolidation_at",
            "for_picking_at",
            "for_invoicing_at",
            "for_loading_at",
            "for_shipping_at",
            "delivered_at"
        ].join(",");

        const url = `${DIRECTUS_BASE}/items/sales_order?${filterParams}&fields=${fields}&limit=-1`;
        
        const response = await fetch(url, {
            cache: "no-store",
            headers: directusHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: "Failed to fetch sales orders", details: errorText }, { status: response.status });
        }

        const data = await response.json();
        const orders = data.data || [];

        if (orders.length === 0) return NextResponse.json([]);

        // 3. Manual Join for Customers
        const uniqueCustomerCodes = Array.from(new Set(orders.map((o: any) => o.customer_code).filter(Boolean)));
        
        const customersRes = await fetch(`${DIRECTUS_BASE}/items/customer?filter[customer_code][_in]=${uniqueCustomerCodes.join(",")}&fields=customer_code,customer_name`, {
            headers: directusHeaders(),
        });

        if (customersRes.ok) {
            const customersData = await customersRes.json();
            const customerMap = new Map(customersData.data.map((c: any) => [c.customer_code, c]));
            
            // Transform the data to match the expected frontend structure
            const enrichedOrders = orders.map((o: any) => ({
                ...o,
                customer_code: customerMap.get(o.customer_code) || {
                    customer_code: o.customer_code,
                    customer_name: "Unknown Customer"
                }
            }));
            return NextResponse.json(enrichedOrders);
        }

        return NextResponse.json(orders);
    } catch (err: any) {
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
}
