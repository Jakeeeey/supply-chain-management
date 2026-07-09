import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";

        const directusUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://goatedcodoer:8091").replace(/\/$/, "");
        let targetUrl = `${directusUrl}/items/products?limit=50&fields=product_id,product_code,product_name,barcode,description`;
        
        if (search) {
            targetUrl += `&filter[_or][0][product_name][_icontains]=${encodeURIComponent(search)}`;
            targetUrl += `&filter[_or][1][product_code][_icontains]=${encodeURIComponent(search)}`;
            targetUrl += `&filter[_or][2][barcode][_icontains]=${encodeURIComponent(search)}`;
        }
        
        const directusToken = process.env.DIRECTUS_STATIC_TOKEN || "";

        const res = await fetch(targetUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${directusToken}`,
                "Content-Type": "application/json"
            },
            cache: "no-store",
        });

        if (!res.ok) {
            return NextResponse.json([], { status: res.status });
        }

        const json = await res.json();
        return NextResponse.json(json.data || []);
    } catch (err) {
        console.error("Products Route Error:", err);
        return NextResponse.json([], { status: 502 });
    }
}
