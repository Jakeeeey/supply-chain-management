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
        // Use encodeURIComponent for parameters with spaces
        let plansQuery = `/post_dispatch_plan?filter[status][_eq]=${encodeURIComponent(statusFilter)}&page=${page}&limit=${limit}&meta=*`;
        if (search) {
            plansQuery += `&search=${encodeURIComponent(search)}`;
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

        // 1. Fetch relations for only the current page's dispatches
        const [staffRes, budgetsRes, invoicesRes, vehiclesRes] = await Promise.all([
            fetcher(`/post_dispatch_plan_staff?filter[post_dispatch_plan_id][_in]=${planIds.join(',')}&limit=-1`),
            fetcher(`/post_dispatch_budgeting?filter[post_dispatch_plan_id][_in]=${planIds.join(',')}&limit=-1`),
            fetcher(`/post_dispatch_invoices?filter[post_dispatch_plan_id][_in]=${planIds.join(',')}&limit=-1`),
            vehicleIds.length > 0 ? fetcher(`/vehicles?filter[vehicle_id][_in]=${vehicleIds.join(',')}&limit=-1`) : Promise.resolve({ data: [] }),
        ]);

        const staff = staffRes?.data || [];
        const budgets = budgetsRes?.data || [];
        const invoices = invoicesRes?.data || [];
        const vehicles = vehiclesRes?.data || [];
        const userIds = [...new Set(staff.map((s: any) => s.user_id).filter(Boolean))];

        // 2. Extract invoice IDs to fetch ONLY relevant sales invoices
        const invoiceIds = [...new Set(invoices.map((inv: any) => inv.invoice_id).filter(Boolean))];

        // 3. Fetch Users, Sales Invoices and Customers based on extracted IDs
        const [usersRes, salesInvoicesRes] = await Promise.all([
            userIds.length > 0 ? fetcher(`/user?filter[user_id][_in]=${userIds.join(',')}&limit=-1`) : Promise.resolve({ data: [] }),
            invoiceIds.length > 0 ? fetcher(`/sales_invoice?filter[invoice_id][_in]=${invoiceIds.join(',')}&limit=-1`) : Promise.resolve({ data: [] }),
        ]);

        const users = usersRes?.data || [];
        const salesInvoices = salesInvoicesRes?.data || [];
        const customerCodes = [...new Set(salesInvoices.map((si: any) => si.customer_code).filter(Boolean))];

        // 4. Fetch ONLY relevant customers
        const customersRes = customerCodes.length > 0
            ? await fetcher(`/customer?filter[customer_code][_in]=${customerCodes.join(',')}&limit=-1`)
            : { data: [] };
        const customers = customersRes?.data || [];

        const customerMap = new Map<string, string>();
        customers.forEach((c: any) => {
            if (c.customer_code) {
                const normalized = c.customer_code.toString().trim().replace(/\s+/g, "");
                customerMap.set(normalized, c.customer_name || 'Unknown Customer');
            }
        });

        const joinedData = plans.map((plan: any) => {
            const planStaff = staff.find((s: any) => s.post_dispatch_plan_id === plan.id && s.role === 'Driver');
            const driver = planStaff ? users.find((u: any) => u.user_id === planStaff.user_id) : null;
            const vehicle = vehicles.find((v: any) => v.vehicle_id === plan.vehicle_id);

            const budget = budgets
                .filter((b: any) => b.post_dispatch_plan_id === plan.id)
                .reduce((sum: number, b: any) => sum + (Number(b.amount) || 0), 0);

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
                        invoiceId: salesInv?.invoice_id || inv.invoice_id || 0,
                        status: inv.status || 'Fulfilled',
                        orderNo: salesInv?.order_id || 'N/A',
                        invoiceNo: salesInv?.invoice_no || 'N/A',
                        invoiceDate: salesInv?.invoice_date || 'N/A',
                        customer: custCodeRaw || 'N/A',
                        customerName: customerName,
                        amount: Number(salesInv?.total_amount) || 0,
                    };
                });

            return {
                id: plan.id,
                dispatchNo: plan.doc_no || 'N/A',
                driverName: driver ? `${driver.user_fname || ''} ${driver.user_lname || ''}`.trim() || 'No Name' : 'Unknown',
                vehiclePlate: vehicle?.vehicle_plate || 'Unknown',
                etod: plan.estimated_time_of_dispatch,
                etoa: plan.estimated_time_of_arrival,
                tripValue: Number(plan.amount) || 0,
                budget,
                status: plan.status,
                invoices: planInvoices
            };
        });

        return NextResponse.json({ data: joinedData, total });
    } catch (error: any) {
        console.error('Dispatch Clearance API Error:', error);
        return NextResponse.json({
            error: 'Failed to fetch joined dispatch data',
            details: error.message
        }, { status: 500 });
    }
}

async function poster(endpoint: string, data: any) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}

export async function POST(request: Request) {
    try {
        const { dispatchId, invoices } = await request.json();

        if (!dispatchId || !Array.isArray(invoices)) {
            return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
        }

        // 1. Update invoice statuses in post_dispatch_invoices
        const invoiceUpdates = invoices.map((inv: any) => ({
            id: inv.id,
            status: inv.status,
            isCleared: 1,
            remarks: inv.remarks || null,
        }));

        const patchResponse = await fetch(`${BASE_URL}/post_dispatch_invoices`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(invoiceUpdates),
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

        // 3. Handle unfulfilled transactions log
        for (const inv of invoices) {
            if (inv.status !== 'Fulfilled') {
                // Calculate variance amount if possible, or just use 0 as default
                const varianceAmount = inv.amount || 0; // Simplified logic

                // Create Transaction Header
                const transactionRes = await poster('/unfulfilled_sales_transaction', {
                    sales_invoice_id: inv.invoiceId,
                    nte: inv.remarks || '',
                    isCleared: 0,
                    checked_by: 1, // Placeholder: Should ideally come from auth session
                    date_acknowledged: new Date().toISOString(),
                    date_created: new Date().toISOString(),
                    variance_amount: varianceAmount
                });

                const transactionId = transactionRes.data.id;

                // Create Transaction Details
                if (inv.missingQtys && Object.keys(inv.missingQtys).length > 0) {
                    // Fetch original detail items to get qty and price
                    const detailsRes = await fetcher(`/sales_invoice_details?filter[invoice_id][_eq]=${inv.invoiceId}&limit=-1`);
                    const originalDetails = detailsRes.data || [];

                    const detailLogs = Object.entries(inv.missingQtys).map(([detailId, missingQty]: [any, any]) => {
                        const original = originalDetails.find((d: any) => d.id === Number(detailId));
                        return {
                            sales_invoice_detail_id: Number(detailId),
                            unfulfilled_sales_transaction_id: transactionId,
                            missing_quantity: missingQty,
                            invoice_quantity: original?.qty || 0,
                            total_amount: (original?.price || 0) * missingQty
                        };
                    });

                    if (detailLogs.length > 0) {
                        await poster('/unfulfilled_sales_transaction_details', detailLogs);
                    }
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Dispatch Clearance Submission Error:', error);
        return NextResponse.json({ error: 'Failed to submit clearance data' }, { status: 500 });
    }
}
