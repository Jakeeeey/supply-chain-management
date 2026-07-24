import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const AUTH_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

interface DirectusPlan {
    dispatch_id: number;
    dispatch_no: string;
    dispatch_date: string | null;
    driver_id: number | null;
    branch_id: number | null;
    vehicle_id: number | null;
    remarks: string | null;
    status: string;
    cluster_id: number | null;
}

interface DirectusPlanDetail {
    dispatch_id: number;
    sales_order_id: number;
}

interface DirectusUser {
    user_id: number;
    user_fname: string;
    user_lname: string;
}

interface DirectusVehicle {
    vehicle_id: number;
    vehicle_plate: string;
}

interface DirectusBranch {
    id: number;
    branch_name: string;
}

interface DirectusCluster {
    id: number;
    cluster_name: string;
}

interface DirectusSalesOrder {
    order_id: number;
    order_no: string;
    customer_code: string;
    total_amount: number | null;
    net_amount: number | null;
}

interface DirectusCustomer {
    customer_code: string;
    customer_name: string;
    brgy: string | null;
    city: string | null;
    province: string | null;
}

async function fetchFromDirectus<T>(endpoint: string, params: Record<string, string> = {}): Promise<T[]> {
    const url = new URL(`${DIRECTUS_URL}/items${endpoint}`);
    Object.entries(params).forEach(([key, val]) => {
        url.searchParams.set(key, val);
    });

    try {
        const res = await fetch(url.toString(), {
            headers: {
                "Authorization": `Bearer ${AUTH_TOKEN}`,
                "Content-Type": "application/json"
            },
            cache: "no-store",
        });

        if (!res.ok) {
            console.error(`❌ Directus fetch error [${endpoint}]:`, res.statusText);
            return [];
        }

        const json = await res.json();
        return (json.data ?? []) as T[];
    } catch (err) {
        console.error(`🚨 Directus fetch exception [${endpoint}]:`, err);
        return [];
    }
}

