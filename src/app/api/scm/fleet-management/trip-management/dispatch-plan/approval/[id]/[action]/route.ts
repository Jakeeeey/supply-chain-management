import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string, action: string }> }
) {
    const { id, action } = await params;

    // Security check: only allow approve or reject
    if (action !== "approve" && action !== "reject") {
        return NextResponse.json({ ok: false, message: "Invalid action" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

    const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");
    const targetUrl = `${springBaseUrl}/api/v1/dispatch-approvals/${id}/${action}`;

    try {
        const springRes = await fetch(targetUrl, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!springRes.ok) {
            return NextResponse.json(
                { ok: false, message: `Failed to ${action} dispatch plan` },
                { status: springRes.status }
            );
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ ok: false, message: "BFF Network Error" }, { status: 502 });
    }
}