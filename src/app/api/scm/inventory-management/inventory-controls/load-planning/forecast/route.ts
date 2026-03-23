import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/**
 * 🚀 POST: Load Forecast Planning Data
 * Proxies the Forecast Payload to the Spring Boot Engine.
 */
export async function POST(req: NextRequest) {
    // 1. Grab the secure JWT token
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        // 2. Parse the payload sent from your React page
        const payload = await req.json();

        // Basic validation
        if (!payload.supplierId) {
            return NextResponse.json({ ok: false, message: "Supplier ID is required" }, { status: 400 });
        }

        const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");

        // 3. 🚀 Point to our NEW Spring Boot Forecast Controller
        const targetUrl = `${springBaseUrl}/api/planning/forecast`;

        // 4. Fire the request to Spring Boot
        const springRes = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload),
            cache: "no-store",
        });

        // 5. Handle Spring Boot Errors
        if (!springRes.ok) {
            console.error(`Spring Boot Forecast Load Failed: ${springRes.status}`);
            const errorText = await springRes.text();
            return NextResponse.json(
                { ok: false, message: "Failed to generate forecast data", details: errorText },
                { status: springRes.status }
            );
        }

        // 6. Return the perfectly mapped Forecast data to React!
        const data = await springRes.json();
        return NextResponse.json(data);

    } catch (err) {
        console.error("BFF Forecast Proxy Error:", err);
        return NextResponse.json(
            { ok: false, message: "BFF Network Error connecting to forecast engine" },
            { status: 502 }
        );
    }
}