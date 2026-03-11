import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/**
 * 🚀 GET: Fetch Real Branches from Spring Boot
 * Proxies the request and attaches the 'vos_access_token' for authorization.
 */
export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    // 🛑 401 if the user isn't logged in
    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");
    const targetUrl = `${springBaseUrl}/api/branches/active`;

    try {
        const springRes = await fetch(targetUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            cache: "no-store", // ⚡ Always get fresh branch data
        });

        if (!springRes.ok) {
            console.error(`Spring Boot Branch Fetch Failed: ${springRes.status}`);
            return NextResponse.json([], { status: springRes.status });
        }

        const data = await springRes.json();
        return NextResponse.json(data);
    } catch (err) {
        console.error("BFF Branch Route Error:", err);
        return NextResponse.json([], { status: 502 });
    }
}