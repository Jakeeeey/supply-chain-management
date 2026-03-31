import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const response = await fetch(`${API_BASE_URL}/items/pdf_templates/${id}`, {
            method: 'PATCH',
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
        console.error('API Error (PATCH pdf_templates):', error);
        return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const response = await fetch(`${API_BASE_URL}/items/pdf_templates/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${STATIC_TOKEN}`,
            },
        });

        if (!response.ok) throw new Error(`Directus error: ${response.status}`);
        
        // Directus DELETE usually returns 204 No Content
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('API Error (DELETE pdf_templates):', error);
        return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }
}
