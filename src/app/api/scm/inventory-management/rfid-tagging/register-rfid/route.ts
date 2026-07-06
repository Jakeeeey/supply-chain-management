import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/**
 * 🚀 POST: Register RFIDs via Spring Boot
 * Proxies the request and attaches the 'vos_access_token' for authorization.
 */
export async function POST(request: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();

        const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");
        const targetUrl = `${springBaseUrl}/api/registered-rfid`;

        const springRes = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body),
        });

        if (!springRes.ok) {
            console.error(`Spring Boot Register RFID Failed: ${springRes.status}`);
            return NextResponse.json({ ok: false, message: "Failed to register RFIDs" }, { status: springRes.status });
        }

        const data = await springRes.json();
        return NextResponse.json(data);
    } catch (err) {
        console.error("BFF Register RFID Route Error:", err);
        return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 502 });
    }
}
