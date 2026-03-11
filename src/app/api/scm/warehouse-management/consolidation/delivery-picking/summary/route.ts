import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;
    if (!token) return NextResponse.json({ ok: false }, { status: 401 });

    const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");
    if (!springBaseUrl) return NextResponse.json({ ok: false }, { status: 500 });

    const targetUrl = new URL(`${springBaseUrl}/api/consolidators/summary`);

    try {
        const springRes = await fetch(targetUrl.toString(), {
            headers: { "Authorization": `Bearer ${token}` },
            cache: "no-store",
        });
        if (!springRes.ok) return NextResponse.json({ ok: false }, { status: springRes.status });
        return NextResponse.json(await springRes.json());
    } catch (err) {
        return NextResponse.json({ ok: false }, { status: 502 });
    }
}