import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    // 👇 Print the token to the server console
    console.log("Access Token:", token);

    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");
    const targetUrl = `${springBaseUrl}/api/v1/dispatch-approvals/pending`;

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
            return NextResponse.json(
                { ok: false, message: "Failed to fetch pending dispatch plans from server" },
                { status: springRes.status }
            );
        }

        const data = await springRes.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ ok: false, message: "BFF Network Error" }, { status: 502 });
    }
}