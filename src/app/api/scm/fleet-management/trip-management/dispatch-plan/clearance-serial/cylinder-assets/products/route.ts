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

export async function GET() {
    try {
        // Fetch products where is_serialized = 1 and uom_ids is 'EMPTY'
        const query = `/products?filter[is_serialized][_eq]=1&filter[uom_ids][_eq]=EMPTY&fields=product_id,product_name,product_code&limit=-1`;
        const res = await fetcher(query);
        const data = res.data || [];

        return NextResponse.json({ data });
    } catch (err) {
        console.error('Serialized Products API Error:', err);
        return NextResponse.json({ error: 'Failed to fetch serialized products' }, { status: 500 });
    }
}
