import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ ok: false }, { status: 401 });

    // Get dispatchIds from the query string
    const { searchParams } = new URL(req.url);
    const dispatchIds = searchParams.get("dispatchIds");

    const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");
    const targetUrl = `${springBaseUrl}/api/consolidators/preview?dispatchIds=${dispatchIds}`;

    try {
        const springRes = await fetch(targetUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            cache: "no-store",
        });

        if (!springRes.ok) return NextResponse.json({ ok: false }, { status: springRes.status });
        return NextResponse.json(await springRes.json());
    } catch (err) {
        return NextResponse.json({ ok: false }, { status: 502 });
    }
}