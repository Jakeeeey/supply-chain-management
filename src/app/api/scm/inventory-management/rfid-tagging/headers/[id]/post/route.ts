import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await context.params;
        const directusUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://goatedcodoer:8091").replace(/\/$/, "");
        const directusToken = process.env.DIRECTUS_STATIC_TOKEN || "";

        // Extract user id from token if possible
        let userId = null;
        try {
            const decoded: { id?: string; user_id?: string; userId?: string; sub?: string } = jwtDecode(token) as { id?: string; user_id?: string; userId?: string; sub?: string };
            userId = decoded.id ?? decoded.user_id ?? decoded.userId ?? decoded.sub ?? null;
        } catch (e) {
            console.error("Failed to decode token", e);
        }

        // Generate current timestamp in PHT (Asia/Manila) format: YYYY-MM-DDTHH:mm:ss
        const nowPHT = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        }).format(new Date()).replace(", ", "T");

        const now = nowPHT;

        const patchRes = await fetch(`${directusUrl}/items/registered_rfid_header/${id}`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${directusToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                posted_at: now,
                posted_by: userId
            }),
        });

        if (!patchRes.ok) {
            const errStr = await patchRes.text();
            console.error(`Directus post header failed: ${patchRes.status}`, errStr);
            return NextResponse.json({ ok: false, message: errStr }, { status: patchRes.status });
        }

        return NextResponse.json({ ok: true, posted_at: now, posted_by: userId });
    } catch (err) {
        console.error("Header POST Error:", err);
        return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 502 });
    }
}
