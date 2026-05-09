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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    try {
        // Only fetch dispatches with status "For Clearance"
        const statusFilter = "For Clearance";
        let plansQuery = `/post_dispatch_plan?filter[status][_eq]=${encodeURIComponent(statusFilter)}&page=${page}&limit=${limit}&meta=*`;

        // If search is provided, we need to find matching vehicle IDs and member IDs
        if (search) {
            const searchTerm = encodeURIComponent(search);
            
            // 1. Find matching vehicles
            let matchedVehicleIds: number[] = [];
            try {
                const vehiclesRes = await fetcher(`/vehicles?filter[vehicle_plate][_icontains]=${searchTerm}&fields=vehicle_id`);
                matchedVehicleIds = (vehiclesRes?.data || []).map((v: { vehicle_id: number }) => v.vehicle_id);
            } catch (vErr) {
                console.warn('Search: Vehicle sub-fetch failed', vErr);
            }

            // 2. Find matching users (Driver Name)
            // Searching in user_fname, user_lname (Removing user_name as it doesn't exist in schema)
            let matchedUserIds: number[] = [];
            try {
                const usersRes = await fetcher(`/user?filter[_or][0][user_fname][_icontains]=${searchTerm}&filter[_or][1][user_lname][_icontains]=${searchTerm}&fields=user_id`);
                matchedUserIds = (usersRes?.data || []).map((u: { user_id: number }) => u.user_id);
            } catch (uErr) {
                console.warn('Search: User sub-fetch failed', uErr);
            }

            let matchedPlanIds: number[] = [];
            if (matchedUserIds.length > 0) {
                try {
                    const staffRes = await fetcher(`/post_dispatch_plan_staff?filter[user_id][_in]=${matchedUserIds.join(',')}&filter[role][_eq]=Driver&fields=post_dispatch_plan_id`);
                    matchedPlanIds = (staffRes?.data || []).map((s: { post_dispatch_plan_id: number }) => s.post_dispatch_plan_id);
                } catch (sErr) {
                    console.warn('Search: Staff sub-fetch failed', sErr);
                }
            }

            // 3. Construct the combined filter for post_dispatch_plan
            // (doc_no ~ search) OR (vehicle_id IN matchedVehicleIds) OR (id IN matchedPlanIds)
            let searchFilter = `&filter[_or][0][doc_no][_icontains]=${searchTerm}`;
            let orIndex = 1;

            if (matchedVehicleIds.length > 0) {
                searchFilter += `&filter[_or][${orIndex}][vehicle_id][_in]=${matchedVehicleIds.join(',')}`;
                orIndex++;
            }

            if (matchedPlanIds.length > 0) {
                searchFilter += `&filter[_or][${orIndex}][id][_in]=${matchedPlanIds.join(',')}`;
                orIndex++;
            }

            plansQuery += searchFilter;
        }

        // Apply date filters if provided
        if (startDate && endDate) {
            plansQuery += `&filter[estimated_time_of_dispatch][_between]=${startDate},${endDate}`;
        } else if (startDate) {
            plansQuery += `&filter[estimated_time_of_dispatch][_gte]=${startDate}`;
        } else if (endDate) {
            plansQuery += `&filter[estimated_time_of_dispatch][_lte]=${endDate}`;
        }

        const plansRes = await fetcher(plansQuery);
        const plans = plansRes?.data || [];
        const total = plansRes?.meta?.filter_count ?? plansRes?.meta?.total_count ?? plansRes?.meta?.total ?? 0;

        if (plans.length === 0) {
            return NextResponse.json({ data: [], total: 0 });
        }

        // Get IDs for related data
        const planIds = plans.map((p: { id: number }) => p.id);
        const vehicleIds = [...new Set(plans.map((p: { vehicle_id: number }) => p.vehicle_id).filter(Boolean))];

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
        const userIds = [...new Set(staff.map((s: { user_id: number }) => s.user_id).filter(Boolean))];

        // 2. Extract invoice IDs to fetch ONLY relevant sales invoices
        const invoiceIds = [...new Set(invoices.map((inv: { invoice_id: number }) => inv.invoice_id).filter(Boolean))];

        // 3. Fetch Users, Sales Invoices and Customers based on extracted IDs
        const [usersRes, salesInvoicesRes] = await Promise.all([
            userIds.length > 0 ? fetcher(`/user?filter[user_id][_in]=${userIds.join(',')}&limit=-1`) : Promise.resolve({ data: [] }),
            invoiceIds.length > 0 ? fetcher(`/sales_invoice?filter[invoice_id][_in]=${invoiceIds.join(',')}&limit=-1`) : Promise.resolve({ data: [] }),
        ]);

        const users = usersRes?.data || [];
        const salesInvoices = salesInvoicesRes?.data || [];

        // 4. Fetch Vehicle Types and Branches
        const vehicleTypeIds = [...new Set(vehicles.map((v: { vehicle_type: number }) => v.vehicle_type).filter(Boolean))];
        const branchIds = [...new Set(plans.map((p: { starting_point: number }) => p.starting_point).filter(Boolean))];

        const [typesRes, branchesRes] = await Promise.all([
            vehicleTypeIds.length > 0 ? fetcher(`/vehicle_type?filter[id][_in]=${vehicleTypeIds.join(',')}&limit=-1`) : Promise.resolve({ data: [] }),
            branchIds.length > 0 ? fetcher(`/branches?filter[id][_in]=${branchIds.join(',')}&limit=-1`) : Promise.resolve({ data: [] }),
        ]);

        const vehicleTypes = typesRes?.data || [];
        const branches = branchesRes?.data || [];

        // 6. Fetch Cluster information
        const [pdpRes] = await Promise.all([
            fetcher(`/post_dispatch_dispatch_plans?filter[post_dispatch_plan_id][_in]=${planIds.join(',')}&limit=-1`),
        ]);
        const postDispatchPlans = pdpRes?.data || [];
        const dispatchPlanIds = [...new Set(postDispatchPlans.map((p: { dispatch_plan_id: number }) => p.dispatch_plan_id).filter(Boolean))];

        const [dpRes] = await Promise.all([
            dispatchPlanIds.length > 0 ? fetcher(`/dispatch_plan?filter[dispatch_id][_in]=${dispatchPlanIds.join(',')}&limit=-1`) : Promise.resolve({ data: [] }),
        ]);
        const dispatchPlans = dpRes?.data || [];
        const clusterIds = [...new Set(dispatchPlans.map((d: { cluster_id: number }) => d.cluster_id).filter(Boolean))];

        const [clustersRes] = await Promise.all([
            clusterIds.length > 0 ? fetcher(`/cluster?filter[id][_in]=${clusterIds.join(',')}&limit=-1`) : Promise.resolve({ data: [] }),
        ]);
        const clusters = clustersRes?.data || [];

        const customerCodes = [...new Set(salesInvoices.map((si: { customer_code: string }) => si.customer_code).filter(Boolean))];

        // 5. Fetch ONLY relevant customers
        const customersRes = customerCodes.length > 0
            ? await fetcher(`/customer?filter[customer_code][_in]=${customerCodes.join(',')}&limit=-1`)
            : { data: [] };
        const customers = customersRes?.data || [];

        const customerMap = new Map<string, string>();
        customers.forEach((c: { customer_code: string; customer_name: string }) => {
            if (c.customer_code) {
                const normalized = c.customer_code.toString().trim().replace(/\s+/g, "");
                customerMap.set(normalized, c.customer_name || 'Unknown Customer');
            }
        });

        // 7. Fetch Reconciliation Data (Unfulfilled Transactions)
        const [transactionsRes] = await Promise.all([
            invoiceIds.length > 0 ? fetcher(`/unfulfilled_sales_transaction?filter[sales_invoice_id][_in]=${invoiceIds.join(',')}&limit=-1`) : Promise.resolve({ data: [] }),
        ]);
        const transactions = transactionsRes?.data || [];
        const transactionIds = transactions.map((t: { id: number }) => t.id);

        const [transDetailsRes] = await Promise.all([
            transactionIds.length > 0 ? fetcher(`/unfulfilled_sales_transaction_details?filter[unfulfilled_sales_transaction_id][_in]=${transactionIds.join(',')}&limit=-1`) : Promise.resolve({ data: [] }),
        ]);
        const transDetails = transDetailsRes?.data || [];
        const transDetailIds = transDetails.map((d: { id: number }) => d.id);

        const [transRFIDsRes] = await Promise.all([
            transDetailIds.length > 0 ? fetcher(`/unfulfilled_sales_transaction_rfid?filter[unfulfilled_sales_transaction_detail_id][_in]=${transDetailIds.join(',')}&limit=-1`) : Promise.resolve({ data: [] }),
        ]);
        const transRFIDs = transRFIDsRes?.data || [];

        interface Plan {
            id: number;
            doc_no: string;
            driver_id: number;
            vehicle_id: number;
            estimated_time_of_dispatch: string;
            estimated_time_of_arrival: string;
            amount: string | number;
            status: string;
            starting_point: number;
        }

        const joinedData = plans.map((plan: Plan) => {
            const planStaff = staff.find((s: { post_dispatch_plan_id: number; role: string; user_id: number }) => s.post_dispatch_plan_id === plan.id && s.role === 'Driver');
            const driver = planStaff ? users.find((u: { user_id: number; user_fname: string; user_lname: string }) => u.user_id === planStaff.user_id) : null;
            const vehicle = vehicles.find((v: { vehicle_id: number; vehicle_plate: string; vehicle_type: number }) => v.vehicle_id === plan.vehicle_id);

            const budget = budgets
                .filter((b: { post_dispatch_plan_id: number; amount: string | number }) => b.post_dispatch_plan_id === plan.id)
                .reduce((sum: number, b: { amount: string | number }) => sum + (Number(b.amount) || 0), 0);

            const planInvoices = invoices
                .filter((inv: { post_dispatch_plan_id: number }) => inv.post_dispatch_plan_id === plan.id)
                .map((inv: { id: number; invoice_id: number; status: string; remarks: string }) => {
                    const salesInv = salesInvoices.find((s: { invoice_id: number; customer_code: string; order_id: string; invoice_no: string; invoice_date: string; total_amount: string | number }) => s.invoice_id === inv.invoice_id);
                    const custCodeRaw = salesInv?.customer_code || "";
                    const custCode = custCodeRaw.toString().trim().replace(/\s+/g, "");
                    const foundName = customerMap.get(custCode);
                    const customerName = foundName || (custCodeRaw ? `Code: ${custCodeRaw}` : 'N/A');

                    return {
                        id: inv.id,
                        invoiceId: salesInv?.invoice_id || inv.invoice_id || 0,
                        status: (() => {
                            const s = inv.status;
                            if (s === 'Not Fulfilled') return 'Unfulfilled';
                            if (s === 'Fulfilled With Concerns') return 'Fulfilled with Concerns';
                            if (s === 'Fulfilled With Returns') return 'Fulfilled with Returns';
                            return s || 'Pending';
                        })(),
                        orderNo: salesInv?.order_id || 'N/A',
                        invoiceNo: salesInv?.invoice_no || 'N/A',
                        invoiceDate: salesInv?.invoice_date || 'N/A',
                        customer: custCodeRaw || 'N/A',
                        customerName: customerName,
                        amount: Number(salesInv?.total_amount) || 0,
                        remarks: inv.remarks || '',
                        // Reconciliation data restoration
                        missingQtys: (() => {
                            const transaction = transactions.find((t: { sales_invoice_id: number; id: number }) => t.sales_invoice_id === inv.invoice_id);
                            if (!transaction) return {};
                            const details = transDetails.filter((d: { unfulfilled_sales_transaction_id: number }) => d.unfulfilled_sales_transaction_id === transaction.id);
                            const map: Record<string | number, number> = {};
                            details.forEach((d: { sales_invoice_detail_id: number; missing_quantity: number }) => {
                                map[d.sales_invoice_detail_id] = d.missing_quantity;
                            });
                            return map;
                        })(),
                        scannedQtys: (() => {
                            const transaction = transactions.find((t: { sales_invoice_id: number; id: number }) => t.sales_invoice_id === inv.invoice_id);
                            if (!transaction) return {};
                            const details = transDetails.filter((d: { unfulfilled_sales_transaction_id: number }) => d.unfulfilled_sales_transaction_id === transaction.id);
                            const map: Record<string | number, number> = {};
                            details.forEach((d: { sales_invoice_detail_id: number; invoice_quantity: number; missing_quantity: number }) => {
                                // Scanned = Original - Missing
                                const original = d.invoice_quantity || 0;
                                const missing = d.missing_quantity || 0;
                                map[d.sales_invoice_detail_id] = Math.max(0, original - missing);
                            });
                            return map;
                        })(),
                        scannedRFIDs: (() => {
                            const transaction = transactions.find((t: { sales_invoice_id: number; id: number }) => t.sales_invoice_id === inv.invoice_id);
                            if (!transaction) return {};
                            const details = transDetails.filter((d: { unfulfilled_sales_transaction_id: number; id: number }) => {
                                const matched = d.unfulfilled_sales_transaction_id === transaction.id;
                                // Also ensure there are RFIDs for this detail
                                return matched && transRFIDs.some((r: { unfulfilled_sales_transaction_detail_id: number }) => r.unfulfilled_sales_transaction_detail_id === d.id);
                            });
                            const map: Record<string | number, string[]> = {};
                            details.forEach((d: { id: number; sales_invoice_detail_id: number }) => {
                                const matchedRFIDs = transRFIDs
                                    .filter((r: { unfulfilled_sales_transaction_detail_id: number; rfid_tag: string }) => r.unfulfilled_sales_transaction_detail_id === d.id)
                                    .map((r: { rfid_tag: string }) => r.rfid_tag);
                                if (matchedRFIDs.length > 0) {
                                    map[d.sales_invoice_detail_id] = matchedRFIDs;
                                }
                            });
                            return map;
                        })()
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
                vehicleType: vehicleTypes.find((t: { id: number; type_name: string }) => t.id === vehicle?.vehicle_type)?.type_name || 'N/A',
                branchName: branches.find((b: { id: number; branch_name: string }) => b.id === plan?.starting_point)?.branch_name || 'N/A',
                clusterName: clusters.find((c: { id: number; cluster_name: string }) => {
                    const pdp = postDispatchPlans.find((p: { post_dispatch_plan_id: number; dispatch_plan_id: number }) => p.post_dispatch_plan_id === plan.id);
                    const dp = pdp ? dispatchPlans.find((d: { dispatch_id: number; cluster_id: number }) => d.dispatch_id === pdp.dispatch_plan_id) : null;
                    return dp && c.id === dp.cluster_id;
                })?.cluster_name || 'N/A',
                invoices: planInvoices
            };
        });

        return NextResponse.json({ data: joinedData, total });
    } catch (err) {
        console.error('Dispatch Clearance API Error:', err);
        const error = err as Error;
        return NextResponse.json({
            error: 'Failed to fetch joined dispatch data',
            details: error.message
        }, { status: 500 });
    }
}

async function poster<T = unknown>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`POST error at ${endpoint}:`, errorText, "Payload:", JSON.stringify(data));
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    return response.json();
}

