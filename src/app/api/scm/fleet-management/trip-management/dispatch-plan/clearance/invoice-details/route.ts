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
    const invoiceId = searchParams.get('invoice_id');

    if (!invoiceId) {
        return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    try {
        // 1. Fetch Invoice Header and Items in parallel
        const [invoiceRes, linesRes] = await Promise.all([
            fetcher(`/sales_invoice?filter[invoice_id][_eq]=${invoiceId}&limit=1`),
            fetcher(`/sales_invoice_details?filter[invoice_no][_eq]=${invoiceId}&limit=-1`)
        ]);

        const invoice = invoiceRes.data?.[0];
        const lines = linesRes.data || [];

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // 2. Fetch Customer, Products, and Units info for joining
        const productIds = [...new Set(lines.map((l: any) => l.product_id).filter(Boolean))];
        const unitIds = [...new Set(lines.map((l: any) => l.unit).filter(Boolean))];

        const [customerRes, productsRes, unitsRes] = await Promise.all([
            fetcher(`/customer?filter[customer_code][_eq]=${invoice.customer_code}&limit=1`),
            productIds.length > 0
                ? fetcher(`/products?filter[product_id][_in]=${productIds.join(',')}&limit=-1`)
                : Promise.resolve({ data: [] }),
            unitIds.length > 0
                ? fetcher(`/units?filter[unit_id][_in]=${unitIds.join(',')}&limit=-1`)
                : Promise.resolve({ data: [] })
        ]);

        const customer = customerRes.data?.[0];
        const products = productsRes.data || [];
        const units = unitsRes.data || [];

        // 3. Create maps for efficient joining
        const productMap = new Map(products.map((p: any) => [p.product_id, p]));
        const unitMap = new Map(units.map((u: any) => [u.unit_id, u]));

        // 4. Transform data into InvoiceDetail structure
        const enrichedLines = lines.map((l: any) => {
            const product = productMap.get(l.product_id) as any;
            const unit = unitMap.get(l.unit) as any;
            return {
                id: l.detail_id || l.id,
                product_id: l.product_id,
                product_name: product?.product_name || 'Unknown Product',
                sku: product?.product_code || 'N/A',
                unit: unit?.unit_shortcut || unit?.unit_name || 'PCS',
                qty: l.quantity || 0,
                price: l.unit_price || 0,
                net_total: l.total_amount || 0
            };
        });

        const detail = {
            header: {
                invoice_no: invoice.invoice_no,
                invoice_date: invoice.invoice_date,
                customer_name: customer?.customer_name || invoice.customer_code,
                status: invoice.transaction_status || 'Pending'
            },
            lines: enrichedLines
        };

        return NextResponse.json(detail);
    } catch (error) {
        console.error('Invoice Detail API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch invoice details' }, { status: 500 });
    }
}
