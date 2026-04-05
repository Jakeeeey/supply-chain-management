import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(
    _: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Awaiting params for Next 15+
) {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

    const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");
    const targetUrl = `${springBaseUrl}/api/v1/dispatch-approvals/${id}`;

    try {
        const springRes = await fetch(targetUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            cache: "no-store",
        });

        if (!springRes.ok) throw new Error("Failed to fetch plan details");

        const data = await springRes.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ ok: false, message: "BFF Network Error" }, { status: 502 });
    }
}