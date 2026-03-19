import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/**
 * 🚚 GET: Fetch In-Transit POs for a specific Supplier
 * Proxies the request from the Modal to Spring Boot.
 */
export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    // 🛑 401 if the session is expired or missing
    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    // 1. Extract the supplierId from the incoming URL
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId");

    if (!supplierId) {
        return NextResponse.json({ ok: false, message: "Supplier ID is required" }, { status: 400 });
    }

    const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");

    // 2. Map this to your new Spring Boot Controller path
    const targetUrl = `${springBaseUrl}/api/purchase-orders/in-transit?supplierId=${supplierId}`;

    try {
        const springRes = await fetch(targetUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            cache: "no-store",
        });

        // 3. Handle Backend Errors gracefully for the Modal
        if (!springRes.ok) {
            console.error(`Spring Boot PO Fetch Failed: ${springRes.status}`);
            return NextResponse.json([], { status: springRes.status });
        }

        const data = await springRes.json();

        // 4. Return the clean DTO array directly to the Modal
        return NextResponse.json(data);

    } catch (err) {
        console.error("BFF In-Transit Route Error:", err);
        return NextResponse.json([], { status: 502 });
    }
}