async function fetchFromDirectusInChunks<T>(
    endpoint: string,
    filterField: string,
    ids: (string | number)[],
    params: Record<string, string> = {},
    chunkSize: number = 50
): Promise<T[]> {
    const uniqueIds = Array.from(new Set(ids)).filter(id => id !== null && id !== "");
    if (!uniqueIds.length) return [];

    const results: T[] = [];
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
        const chunk = uniqueIds.slice(i, i + chunkSize);
        const chunkParams = {
            ...params,
            [`filter[${filterField}][_in]`]: chunk.join(",")
        };
        const res = await fetchFromDirectus<T>(endpoint, chunkParams);
        results.push(...res);
    }
    return results;
}

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ ok: false }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");

    // 1. Fetch dispatch plans filtered by status
    const planParams: Record<string, string> = {
        limit: "-1",
        fields: "dispatch_id,dispatch_no,dispatch_date,driver_id,branch_id,vehicle_id,remarks,status,cluster_id"
    };

    if (statusParam === "DISPATCHED") {
        planParams["filter[status][_eq]"] = "Dispatched";
        
        // Calculate start of current week (most recent Sunday)
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfWeekStr = startOfWeek.toISOString().split("T")[0] + "T00:00:00";
        
        planParams["filter[dispatch_date][_gte]"] = startOfWeekStr;
    } else if (statusParam === "PENDING") {
        planParams["filter[status][_eq]"] = "Pending";
    }

    const plans = await fetchFromDirectus<DirectusPlan>("/dispatch_plan", planParams);
    if (!plans.length) return NextResponse.json([]);

    const planIds = Array.from(new Set(plans.map(p => p.dispatch_id))).filter((id): id is number => !!id);
    const driverIds = Array.from(new Set(plans.map(p => p.driver_id))).filter((id): id is number => !!id);
    const vehicleIds = Array.from(new Set(plans.map(p => p.vehicle_id))).filter((id): id is number => !!id);
    const branchIds = Array.from(new Set(plans.map(p => p.branch_id))).filter((id): id is number => !!id);
    const clusterIds = Array.from(new Set(plans.map(p => p.cluster_id))).filter((id): id is number => !!id);

    if (!planIds.length) return NextResponse.json([]);

    // 2. Fetch related details in parallel (using chunked fetch to prevent Header Fields Too Large errors)
    const [details, users, vehicles, branches, clusters] = await Promise.all([
        fetchFromDirectusInChunks<DirectusPlanDetail>("/dispatch_plan_details", "dispatch_id", planIds, { limit: "-1" }),
        driverIds.length ? fetchFromDirectusInChunks<DirectusUser>("/user", "user_id", driverIds, {
            limit: "-1",
            fields: "user_id,user_fname,user_lname"
        }) : Promise.resolve([]),
        vehicleIds.length ? fetchFromDirectusInChunks<DirectusVehicle>("/vehicles", "vehicle_id", vehicleIds, {
            limit: "-1",
            fields: "vehicle_id,vehicle_plate"
        }) : Promise.resolve([]),
        branchIds.length ? fetchFromDirectusInChunks<DirectusBranch>("/branches", "id", branchIds, {
            limit: "-1",
            fields: "id,branch_name"
        }) : Promise.resolve([]),
        clusterIds.length ? fetchFromDirectusInChunks<DirectusCluster>("/cluster", "id", clusterIds, {
            limit: "-1",
            fields: "id,cluster_name"
        }) : Promise.resolve([])
    ]);

    if (!details.length) return NextResponse.json([]);

    // 3. Fetch sales orders referenced in dispatch plan details in chunks
    const salesOrderIds = Array.from(new Set(details.map(d => d.sales_order_id).filter(Boolean)));
    if (!salesOrderIds.length) return NextResponse.json([]);

    const orders = await fetchFromDirectusInChunks<DirectusSalesOrder>("/sales_order", "order_id", salesOrderIds, {
        limit: "-1",
        fields: "order_id,order_no,customer_code,total_amount,net_amount"
    });

    if (!orders.length) return NextResponse.json([]);

    // 4. Fetch customers referenced in sales orders in chunks
    const customerCodes = Array.from(new Set(orders.map(o => o.customer_code).filter(Boolean)));
    const customers = customerCodes.length ? await fetchFromDirectusInChunks<DirectusCustomer>("/customer", "customer_code", customerCodes, {
        limit: "-1",
        fields: "customer_code,customer_name,brgy,city,province"
    }) : [];

    // 5. Build lookup maps
    const planMap = new Map(plans.map(p => [p.dispatch_id, p]));
    const userMap = new Map(users.map(u => [u.user_id, `${u.user_fname} ${u.user_lname}`.trim()]));
    const vehicleMap = new Map(vehicles.map(v => [v.vehicle_id, v.vehicle_plate]));
    const branchMap = new Map(branches.map(b => [b.id, b.branch_name]));
    const clusterMap = new Map(clusters.map(c => [c.id, c.cluster_name]));
    const orderMap = new Map(orders.map(o => [o.order_id, o]));
    const customerMap = new Map(customers.map(c => [c.customer_code, c]));

    // 6. Map and enrich details into target DTO format
    const records = details.map(detail => {
        const plan = planMap.get(detail.dispatch_id);
        const order = orderMap.get(detail.sales_order_id);
        if (!plan || !order) return null;

        const customer = customerMap.get(order.customer_code);
        const driverName = plan.driver_id ? userMap.get(plan.driver_id) : "NO DRIVER";
        const vehiclePlate = plan.vehicle_id ? vehicleMap.get(plan.vehicle_id) : null;
        const branchName = plan.branch_id ? branchMap.get(plan.branch_id) : "General Branch";
        const clusterName = plan.cluster_id ? clusterMap.get(plan.cluster_id) : "General Area";

        return {
            dispatchNo: plan.dispatch_no,
            dispatchDate: plan.dispatch_date,
            dispatchStatus: plan.status === "Dispatched" ? "DISPATCHED" : "PENDING",
            customerName: customer?.customer_name || "UNKNOWN CUSTOMER",
            customerProvince: customer?.province || "UNKNOWN PROV",
            customerCity: customer?.city || "UNKNOWN CITY",
            customerBarangay: customer?.brgy || "",
            orderNo: order.order_no,
            dispatchAmount: order.net_amount ?? order.total_amount ?? 0,
            driverName: driverName,
            branchName: branchName,
            clusterName: clusterName,
            dispatchRemarks: plan.remarks || "",
            plateNumber: vehiclePlate || "N/A"
        };
    }).filter(Boolean);

    return NextResponse.json(records);
}