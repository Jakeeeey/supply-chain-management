import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

    const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");
    // 🚀 TARGET: The new manual picking endpoint
    const targetUrl = `${springBaseUrl}/api/consolidators/picking/manual`;

    try {
        const body = await req.json();

        const springRes = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body),
            cache: "no-store",
        });

        if (!springRes.ok) {
            let errorMessage = "Manual pick failed";
            try {
                const errorData = await springRes.json();
                errorMessage = errorData.message || errorMessage;
            } catch {
                console.error("Failed to parse Spring error JSON for manual pick");
            }

            return NextResponse.json(
                { ok: false, message: errorMessage },
                { status: springRes.status }
            );
        }

        const data = await springRes.json();
        return NextResponse.json({ ok: true, ...data });
    } catch {
        return NextResponse.json({ ok: false, message: "BFF Network Error" }, { status: 502 });
    }
}
