import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    // 1. Grab the token from the user's browser cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    // 2. If no token, block it immediately at the BFF layer
    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized: No token found" }, { status: 401 });
    }

    const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");

    // 3. 🚀 Point this to your Spring Boot Controller's endpoint
    const targetUrl = `${springBaseUrl}/api/consolidators/create-from-dispatches`;

    try {
        const body = await req.json();

        // 4. Forward the request WITH the Authorization header
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
            let errorMessage = "Failed to create batch";
            try {
                const errorData = await springRes.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {}
            return NextResponse.json({ ok: false, message: errorMessage }, { status: springRes.status });
        }

        return NextResponse.json(await springRes.json());
    } catch (err) {
        return NextResponse.json({ ok: false, message: "BFF Network Error" }, { status: 502 });
    }
}