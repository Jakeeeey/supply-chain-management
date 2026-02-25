import { NextResponse } from 'next/server';

export async function GET() {
  // Kunin ang base URL at Token mula sa .env
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const staticToken = process.env.DIRECTUS_STATIC_TOKEN;

  // Error handling kung sakaling hindi nabasa ang .env
  if (!baseUrl) {
    return NextResponse.json({ error: "API Base URL is not defined" }, { status: 500 });
  }

  try {
    // Pag-construct ng URL gamit ang env variable
    const apiUrl = `${baseUrl}/items/purchase_order?limit=-1`;

    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        // Idagdag ang Static Token para sa authorization (kung kailangan ng Directus mo)
        'Authorization': `Bearer ${staticToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch: ${res.statusText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}