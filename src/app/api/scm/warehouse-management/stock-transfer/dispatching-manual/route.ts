import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const staticToken = process.env.DIRECTUS_STATIC_TOKEN;

  if (!baseUrl) {
    return NextResponse.json({ error: 'API Base URL is not defined' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { ids, status } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Missing required field: ids array' }, { status: 400 });
    }

    // Update the status of each selected stock transfer line item
    const results = await Promise.all(
      ids.map(async (id: number) => {
        return fetch(`${baseUrl}/items/stock_transfer/${id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${staticToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            status: String(status)
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const err = await res.text();
            throw new Error(`Directus PATCH failed for ID ${id}: ${err}`);
          }
          return res.json();
        });
      })
    );

    return NextResponse.json({ 
      success: true, 
      count: ids.length, 
      data: results
    }, { status: 200 });
  } catch (error) {
    console.error('Manual Dispatch PATCH Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
