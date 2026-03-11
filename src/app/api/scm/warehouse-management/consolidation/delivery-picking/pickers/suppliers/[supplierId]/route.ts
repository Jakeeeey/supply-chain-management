import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 🚀 FIXED: Next.js 15+ requires params to be treated as a Promise
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ supplierId: string }> }
) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ ok: false }, { status: 401 });

    // 🚀 AWAIT the params before trying to read supplierId
    const resolvedParams = await params;
    const supplierId = resolvedParams.supplierId;

    if (!supplierId || supplierId === "undefined") {
        return NextResponse.json({ ok: false, message: "Missing ID" }, { status: 400 });
    }

    const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");
    const targetUrl = `${springBaseUrl}/api/consolidators/pickers/supplier/${supplierId}`;

    try {
        const springRes = await fetch(targetUrl, {
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            cache: "no-store",
        });

        if (!springRes.ok) return NextResponse.json({ ok: false }, { status: springRes.status });
        return NextResponse.json(await springRes.json());
    } catch (err) {
        return NextResponse.json({ ok: false }, { status: 502 });
    }
}