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

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const serialNumber = searchParams.get('serial_number');

    if (!serialNumber) {
        return NextResponse.json({ error: 'serial_number is required' }, { status: 400 });
    }

    try {
        // Query Directus cylinder_assets collection for the serial number
        const encodedSerial = encodeURIComponent(serialNumber.trim());
        const response = await fetcher(`/cylinder_assets?filter[serial_number][_eq]=${encodedSerial}&fields=id,serial_number,product_id`);
        const data = response.data || [];

        if (data.length > 0) {
            return NextResponse.json({ exists: true, asset: data[0] });
        }

        return NextResponse.json({ exists: false });
    } catch (err) {
        console.error('Cylinder Asset API Error:', err);
        return NextResponse.json({ error: 'Failed to verify Cylinder Asset' }, { status: 500 });
    }
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

        const res = await poster('/cylinder_assets', payloads);

        return NextResponse.json({ success: true, data: res });
    } catch (err: any) {
        console.error('Bulk Cylinder Asset Registration API Error:', err);
        return NextResponse.json({ error: err.message || 'Failed to register Cylinder Assets' }, { status: 500 });
    }
}

async function patcher(endpoint: string, data: unknown) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'PATCH',
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

export async function PUT(request: Request) {
    try {
        const body = await request.json(); 
        
        if (!body.id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        const payload: any = {};
        if (body.product_id) payload.product_id = Number(body.product_id);
        if (body.cylinder_status) payload.cylinder_status = body.cylinder_status;

        const res = await patcher(`/cylinder_assets/${body.id}`, payload);

        return NextResponse.json({ success: true, data: res });
    } catch (err: any) {
        console.error('Update Cylinder Asset API Error:', err);
        return NextResponse.json({ error: err.message || 'Failed to update Cylinder Asset' }, { status: 500 });
    }
}
