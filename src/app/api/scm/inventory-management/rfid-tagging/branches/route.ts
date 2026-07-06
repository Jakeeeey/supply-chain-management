import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const directusUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://goatedcodoer:8091").replace(/\/$/, "");
        const targetUrl = `${directusUrl}/items/branches?fields=id,branch_name,branch_code&sort=branch_name&limit=-1`;
        const directusToken = process.env.DIRECTUS_STATIC_TOKEN || "";

        const res = await fetch(targetUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${directusToken}`,
                "Content-Type": "application/json"
            },
            cache: "no-store",
        });

        if (!res.ok) {
            return NextResponse.json([], { status: res.status });
        }

        const json = await res.json();
        return NextResponse.json(json.data || []);
    } catch (err) {
        console.error("Branches Route Error:", err);
        return NextResponse.json([], { status: 502 });
    }
}