export async function POST(request: Request) {
    try {
        const { dispatchId, invoices, isPreSave = false } = await request.json();

        if (!dispatchId || !Array.isArray(invoices)) {
            return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
        }

        // 1. Update post_dispatch_invoices.status
        const invoiceUpdates = invoices.map((inv: { id: number; status: string; remarks?: string }) => {
            let pdiStatus = inv.status;
            if (inv.status === 'Unfulfilled') pdiStatus = 'Not Fulfilled';
            if (inv.status === 'Fulfilled with Concerns') pdiStatus = 'Fulfilled with Concerns';
            if (inv.status === 'Fulfilled with Returns') pdiStatus = 'Fulfilled with Returns';
            
            return {
                id: inv.id,
                status: pdiStatus,
                remarks: inv.remarks || null,
            };
        });

        const patchResponse = await fetch(`${BASE_URL}/post_dispatch_invoices`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(invoiceUpdates),
        });

        if (!patchResponse.ok) {
            throw new Error('Failed to update post_dispatch_invoices');
        }
    
        // 2. Update the dispatch plan status to 'Posted' - SKIP if Pre-Save
        if (!isPreSave) {
            const planResponse = await fetch(`${BASE_URL}/post_dispatch_plan/${dispatchId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: 'Posted' }),
            });
    
            if (!planResponse.ok) {
                throw new Error('Failed to update post_dispatch_plan');
            }
        }

        // 3. Update sales_invoice.transaction_status - SKIP if Pre-Save
        if (!isPreSave) {
            const siUpdates = invoices.map((inv: { invoiceId: number; status: string }) => {
                let siStatus = 'Completed';
                if (inv.status === 'Unfulfilled') siStatus = 'Not Delivered';
                if (inv.status === 'Fulfilled with Concerns') siStatus = 'Completed with Concerns';
                if (inv.status === 'Fulfilled with Returns') siStatus = 'Completed with Returns';
    
                const update: Record<string, unknown> = {
                    invoice_id: inv.invoiceId,
                    transaction_status: siStatus
                };

                // If Not Delivered, reset isDispatched to 0
                if (siStatus === 'Not Delivered') {
                    update.isDispatched = 0;
                }

                return update;
            });
    
            const siPatchRes = await fetch(`${BASE_URL}/sales_invoice`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(siUpdates),
            });
    
            if (!siPatchRes.ok) {
                throw new Error('Failed to update sales_invoice');
            }
    
            // 4. Update sales_order.order_status - SKIP if Pre-Save
            const orderNos = [...new Set(invoices.map((inv: { orderNo: string }) => inv.orderNo).filter((no: string) => no && no !== 'N/A'))];
            if (orderNos.length > 0) {
                // Encode properly for API query
                const encodedOrderNos = orderNos.map(no => encodeURIComponent(no)).join(',');
                const soRes = await fetcher(`/sales_order?filter[order_no][_in]=${encodedOrderNos}&limit=-1&fields=order_id,order_no`);
                const salesOrders = soRes.data || [];
    
                const soUpdates = invoices.map((inv: { orderNo: string; status: string }) => {
                    const so = salesOrders.find((s: { order_no: string; order_id: number }) => s.order_no === inv.orderNo);
                    // If we don't find the sales order, skip it
                    if (!so || !so.order_id) return null;
                    
                    let soStatus = 'Delivered';
                    if (inv.status === 'Unfulfilled') soStatus = 'Not Fulfilled';
                    
                    return {
                        order_id: so.order_id,
                        order_status: soStatus
                    };
                }).filter(Boolean);
    
                if (soUpdates.length > 0) {
                    const soPatchRes = await fetch(`${BASE_URL}/sales_order`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${TOKEN}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(soUpdates),
                    });
                    
                    if (!soPatchRes.ok) {
                         throw new Error('Failed to update sales_order');
                    }
                }
            }
        }

        // 5. Fetch dispatcher plan context for checked_by ID
        const dispatchPlanContextRes = await fetcher(`/post_dispatch_plan/${dispatchId}?fields=encoder_id`);
        const validCheckedBy = dispatchPlanContextRes.data?.encoder_id || null;

        console.log(`[Clearance POST] Processing ${invoices.length} invoices...`);

        // 6. Handle unfulfilled transactions log
        for (const inv of invoices as { invoiceNo: string; id: number; status: string; invoiceId: number; remarks: string; missingQtys: Record<string, number>; scannedRFIDs: Record<string, string[]> }[]) {
            console.log(`[Clearance POST] Checking invoice ${inv.invoiceNo} (id: ${inv.id}, status: ${inv.status})`);
            if (inv.status !== 'Fulfilled' && inv.status !== 'Fulfilled with Returns') {
                console.log(`[Clearance POST]   -> Creating unfulfilled transaction log for invoice ${inv.invoiceNo}`);
                // Fetch original detail items to get qty and unit price
                const detailsRes = await fetcher(`/sales_invoice_details?filter[invoice_no][_eq]=${inv.invoiceId}&limit=-1`);
                const originalDetails = (detailsRes.data || []) as { detail_id?: number; id: number; quantity: number; total_amount: number | string; unit_price: number | string; sales_invoice_detail_id: number }[];

                let varianceAmount = 0;
                const detailLogs: { sales_invoice_detail_id: number; missing_quantity: number; invoice_quantity: number; total_amount: number }[] = [];
                
                // Collect IDs from both sources to ensure we create records for items with RFIDs even if missingQty is 0
                // If Unfulfilled AND Final Confirm, we ensure ALL items are included even if missingQtys is empty
                const detailIdsToLog = new Set([
                    ...Object.keys(inv.missingQtys || {}),
                    ...Object.keys(inv.scannedRFIDs || {}),
                    ...(!isPreSave && inv.status === 'Unfulfilled' ? originalDetails.map((d) => (d.detail_id || d.id).toString()) : [])
                ]);

                if (detailIdsToLog.size > 0) {
                    detailIdsToLog.forEach((detailIdStr) => {
                        const detailId = Number(detailIdStr);
                        let missingQty = (inv.missingQtys || {})[detailIdStr] || 0;
                        const original = originalDetails.find((d) => (d.detail_id || d.id) === detailId);

                        // If Unfulfilled AND Final Confirm and item was NOT interacted with (not in payload), assume full missing qty
                        const wasInteracted = Object.prototype.hasOwnProperty.call(inv.missingQtys || {}, detailIdStr);
                        if (!isPreSave && inv.status === 'Unfulfilled' && !wasInteracted && original) {
                            missingQty = original.quantity || 0;
                        }
                        
                        let unitPrice = 0;
                        if (original) {
                            if (original.total_amount && original.quantity) {
                                unitPrice = Number(original.total_amount) / Number(original.quantity);
                            } else if (original.unit_price) {
                                unitPrice = Number(original.unit_price);
                            }
                        }

                        const missingAmount = unitPrice * Number(missingQty);
                        varianceAmount += missingAmount;

                        detailLogs.push({
                            sales_invoice_detail_id: detailId,
                            // unfulfilled_sales_transaction_id will be appended below
                            missing_quantity: missingQty,
                            invoice_quantity: original?.quantity || 0,
                            total_amount: missingAmount
                        });
                    });
                }

                console.log(`[Clearance POST]   -> Found ${detailLogs.length} detail logs to be persisted.`);

                // Skip creating/updating transaction header if no details to log during Pre-Save
                if (isPreSave && detailLogs.length === 0) {
                    console.log(`[Clearance POST]   -> No interactive data for invoice ${inv.invoiceNo}. Skipping transaction log for Pre-Save.`);
                    continue;
                }

                // Make sure to process scannedQtys if they are treated as returns, ensuring they are logged too
                // For simplicity, we assume missingQtys already captures the differences correctly per frontend logic.

                const payload: Record<string, unknown> = {
                    sales_invoice_id: inv.invoiceId,
                    nte: inv.remarks || '',
                    date_acknowledged: new Date().toISOString(),
                    variance_amount: Number.isNaN(varianceAmount) ? 0 : varianceAmount
                };
                
                if (validCheckedBy) {
                    payload.checked_by = validCheckedBy;
                }

                // Check if a transaction already exists for this invoice to prevent unique constraint errors
                const existingTransactionRes = await fetcher(`/unfulfilled_sales_transaction?filter[sales_invoice_id][_eq]=${inv.invoiceId}&limit=1`);
                const existingTransaction = existingTransactionRes.data?.[0];

                let transactionId;

                if (existingTransaction) {
                    // Update existing transaction
                    const patchRes = await fetch(`${BASE_URL}/unfulfilled_sales_transaction/${existingTransaction.id}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${TOKEN}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ ...payload, date_created: existingTransaction.date_created || new Date().toISOString() }), // Keep existing date_created if any or default
                    });
                    
                    if (!patchRes.ok) {
                        const errText = await patchRes.text();
                        console.error(`[Clearance POST] !! Failed to UPDATE existing unfulfilled_sales_transaction ${existingTransaction.id}:`, errText);
                        throw new Error(`Failed to update unfulfilled_sales_transaction: ${errText}`);
                    }
                    console.log(`[Clearance POST]   -> Successfully updated existing transaction ${existingTransaction.id}.`);
                    transactionId = existingTransaction.id;

                    // DELETE existing details and RFIDs to prevent duplication on update
                    try {
                        // 1. Fetch existing details for this transaction
                        const existingDetailsRes = await fetcher(`/unfulfilled_sales_transaction_details?filter[unfulfilled_sales_transaction_id][_eq]=${transactionId}&fields=id`);
                        const existingDetailIds = (existingDetailsRes.data || []).map((d: { id: number }) => d.id);

                        if (existingDetailIds.length > 0) {
                            // 2. Delete existing RFIDs associated with these details
                            // First fetch the RFID IDs because bulk delete by filter might not be supported
                            const rfidIdsRes = await fetcher(`/unfulfilled_sales_transaction_rfid?filter[unfulfilled_sales_transaction_detail_id][_in]=${existingDetailIds.join(',')}&fields=id`);
                            const rfidIds = (rfidIdsRes.data || []).map((r: { id: number }) => r.id);

                            if (rfidIds.length > 0) {
                                await fetch(`${BASE_URL}/unfulfilled_sales_transaction_rfid`, {
                                    method: 'DELETE',
                                    headers: { 
                                        'Authorization': `Bearer ${TOKEN}`,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify(rfidIds)
                                });
                            }

                            // 3. Delete existing details by IDs
                            await fetch(`${BASE_URL}/unfulfilled_sales_transaction_details`, {
                                method: 'DELETE',
                                headers: { 
                                    'Authorization': `Bearer ${TOKEN}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(existingDetailIds)
                            });
                        }
                    } catch (delErr: unknown) {
                        const err = delErr as Error;
                        console.error("Failed to delete cleared invoice from Directus:", err?.message || err);
                    }
                } else {
                    // Create new header
                    payload.date_created = new Date().toISOString();
                    const transactionRes = await poster<{ data: { id: number } }>('/unfulfilled_sales_transaction', payload);
                    transactionId = transactionRes.data.id;
                }

                // Create Transaction Details
                if (detailLogs.length > 0) {
                    const finalDetailLogs = detailLogs.map(log => ({
                        ...log,
                        unfulfilled_sales_transaction_id: transactionId
                    }));

                    // We could also check and patch existing details here, but typically there are no collision constraints on these details
                    const detailsResult = await poster<{ data: Record<string, unknown>[] | Record<string, unknown> }>('/unfulfilled_sales_transaction_details', finalDetailLogs);
                    const createdDetails = (Array.isArray(detailsResult.data) ? detailsResult.data : [detailsResult.data]) as { id: number; sales_invoice_detail_id: number | { id: number } }[];

                    // Insert RFID tags mapping
                    if (inv.scannedRFIDs && Object.keys(inv.scannedRFIDs).length > 0) {
                        const rfidPayloads: Record<string, unknown>[] = [];
                        console.log(`[Clearance POST]   -> Bulk Saving RFIDs for Invoice ${inv.invoiceNo}...`);
                        console.log(`[Clearance POST]   -> Scanned RFID Data:`, JSON.stringify(inv.scannedRFIDs));
                        
                        // We map by matching the sales_invoice_detail_id we sent with the one returned by DB
                        createdDetails.forEach((createdDetail: { id: number; sales_invoice_detail_id: number | { id: number } }) => {
                            // Extract ID - handle both number and potentially nested object from Directus
                            const dbSalesDetailId = typeof createdDetail.sales_invoice_detail_id === 'object' 
                                ? createdDetail.sales_invoice_detail_id?.id 
                                : createdDetail.sales_invoice_detail_id;
                            
                            const matchedTags = inv.scannedRFIDs[dbSalesDetailId];
                            
                            if (matchedTags && Array.isArray(matchedTags)) {
                                console.log(`[Clearance POST]     -> Detail ID ${createdDetail.id} matched ${matchedTags.length} tags`);
                                matchedTags.forEach((tag: string) => {
                                    const rfidLog: Record<string, unknown> = {
                                        unfulfilled_sales_transaction_detail_id: createdDetail.id,
                                        rfid_tag: tag,
                                        created_at: new Date().toISOString()
                                    };
                                    
                                    if (validCheckedBy) {
                                        rfidLog.created_by = validCheckedBy;
                                    }
                                    
                                    rfidPayloads.push(rfidLog);
                                });
                            } else {
                                console.log(`[Clearance POST]     -> Detail ID ${createdDetail.id} (SalesDetail ${dbSalesDetailId}) had no matching scanned RFIDs.`);
                            }
                        });

                        if (rfidPayloads.length > 0) {
                            console.log(`[Clearance POST]   -> Final RFID Payload count: ${rfidPayloads.length}`);
                            console.log(`[Clearance POST]   -> Sending to Directus:`, JSON.stringify(rfidPayloads));
                            try {
                                const rfidResult = await poster<{ data: Record<string, unknown>[] | Record<string, unknown> }>('/unfulfilled_sales_transaction_rfid', rfidPayloads);
                                console.log(`[Clearance POST]   -> RFID save success. Rows created:`, Array.isArray(rfidResult.data) ? rfidResult.data.length : 1);
                            } catch (rfidErr: unknown) {
                                const err = rfidErr as Error;
                                console.error('RFID removal error on cancellation:', err?.message || err);
                            }
                        } else {
                            console.log(`[Clearance POST]   !! No RFIDs were matched to any created transaction details.`);
                        }
                    }
                }
            } else {
                console.log(`[Clearance POST]   -> Status is Fulfilled. Skipping unfulfilled transaction logic.`);
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Dispatch Clearance Submission Error:', err);
        const error = err as Error;
        return NextResponse.json({ error: 'Failed to submit clearance data', details: error.message }, { status: 500 });
    }
}