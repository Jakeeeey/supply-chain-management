import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const { search } = req.nextUrl;
    const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");
    const targetUrl = `${springBaseUrl}/api/planning/load-stream${search}`;

    try {
        const springRes = await fetch(targetUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
            cache: "no-store",
        });

        if (!springRes.ok || !springRes.body) {
            console.error(`Spring Boot Planning Stream Failed: ${springRes.status}`);
            const errorText = await springRes.text().catch(() => "Unknown error");
            return NextResponse.json(
                { ok: false, message: "Failed to load planning stream", details: errorText },
                { status: springRes.status }
            );
        }

        // Pipe the Spring Boot event stream directly back to the React client
        return new Response(springRes.body, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
            },
        });
    } catch (err) {
        console.error("BFF Planning Stream Proxy Error:", err);
        return NextResponse.json(
            { ok: false, message: "BFF Network Error connecting to planning stream" },
            { status: 502 }
        );
    }
}
