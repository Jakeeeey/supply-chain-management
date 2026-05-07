import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const AUTH_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

interface DirectusPlan {
    id: number;
    doc_no: string;
    date_encoded: string;
    estimated_time_of_dispatch?: string;
    estimated_time_of_arrival?: string;
    vehicle_id: number;
    driver_id: number;
    status: string;
}

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

interface DirectusInvoice {
    invoice_id: number;
    post_dispatch_plan_id: number;
}

interface SalesInvoice {
    invoice_id: number;
    invoice_no: string;
    customer_code: string | number;
    total_amount: number;
    net_amount: number;
    shipping_address?: string;
    order_id?: string;
}

interface DirectusCustomer {
    customer_code: string | number;
    customer_name: string;
    brgy?: string;
    city?: string;
    province?: string;
}

async function fetcher(endpoint: string) {
    const res = await fetch(`${DIRECTUS_URL}/items${endpoint}`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        cache: 'no-store'
    });
    if (!res.ok) {
        const error = await res.text();
        console.error(`Directus Fetch Error [${endpoint}]:`, error);
        return { data: [] };
    }
    return res.json();
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type");
        const planId = searchParams.get("plan_id");

        if (type === "users") {
            const users = await fetcher(`/user?limit=-1&fields=user_id,user_fname,user_lname,rf_id`);
            return NextResponse.json({ data: users.data || [] });
        }

        if (type === "customers" && planId) {
            const docNo = searchParams.get("doc_no");
            // Fetch invoices for the plan - try matching by ID or doc_no
            const invData = await fetcher(`/post_dispatch_invoices?limit=-1&filter[_or][0][post_dispatch_plan_id][_eq]=${planId}${docNo ? `&filter[_or][1][post_dispatch_plan_id][doc_no][_eq]=${docNo}` : ""}`);
            const invoices = invData.data || [];
            
            if (invoices.length === 0) return NextResponse.json({ data: [] });

            const invoiceIds = invoices.map((i: DirectusInvoice) => i.invoice_id).filter(Boolean);
            if (invoiceIds.length === 0) return NextResponse.json({ data: [] });

            // Fetch Sales Invoices to get customer, address, and amount
            const siData = await fetcher(`/sales_invoice?limit=-1&filter[invoice_id][_in]=${invoiceIds.join(",")}&fields=invoice_id,invoice_no,customer_code,total_amount,net_amount`);
            const sis = siData.data || [];

            const customerCodes = Array.from(new Set(sis.map((si: SalesInvoice) => si.customer_code?.toString()).filter(Boolean)));
            if (customerCodes.length === 0) return NextResponse.json({ data: [] });
            
            // Fetch Customer Names and Addresses
            const custData = await fetcher(`/customer?limit=-1&filter[customer_code][_in]=${customerCodes.join(",")}&fields=customer_code,customer_name,brgy,city,province`);
            const customers = custData.data || [];
            const custMap = new Map<string, { name: string; address: string }>(customers.map((c: DirectusCustomer) => {
                const addressParts = [c.brgy, c.city, c.province].filter(Boolean);
                const address = addressParts.join(", ") || "No Address Provided";
                return [c.customer_code?.toString(), { name: c.customer_name, address }];
            }));

            // Group invoices by customer
            const customerGroup = new Map<string, { customer_code: string; customer_name: string; address: string; invoices: { no: string; amount: number }[] }>();
            sis.forEach((si: SalesInvoice) => {
                const code = si.customer_code?.toString();
                if (!code) return;
                
                if (!customerGroup.has(code)) {
                    const custInfo = custMap.get(code);
                    customerGroup.set(code, {
                        customer_code: code,
                        customer_name: custInfo?.name || "Unknown",
                        address: si.shipping_address || custInfo?.address || "No Address Provided",
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

        // Default: Fetch plans for dispatch
        const plansData = await fetcher(`/post_dispatch_plan?limit=-1&sort=-date_encoded&filter[status][_eq]=For Dispatch`);
        const plans = plansData.data || [];

        const planIds = plans.map((p: DirectusPlan) => p.id);
        if (planIds.length === 0) return NextResponse.json({ data: [] });

        // Fetch staff
        const staffData = await fetcher(`/post_dispatch_plan_staff?limit=-1&fields=id,post_dispatch_plan_id,user_id,role,is_present&filter[post_dispatch_plan_id][_in]=${planIds.join(",")}`);
        const staff = staffData.data || [];

        // Fetch users
        const usersData = await fetcher(`/user?limit=-1&fields=user_id,user_fname,user_lname,rf_id`);
        const users = usersData.data || [];
        const userMap = new Map<number, DirectusUser>(users.map((u: DirectusUser) => [u.user_id, u]));

        // Fetch vehicles
        const vehiclesData = await fetcher(`/vehicles?limit=-1&fields=vehicle_id,vehicle_plate`);
        const vehicles = vehiclesData.data || [];
        const vehicleMap = new Map<number, { vehicle_id: number; vehicle_plate: string }>(vehicles.map((v: { vehicle_id: number; vehicle_plate: string }) => [v.vehicle_id, v]));

        const planStaffMap = new Map<number, DirectusStaff[]>();
        staff.forEach((s: DirectusStaff) => {
            if (!planStaffMap.has(s.post_dispatch_plan_id)) planStaffMap.set(s.post_dispatch_plan_id, []);
            planStaffMap.get(s.post_dispatch_plan_id)!.push(s);
        });

        const enrichedPlans = plans.map((p: DirectusPlan) => {
            const staffRecords = planStaffMap.get(p.id) || [];
            const driverRecord = staffRecords.find(s => s.role.toLowerCase() === "driver");
            const helperRecords = staffRecords.filter(s => s.role.toLowerCase() === "helper");

            const driverUser = driverRecord ? userMap.get(Number(driverRecord.user_id)) : userMap.get(Number(p.driver_id));
            const helpers = helperRecords.map(h => {
                const u = userMap.get(Number(h.user_id));
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
        console.error("Dispatch API GET Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { plan_id, driver_id, driver_present, helpers, time_of_dispatch, remarks } = body;

        if (!plan_id) return NextResponse.json({ error: "plan_id is required" }, { status: 400 });

        const final_time_of_dispatch = time_of_dispatch || new Date().toISOString();

        // 1. Update plan status and details
        const planUpdate = await fetch(`${DIRECTUS_URL}/items/post_dispatch_plan/${plan_id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                status: "For Inbound",
                time_of_dispatch: final_time_of_dispatch,
                driver_id,
                remarks: remarks || ""
            })
        });

        if (!planUpdate.ok) throw new Error("Failed to update plan status");

        // 2. Handle Staff Updates (Full replacement for manual confirmation)
        const existingStaffRes = await fetch(`${DIRECTUS_URL}/items/post_dispatch_plan_staff?filter[post_dispatch_plan_id][_eq]=${plan_id}`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        });
        const existingStaff = (await existingStaffRes.json()).data || [];
        if (existingStaff.length > 0) {
            await fetch(`${DIRECTUS_URL}/items/post_dispatch_plan_staff`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify(existingStaff.map((s: { id: number }) => s.id))
            });
        }

        const newStaff = [
            { post_dispatch_plan_id: plan_id, user_id: driver_id, role: "Driver", is_present: driver_present ? 1 : 0 },
            ...(helpers || []).map((h: { user_id: number, is_present: boolean }) => ({ 
                post_dispatch_plan_id: plan_id, 
                user_id: h.user_id, 
                role: "Helper", 
                is_present: h.is_present ? 1 : 0 
            }))
        ];

        await fetch(`${DIRECTUS_URL}/items/post_dispatch_plan_staff`, {
            method: "POST",
            headers: { Authorization: `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify(newStaff)
        });

        // 3. Update Sales Orders and Invoices to "En Route"
        const invoicesRes = await fetch(`${DIRECTUS_URL}/items/post_dispatch_invoices?filter[post_dispatch_plan_id][_eq]=${plan_id}`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        });
        const invoices = (await invoicesRes.json()).data || [];
        const invoiceIds = invoices.map((inv: DirectusInvoice) => inv.invoice_id);

        if (invoiceIds.length > 0) {
            const siRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice?filter[invoice_id][_in]=${invoiceIds.join(",")}`, {
                headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
            });
            const siData = await siRes.json();
            const orderNos = Array.from(new Set(siData.data.map((si: SalesInvoice) => si.order_id).filter(Boolean)));

            if (orderNos.length > 0) {
                // Update SO
                await fetch(`${DIRECTUS_URL}/items/sales_order`, {
                    method: "PATCH",
                    headers: { Authorization: `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        query: { filter: { "order_no": { "_in": orderNos } } },
                        data: { order_status: "En Route" }
                    })
                });
            }

            // Update SI
            await fetch(`${DIRECTUS_URL}/items/sales_invoice`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: { filter: { "invoice_id": { "_in": invoiceIds } } },
                    data: { 
                        dispatch_date: final_time_of_dispatch,
                        transaction_status: "En Route",
                        isDispatched: 1
                    }
                })
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Dispatch API PATCH Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
