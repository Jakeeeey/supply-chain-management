import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    // 🚀 THE FIX: Defensively strip trailing slashes AND any trailing "/api" to prevent double /api/api calls to Spring Boot!
    const rawBaseUrl = process.env.SPRING_API_BASE_URL || "";
    const springBaseUrl = rawBaseUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");

    if (!springBaseUrl) {
        return NextResponse.json({ ok: false, message: "Server misconfiguration" }, { status: 500 });
    }

    // Now this will correctly resolve to http://localhost:8080/api/consolidators/summary every single time!
    const targetUrl = new URL(`${springBaseUrl}/api/consolidators/summary`);

    try {
        const springRes = await fetch(targetUrl.toString(), {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            cache: "no-store", // Crucial for real-time dashboards!
        });

        if (!springRes.ok) {
            console.error(`Spring Boot returned ${springRes.status} for ${targetUrl.toString()}`);
            return NextResponse.json({ ok: false }, { status: springRes.status });
        }

        const data = await springRes.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("Next.js Proxy Fetch Error:", error);
        return NextResponse.json({ ok: false, message: "Failed to reach Spring Boot" }, { status: 502 });
    }
}