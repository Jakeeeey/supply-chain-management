import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
    // 1. Grab the token from the user's browser cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    // 2. If no token, block it immediately at the BFF layer
    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized: No token found" }, { status: 401 });
    }

    const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");

    // 3. Point this to your Spring Boot Controller's endpoint for "For Consolidation"
    const targetUrl = `${springBaseUrl}/api/sales-orders/monitoring/for-consolidation`;
    try {
        // 4. Forward the GET request WITH the Authorization header
        const springRes = await fetch(targetUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            cache: "no-store",
        });

        if (!springRes.ok) {
            let errorMessage = "Failed to fetch consolidation queue";
            try {
                const errorData = await springRes.json();
                errorMessage = errorData.message || errorMessage;
            } catch {}
            return NextResponse.json({ ok: false, message: errorMessage }, { status: springRes.status });
        }

        // Return the array directly from Spring Boot
        return NextResponse.json(await springRes.json());
    } catch {
        return NextResponse.json({ ok: false, message: "BFF Network Error" }, { status: 502 });
    }
}