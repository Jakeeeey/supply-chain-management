import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const staticToken = process.env.DIRECTUS_STATIC_TOKEN;

  if (!baseUrl) {
    return NextResponse.json({ error: 'API Base URL is not defined' }, { status: 500 });
  }

  try {
    // Fetch stock transfers and branches in parallel
    const [stockRes, branchRes] = await Promise.all([
      fetch(`${baseUrl}/items/stock_transfer?limit=-1`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${staticToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }),
      fetch(`${baseUrl}/items/branches?limit=-1`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${staticToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }),
    ]);

    if (!stockRes.ok) {
      throw new Error(`Failed to fetch stock transfers: ${stockRes.statusText}`);
    }

    const stockData = await stockRes.json();

    // Branches may not exist — degrade gracefully
    let branchData = { data: [] };
    if (branchRes.ok) {
      branchData = await branchRes.json();
    }

    return NextResponse.json({
      stockTransfers: stockData.data ?? [],
      branches: branchData.data ?? [],
    });
  } catch (error) {
    console.error('Stock Transfer Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
