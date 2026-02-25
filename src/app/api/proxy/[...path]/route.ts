import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
    const { path } = await context.params;
    const pathString = path.join('/');
    const searchParams = request.nextUrl.search; // Halimbawa: ?limit=1000&fields=...

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    const token = process.env.DIRECTUS_STATIC_TOKEN;

    // Dugtong ang token sa URL
    const connector = searchParams ? '&' : '?';
    const targetUrl = `${baseUrl}/${pathString}${searchParams}${connector}access_token=${token}`;

    try {
        const response = await fetch(targetUrl, { cache: 'no-store' });
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (e) {
        return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
    }
}