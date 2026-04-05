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
        // Fetch ALL RFIDs but use relational deep fetch to get the product_id
        // This ignores dispatch_id allowing global mapping exactly as requested
        const rfidRes = await fetcher(`/consolidator_rfid_mappings?fields=id,rfid_tag_epc,detail_id.product_id&limit=-1`);
        const rfidItems = rfidRes.data || [];

        // Transform to the expected RFIDMapping structure
        interface RfidItem {
            id: number | string;
            rfid_tag_epc: string;
            detail_id: {
                product_id: number;
            };
        }
        const mappings = (rfidItems as RfidItem[])
            .filter((item) => item.detail_id?.product_id) // ensure we only map correctly assigned RFIDs
            .map((item) => ({
                id: item.id,
                product_id: item.detail_id.product_id,
                dispatch_id: 0, // Ignored by UI per instruction
                rfid: item.rfid_tag_epc ? item.rfid_tag_epc.substring(0, 24) : ''
            }));

        return NextResponse.json(mappings);
    } catch (err) {
        console.error('RFID Tags API Error:', err);
        return NextResponse.json({ error: 'Failed to fetch RFID tags' }, { status: 500 });
    }
}
