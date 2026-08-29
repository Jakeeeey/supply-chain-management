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

        // 🚀 OVERRIDE AMOUNT USING DIRECTUS (As requested by User)
        const directusBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
        const staticToken = process.env.DIRECTUS_STATIC_TOKEN;
        try {
            const dUrl = `${directusBaseUrl}/items/post_dispatch_plan/${id}?fields=amount`;
            const dRes = await fetch(dUrl, {
                headers: { "Authorization": `Bearer ${staticToken || token}` }
            });
            if (dRes.ok) {
                const dData = await dRes.json();
                if (dData.data && dData.data.amount !== undefined) {
                    data.amount = dData.data.amount;
                }
            }
        } catch (e) {
            console.error("Failed to fetch amount from Directus", e);
        }

        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ ok: false, message: "BFF Network Error" }, { status: 502 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action !== "approve" && action !== "reject") {
        return NextResponse.json({ ok: false, message: "Invalid action" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

    const directusBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
    const targetUrl = `${directusBaseUrl}/items/post_dispatch_plan/${id}`;
    
    // Map the action to the exact ENUM values in Directus/MySQL
    const targetStatus = action === "approve" ? "For Dispatch" : "Reject";
    const staticToken = process.env.DIRECTUS_STATIC_TOKEN;

    try {
        const directusRes = await fetch(targetUrl, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${staticToken || token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status: targetStatus })
        });

        if (!directusRes.ok) {
            const errText = await directusRes.text().catch(() => "Unknown error");
            console.error(`Directus error for ${action}:`, directusRes.status, errText);
            return NextResponse.json(
                { ok: false, message: `Failed to ${action} dispatch plan in Directus. Response: ${errText}` },
                { status: directusRes.status }
            );
        }

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false, message: "BFF Network Error" }, { status: 502 });
    }
}