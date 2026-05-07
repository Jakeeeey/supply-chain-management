import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const AUTH_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

interface DirectusUser {
    user_id: number;
    user_fname: string;
    user_lname: string;
    rf_id?: string | null;
}

interface DirectusStaff {
    id: number;
    post_dispatch_plan_id: number;
    user_id: number;
    role: string;
    is_present?: number | boolean;
}

interface DirectusVehicle {
    vehicle_id: number;
    vehicle_plate: string;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type");
        const planId = searchParams.get("plan_id");

        if (type === "customers" && planId) {
            // Fetch invoices for the plan
            const invRes = await fetch(`${DIRECTUS_URL}/items/post_dispatch_invoices?filter[post_dispatch_plan_id][_eq]=${planId}`, {
                headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
            });
            const invoices = (await invRes.json()).data || [];
            const invoiceIds = invoices.map((i: any) => i.invoice_id);

            if (invoiceIds.length === 0) return NextResponse.json({ data: [] });

            // Fetch Sales Invoices to get customer, address, and amount
            const siRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice?filter[invoice_id][_in]=${invoiceIds.join(",")}&fields=invoice_id,invoice_no,customer_code,total_amount,net_amount`, {
                headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
            });
            const siData = await siRes.json();
            const sis = siData.data || [];

            const customerCodes = Array.from(new Set(sis.map((si: any) => si.customer_code).filter(Boolean)));
            
            // Fetch Customer Names
            const custRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[customer_code][_in]=${customerCodes.join(",")}&fields=customer_code,customer_name`, {
                headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
            });
            const customers = (await custRes.json()).data || [];
            const custMap = new Map(customers.map((c: any) => [c.customer_code, c.customer_name]));

            // Group invoices by customer
            const customerGroup = new Map<string, any>();
            sis.forEach((si: any) => {
                const code = si.customer_code;
                if (!customerGroup.has(code)) {
                    customerGroup.set(code, {
                        customer_code: code,
                        customer_name: custMap.get(code) || "Unknown",
                        address: si.shipping_address || "No Address Provided",
                        invoices: []
                    });
                }
                customerGroup.get(code).invoices.push({
                    no: si.invoice_no,
                    amount: si.net_amount ?? si.total_amount ?? 0
                });
            });

