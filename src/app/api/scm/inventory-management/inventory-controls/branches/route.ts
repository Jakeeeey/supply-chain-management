import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/**
 * 🚀 GET: Fetch Branches from Directus
 * Bypasses Spring Boot to fetch all branches (including inactive).
 */
export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    // 🛑 401 if the user isn't logged in
    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const directusBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
    const directusToken = process.env.DIRECTUS_STATIC_TOKEN ?? "";
    const targetUrl = `${directusBaseUrl}/items/branches`;

    try {
        const directusRes = await fetch(targetUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${directusToken}`,
                "Content-Type": "application/json"
            },
            cache: "no-store",
        });

        if (!directusRes.ok) {
            console.error(`Directus Branch Fetch Failed: ${directusRes.status}`);
            return NextResponse.json([], { status: directusRes.status });
        }

        const json = await directusRes.json();
        // Return json.data to match the array format expected by the frontend
        return NextResponse.json(json.data || []);
    } catch (err) {
        console.error("BFF Directus Branch Route Error:", err);
        return NextResponse.json([], { status: 502 });
    }
}