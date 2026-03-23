import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    // 1. Grab the secure JWT from the user's cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value; // Adjust cookie name if yours is different

    if (!token) {
        return NextResponse.json(
            { ok: false, message: "Unauthorized. Please log in." },
            { status: 401 }
        );
    }

    try {
        // 2. Parse the payload coming from your React UI (submitPurchaseOrder)
        const payload = await req.json();

        // 3. Point to your Spring Boot Backend endpoint
        const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8080";
        const targetUrl = `${springBaseUrl}/api/purchase-orders/create-from-planning`;

        // 4. Forward the request to Spring Boot with the Authorization Header
        const springRes = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload),
            cache: "no-store",
        });

        // 5. Handle Spring Boot's response gracefully
        if (!springRes.ok) {
            const errorData = await springRes.json().catch(() => ({}));
            return NextResponse.json(
                {
                    ok: false,
                    message: errorData.message || "Backend failed to create Purchase Order"
                },
                { status: springRes.status }
            );
        }

        const data = await springRes.json();

        // Returns the { ok: true, poNumber: "PO-..." } back to your frontend!
        return NextResponse.json(data);

    } catch (err) {
        console.error("Next.js BFF PO Creation Error:", err);
        return NextResponse.json(
            { ok: false, message: "Network Error: Could not reach the purchasing engine." },
            { status: 502 }
        );
    }
}