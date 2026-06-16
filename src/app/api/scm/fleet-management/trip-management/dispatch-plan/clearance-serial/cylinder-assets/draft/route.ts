import { NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL + '/items';
const TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

async function poster(endpoint: string, data: unknown) {
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
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    return response.json();
}

export async function POST(request: Request) {
    try {
        const body = await request.json(); // Array of cylinder assets

        if (!Array.isArray(body)) {
            return NextResponse.json({ error: 'Body must be an array of assets' }, { status: 400 });
        }

        const payloads = body.map((asset: any) => ({
            product_id: Number(asset.product_id),
            serial_number: asset.serial_number,
            cylinder_status: asset.cylinder_status || 'AVAILABLE',
            cylinder_condition: asset.cylinder_condition || 'GOOD',
            current_branch_id: asset.current_branch_id ? Number(asset.current_branch_id) : null,
            expiration_date: asset.expiration_date || null,
            tare_weight: asset.tare_weight ? Number(asset.tare_weight) : null,
            cost: asset.cost ? Number(asset.cost) : null,
            acquisition_date: new Date().toISOString().split('T')[0]
        }));

        const res = await poster('/cylinder_assets_draft', payloads);

        return NextResponse.json({ success: true, data: res });
    } catch (err: any) {
        console.error('Bulk Cylinder Asset Draft Registration API Error:', err);
        return NextResponse.json({ error: err.message || 'Failed to draft Cylinder Assets' }, { status: 500 });
    }
}
