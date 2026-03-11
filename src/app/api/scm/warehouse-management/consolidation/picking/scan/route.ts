import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

    const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");
    const targetUrl = `${springBaseUrl}/api/consolidators/picking/scan`;

    const body = await req.json();

    try {
        const springRes = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body),
            cache: "no-store",
        });

        // 🚀 THE FIX: If Spring Boot rejects it, extract and forward the message
        if (!springRes.ok) {
            let errorMessage = "Unknown backend error";
            try {
                // Try to parse the error message Spring Boot sent
                const errorData = await springRes.json();
                errorMessage = errorData.message || errorMessage;
            } catch (parseError) {
                // Fallback in case Spring Boot sends plain text instead of JSON
                console.error("Failed to parse Spring error JSON");
            }

            return NextResponse.json(
                { ok: false, message: errorMessage },
                { status: springRes.status }
            );
        }

        return NextResponse.json(await springRes.json());
    } catch (err) {
        return NextResponse.json({ ok: false, message: "BFF Network Error" }, { status: 502 });
    }
}