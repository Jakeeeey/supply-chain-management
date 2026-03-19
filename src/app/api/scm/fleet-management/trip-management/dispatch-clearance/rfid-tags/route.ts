import { NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL + '/items';
const TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

async function fetcher(endpoint: string) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json',
        },
        cache: 'no-store'
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const dispatchId = searchParams.get('dispatch_id');

    if (!dispatchId) {
        return NextResponse.json({ error: 'dispatch_id is required' }, { status: 400 });
    }

    try {
        // 1. Get all invoices for this dispatch
        const dispatchInvoicesRes = await fetcher(`/post_dispatch_invoices?filter[post_dispatch_plan_id][_eq]=${dispatchId}&limit=-1`);
        const dispatchInvoices = dispatchInvoicesRes.data || [];
        
        if (dispatchInvoices.length === 0) {
            return NextResponse.json([]);
        }

        const invoiceIds = dispatchInvoices.map((inv: any) => inv.invoice_id);

        // 2. Get the sales invoices to get the invoice_no (which is used as the link in details)
        const salesInvoicesRes = await fetcher(`/sales_invoice?filter[invoice_id][_in]=${invoiceIds.join(',')}&limit=-1&fields=invoice_id,invoice_no`);
        const salesInvoices = salesInvoicesRes.data || [];
        const invoiceNos = salesInvoices.map((si: any) => si.invoice_no);

        if (invoiceNos.length === 0) {
            return NextResponse.json([]);
        }

        // 3. Get all product IDs from the invoice details
        const detailsRes = await fetcher(`/sales_invoice_details?filter[invoice_no][_in]=${invoiceNos.join(',')}&limit=-1&fields=product_id`);
        const details = detailsRes.data || [];
        const productIds = [...new Set(details.map((d: any) => d.product_id))];

        if (productIds.length === 0) {
            return NextResponse.json([]);
        }

        // 4. Get all RFIDs for these products
        const rfidRes = await fetcher(`/purchase_order_receiving_items?filter[product_id][_in]=${productIds.join(',')}&limit=-1&fields=receiving_item_id,product_id,rfid_code`);
        const rfidItems = rfidRes.data || [];

        // 5. Transform to the expected RFIDMapping structure
        const mappings = rfidItems.map((item: any) => ({
            id: item.receiving_item_id,
            product_id: item.product_id,
            dispatch_id: parseInt(dispatchId),
            rfid: item.rfid_code
        }));

        return NextResponse.json(mappings);
    } catch (error) {
        console.error('RFID Tags API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch RFID tags' }, { status: 500 });
    }
}