            return NextResponse.json({ data: Array.from(customerGroup.values()) });
        }

        // Default: Fetch plans for inbound
        const planRes = await fetch(`${DIRECTUS_URL}/items/post_dispatch_plan?limit=-1&sort=-date_encoded&filter[status][_eq]=For Inbound`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        });
        const plans = await planRes.json();

        const planIds = (plans.data || []).map((p: any) => p.id);
        if (planIds.length === 0) return NextResponse.json({ data: [] });

        // Fetch staff
        const staffRes = await fetch(`${DIRECTUS_URL}/items/post_dispatch_plan_staff?limit=-1&filter[post_dispatch_plan_id][_in]=${planIds.join(",")}`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        });
        const staff = (await staffRes.json()).data || [] as DirectusStaff[];

        // Fetch users
        const userRes = await fetch(`${DIRECTUS_URL}/items/user?limit=-1`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        });
        const users = (await userRes.json()).data || [];
        const userMap = new Map<number, DirectusUser>(users.map((u: DirectusUser) => [u.user_id, u]));

        // Fetch vehicles
        const vehicleRes = await fetch(`${DIRECTUS_URL}/items/vehicles?limit=-1`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        });
        const vehicles = (await vehicleRes.json()).data || [];
        const vehicleMap = new Map<number, DirectusVehicle>(vehicles.map((v: DirectusVehicle) => [v.vehicle_id, v]));

        const enrichedPlans = plans.data.map((p: any) => {
            // Filter staff for this plan and ensure they are present for Inbound
            const planStaff = staff.filter((s: DirectusStaff) => 
                s.post_dispatch_plan_id === p.id && 
                (s.is_present === 1 || s.is_present === true || String(s.is_present) === "1")
            );
            const driverRecord = planStaff.find((s: DirectusStaff) => s.role.toLowerCase() === "driver");
            const helperRecords = planStaff.filter((s: DirectusStaff) => s.role.toLowerCase() === "helper");

            const driverUser = driverRecord ? userMap.get(driverRecord.user_id) : userMap.get(p.driver_id);
            const helpers = helperRecords.map((h: any) => {
                const u = userMap.get(h.user_id);
                return u ? { 
                    user_id: u.user_id, 
                    name: `${u.user_fname} ${u.user_lname}`, 
                    rf_id: u.rf_id,
                    is_present: h.is_present
                } : null;
            }).filter(Boolean);

            return {
                id: p.id,
                doc_no: p.doc_no,
                date_encoded: p.date_encoded,
                estimated_time_of_dispatch: p.estimated_time_of_dispatch,
                estimated_time_of_arrival: p.estimated_time_of_arrival,
                driver_id: driverUser?.user_id || 0,
                driver_name: driverUser ? `${driverUser.user_fname} ${driverUser.user_lname}` : "Unknown Driver",
                driver_rfid: driverUser?.rf_id || null,
                driver_present: driverRecord ? (driverRecord.is_present === 1 || driverRecord.is_present === true) : true,
                helpers,
                helper_name: helpers[0]?.name || null,
                vehicle_plate: vehicleMap.get(p.vehicle_id)?.vehicle_plate || "N/A",
                status: p.status,
            };
        });

        return NextResponse.json({ data: enrichedPlans });
    } catch (error) {
        console.error("Inbound API GET Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { plan_id, deliveryStatuses, driver_present, helpers, time_of_arrival, remarks } = body;

        if (!plan_id) return NextResponse.json({ error: "plan_id is required" }, { status: 400 });

        const final_time_of_arrival = time_of_arrival || new Date().toISOString();

        // 1. Update Plan Header
        await fetch(`${DIRECTUS_URL}/items/post_dispatch_plan/${plan_id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                status: "For Clearance",
                time_of_arrival: final_time_of_arrival,
                remarks_arrival: remarks || ""
            })
        });

        // 2. Update Personnel Presence
        const existingStaffRes = await fetch(`${DIRECTUS_URL}/items/post_dispatch_plan_staff?filter[post_dispatch_plan_id][_eq]=${plan_id}`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        });
        const existingStaff = (await existingStaffRes.json()).data || [] as DirectusStaff[];

        for (const s of existingStaff) {
            let isPresent = 0;
            if (s.role.toLowerCase() === 'driver') {
                isPresent = driver_present ? 1 : 0;
            } else if (s.role.toLowerCase() === 'helper') {
                const helperUpdate = (helpers || []).find((h: { user_id: number, is_present: boolean }) => h.user_id === s.user_id);
                isPresent = helperUpdate ? (helperUpdate.is_present ? 1 : 0) : (s.is_present ? 1 : 0);
            }

            await fetch(`${DIRECTUS_URL}/items/post_dispatch_plan_staff/${s.id}`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify({ is_present: isPresent })
            });
        }

        // 3. Process Delivery Statuses (Update Invoices and Orders)
        const invoicesRes = await fetch(`${DIRECTUS_URL}/items/post_dispatch_invoices?filter[post_dispatch_plan_id][_eq]=${plan_id}`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        });
        const invoices = (await invoicesRes.json()).data || [];

        if (invoices.length > 0) {
            const invoiceIds = invoices.map((inv: any) => inv.invoice_id);
            const siRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice?filter[invoice_id][_in]=${invoiceIds.join(",")}`, {
                headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
            });
            const sis = (await siRes.json()).data || [];

            const updates: any[] = [];
            const soStatusGroups: Record<string, string[]> = { "Delivered": [], "Not Fulfilled": [] };

            for (const si of sis) {
                const customerCode = si.customer_code;
                const statusMapping = deliveryStatuses ? deliveryStatuses[customerCode] : null;

                let pdInvStatus = "Fulfilled";
                let soStatus = "Delivered";

                if (statusMapping === "not_delivered") {
                    pdInvStatus = "Not Fulfilled";
                    soStatus = "Not Fulfilled";
                } else if (statusMapping === "has_concern") {
                    pdInvStatus = "Fulfilled With Concerns";
                } else if (statusMapping === "has_return") {
                    pdInvStatus = "Fulfilled With Returns";
                }

                const pdi = invoices.find((i: any) => i.invoice_id === si.invoice_id);
                if (pdi) updates.push({ id: pdi.id, status: pdInvStatus });
                
                if (si.order_id) {
                    if (!soStatusGroups[soStatus]) soStatusGroups[soStatus] = [];
                    soStatusGroups[soStatus].push(si.order_id);
                }
            }

            // Batch Update Post Dispatch Invoices
            if (updates.length > 0) {
                await fetch(`${DIRECTUS_URL}/items/post_dispatch_invoices`, {
                    method: "PATCH",
                    headers: { Authorization: `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" },
                    body: JSON.stringify(updates)
                });
            }

            // Batch Update Sales Orders
            for (const [st, ordNos] of Object.entries(soStatusGroups)) {
                if (ordNos.length > 0) {
                    await fetch(`${DIRECTUS_URL}/items/sales_order`, {
                        method: "PATCH",
                        headers: { Authorization: `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" },
                        body: JSON.stringify({
                            query: { filter: { "order_no": { "_in": ordNos } } },
                            data: { order_status: st }
                        })
                    });
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Inbound API PATCH Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
