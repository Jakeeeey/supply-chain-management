import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ ok: false }, { status: 401 });

    const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");
    const { searchParams } = new URL(req.url);

    // 🎯 Target Spring Boot Endpoint
    const targetUrl = new URL(`${springBaseUrl}/api/pre-dispatch-detailed`);

    searchParams.forEach((value, key) => {
        targetUrl.searchParams.set(key, value);
    });

    console.log(`📡 PROXYING TO: ${targetUrl.toString()}`);

    try {
        const springRes = await fetch(targetUrl.toString(), {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            cache: "no-store",
        });

        if (!springRes.ok) {
            console.error(`❌ SPRING ERROR: ${springRes.status}`);
            return NextResponse.json({ ok: false }, { status: springRes.status });
        }

        const data = await springRes.json();
        return NextResponse.json(data);

    } catch (err) {
        const error = err as Error;
        console.error(`🚨 GATEWAY ERROR: ${error.message}`);
        return NextResponse.json({ ok: false, error: "Gateway Timeout/Error" }, { status: 502 });
    }
}