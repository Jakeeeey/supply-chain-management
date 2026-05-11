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
        // Fetch ALL Serials from the new consolidator_serial_mappings table
        // detail_id.product_id is used to validate against the manifest
        const serialRes = await fetcher(`/consolidator_serial_mappings?fields=id,serial_number,detail_id.product_id&limit=-1`);
        const serialItems = serialRes.data || [];
 
        // Transform to the expected SerialMapping structure
        interface SerialItem {
            id: number | string;
            serial_number: string;
            detail_id: {
                product_id: number;
            };
        }
        const mappings = (serialItems as SerialItem[])
            .filter((item) => item.detail_id?.product_id) // ensure we only map correctly assigned Serials
            .map((item) => ({
                id: item.id,
                product_id: item.detail_id.product_id,
                dispatch_id: 0, // Ignored by UI per instruction
                serial: item.serial_number || ''
            }));

        return NextResponse.json(mappings);
    } catch (err) {
        console.error('Serial Numbers API Error:', err);
        return NextResponse.json({ error: 'Failed to fetch Serial Numbers' }, { status: 500 });
    }
}
