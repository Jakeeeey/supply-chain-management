import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

/**
 * PDF Templates Proxy API
 * This server-side route avoids CORS and secures the Directus token.
 */
export async function GET() {
    try {
        const response = await fetch(`${API_BASE_URL}/items/pdf_templates`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${STATIC_TOKEN}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) throw new Error(`Directus error: ${response.status}`);
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('API Error (GET pdf_templates):', error);
        return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const response = await fetch(`${API_BASE_URL}/items/pdf_templates`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STATIC_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) throw new Error(`Directus error: ${response.status}`);
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('API Error (POST pdf_templates):', error);
        return NextResponse.json({ error: 'Failed to save template' }, { status: 500 });
    }
}

