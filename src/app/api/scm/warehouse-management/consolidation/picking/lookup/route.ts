import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ ok: false }, { status: 401 });

    const rfid = req.nextUrl.searchParams.get("rfid");
    if (!rfid) return NextResponse.json({ message: "RFID required" }, { status: 400 });

    const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");
    const targetUrl = `${springBaseUrl}/api/consolidators/picking/lookup?rfid=${rfid}`;

    try {
        const springRes = await fetch(targetUrl, {
            headers: { "Authorization": `Bearer ${token}` },
            cache: "no-store",
        });

        if (!springRes.ok) return NextResponse.json({ ok: false }, { status: springRes.status });
        return NextResponse.json(await springRes.json());
    } catch (err) {
        return NextResponse.json({ ok: false }, { status: 502 });
    }
}