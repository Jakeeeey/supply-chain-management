import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    // 🚀 Ensure this matches the cookie name used during login
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ ok: false }, { status: 401 });

    const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");
    const { searchParams } = new URL(req.url);

    // 🎯 Target Spring Boot Endpoint
    const targetUrl = new URL(`${springBaseUrl}/api/consolidators`);

    // 🚀 THE FIX: Forward EVERY parameter from the frontend to the backend
    // This ensures branchId, status, page, and size all arrive safely.
    searchParams.forEach((value, key) => {
        targetUrl.searchParams.set(key, value);
    });

    // 🔍 Debug log to see exactly what Next.js is sending to Spring Boot
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
            // Log the error from Spring to the Next.js terminal
            console.error(`❌ SPRING ERROR: ${springRes.status}`);
            return NextResponse.json({ ok: false }, { status: springRes.status });
        }

        const data = await springRes.json();
        return NextResponse.json(data);

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`🚨 GATEWAY ERROR: ${message}`);
        return NextResponse.json({ ok: false, error: "Gateway Timeout/Error" }, { status: 502 });
    }
}
