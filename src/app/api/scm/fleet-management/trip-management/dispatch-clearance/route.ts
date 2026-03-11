import { NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL + '/items';
const TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

async function fetcher(endpoint: string) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json',
        },
        cache: 'no-store' // Equivalent to disabling axios cache if any
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';
    const search = searchParams.get('search') || '';

    try {
        // Only fetch dispatches with status "For Clearance"
        const statusFilter = "For Clearance";

        // Query dispatches with pagination and search
        let plansQuery = `/post_dispatch_plan?filter[status][_eq]=${statusFilter}&page=${page}&limit=${limit}&meta=*`;
        if (search) {
            plansQuery += `&search=${search}`;
        }

        const plansRes = await fetcher(plansQuery);
        const plans = plansRes?.data || [];
        const total = plansRes?.meta?.filter_count ?? plansRes?.meta?.total_count ?? 0;

        if (plans.length === 0) {
            return NextResponse.json({ data: [], total: 0 });
        }

        // Get IDs for related data
        const planIds = plans.map((p: any) => p.id);
        const vehicleIds = [...new Set(plans.map((p: any) => p.vehicle_id).filter(Boolean))];

        // Fetch relations for the current page
        const [staffRes, budgetsRes, invoicesRes, usersRes, vehiclesRes, salesInvoicesRes, customersRes] = await Promise.all([
            fetcher(`/post_dispatch_plan_staff?filter[post_dispatch_plan_id][_in]=${planIds.join(',')}&limit=-1`),
            fetcher(`/post_dispatch_budgeting?filter[post_dispatch_plan_id][_in]=${planIds.join(',')}&limit=-1`),
            fetcher(`/post_dispatch_invoices?filter[post_dispatch_plan_id][_in]=${planIds.join(',')}&limit=-1`),
            fetcher('/user?limit=-1'), // Better to filter users too, but keeping it simple for now
            vehicleIds.length > 0 ? fetcher(`/vehicles?filter[vehicle_id][_in]=${vehicleIds.join(',')}&limit=-1`) : Promise.resolve({ data: [] }),
            fetcher('/sales_invoice?limit=-1'),
            fetcher('/customer?limit=-1'),
        ]);

        const staff = staffRes?.data || [];
        const users = usersRes?.data || [];
        const vehicles = vehiclesRes?.data || [];
        const budgets = budgetsRes?.data || [];
        const invoices = invoicesRes?.data || [];
        const salesInvoices = salesInvoicesRes?.data || [];
        const customers = customersRes?.data || [];

        const customerMap = new Map<string, string>();
        customers.forEach((c: any) => {
            if (c.customer_code) {
                const normalized = c.customer_code.trim().replace(/\s+/g, "");
                customerMap.set(normalized, c.customer_name || 'Unknown Customer');
            }
        });

        const joinedData = plans.map((plan: any) => {
            const planStaff = staff.find((s: any) => s.post_dispatch_plan_id === plan.id && s.role === 'Driver');
            const driver = planStaff ? users.find((u: any) => u.user_id === planStaff.user_id) : null;
            const vehicle = vehicles.find((v: any) => v.vehicle_id === plan.vehicle_id);

            const budget = budgets
                .filter((b: any) => b.post_dispatch_plan_id === plan.id)
                .reduce((sum: number, b: any) => sum + (b.amount || 0), 0);

            const planInvoices = invoices
                .filter((inv: any) => inv.post_dispatch_plan_id === plan.id)
                .map((inv: any) => {
                    const salesInv = salesInvoices.find((s: any) => s.invoice_id === inv.invoice_id);
                    const custCodeRaw = salesInv?.customer_code || "";
                    const custCode = custCodeRaw.toString().trim().replace(/\s+/g, "");
                    const foundName = customerMap.get(custCode);
                    const customerName = foundName || (custCodeRaw ? `Code: ${custCodeRaw}` : 'N/A');

                    return {
                        id: inv.id,
                        invoiceId: salesInv?.invoice_id || 0,
                        status: inv.status || 'Fulfilled',
                        orderNo: salesInv?.order_id || 'N/A',
                        invoiceNo: salesInv?.invoice_no || 'N/A',
                        invoiceDate: salesInv?.invoice_date || 'N/A',
                        customer: custCodeRaw || 'N/A',
                        customerName: customerName,
                        amount: salesInv?.total_amount || 0,
                    };
                });

            return {
                id: plan.id,
                dispatchNo: plan.doc_no,
                driverName: driver ? `${driver.user_fname} ${driver.user_lname}` : 'Unknown',
                vehiclePlate: vehicle?.vehicle_plate || 'Unknown',
                etod: plan.estimated_time_of_dispatch,
                etoa: plan.estimated_time_of_arrival,
                tripValue: plan.amount,
                budget,
                status: plan.status,
                invoices: planInvoices
            };
        });

        return NextResponse.json({ data: joinedData, total });
    } catch (error) {
        console.error('Dispatch Clearance API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch joined dispatch data' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { dispatchId, invoices } = await request.json();

        if (!dispatchId || !Array.isArray(invoices)) {
            return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
        }

        // 1. Update invoice statuses in post_dispatch_invoices
        const updates = invoices.map((inv: any) => ({
            id: inv.id,
            status: inv.status,
            isCleared: 1,
            remarks: inv.remarks || null,
            // Assuming the schema might have these or we just send them for now
            // If they don't exist in the DB, Directus might ignore them or error depending on config
        }));

        const patchResponse = await fetch(`${BASE_URL}/post_dispatch_invoices`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });

        if (!patchResponse.ok) {
            throw new Error('Failed to update invoices');
        }

        // 2. Update the dispatch plan status to 'Posted'
        const planResponse = await fetch(`${BASE_URL}/post_dispatch_plan/${dispatchId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'Posted' }),
        });

        if (!planResponse.ok) {
            throw new Error('Failed to update dispatch plan status');
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Dispatch Clearance Submission Error:', error);
        return NextResponse.json({ error: 'Failed to submit clearance data' }, { status: 500 });
    }
}
