import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    // 🛑 401 if the user isn't logged in
    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    // Grab the optional 'type' parameter from the frontend request (e.g., ?type=Non-Trade)
    const typeParam = req.nextUrl.searchParams.get("type");
    const queryString = typeParam ? `?type=${encodeURIComponent(typeParam)}` : "";

    const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");

    // Point this to your Spring Boot Controller (it defaults to Trade on the backend)
    const targetUrl = `${springBaseUrl}/api/suppliers${queryString}`;

    try {
        const springRes = await fetch(targetUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            cache: "no-store",
        });

        if (!springRes.ok) {
            console.error(`Spring Boot Suppliers Fetch Failed: ${springRes.status}`);
            return NextResponse.json([], { status: springRes.status });
        }

        const data = await springRes.json();

        // 🚀 No more frontend mapping/filtering! Spring Boot does the heavy lifting now.
        // We just pass the clean DTO array directly to the UI.
        return NextResponse.json(data);

    } catch (err) {
        console.error("BFF Suppliers Route Error:", err);
        return NextResponse.json([], { status: 502 });
    }
}