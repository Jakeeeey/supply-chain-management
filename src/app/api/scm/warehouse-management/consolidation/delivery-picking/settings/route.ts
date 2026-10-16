import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token && !STATIC_TOKEN) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key") || "delivery_picking_printable_delivery_copy";

    try {
        const baseUrl = API_BASE_URL?.replace(/\/$/, "");
        if (!baseUrl) {
            return NextResponse.json({ value: "0", error: "Missing API_BASE_URL" }, { status: 500 });
        }

        // Directus query for setting_key
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...(STATIC_TOKEN
                ? { Authorization: `Bearer ${STATIC_TOKEN}` }
                : token
                ? { Authorization: `Bearer ${token}` }
                : {}),
        };

        // Query setting_key: delivery_picking_printable_delivery_copy (with fallback if needed)
        const filterKey = encodeURIComponent(key);
        const url = `${baseUrl}/items/general_setting?filter[setting_key][_in]=${filterKey},delivery_pickingt_printable_delivery_copy&limit=1`;

        const res = await fetch(url, {
            headers,
            cache: "no-store",
        });

        if (!res.ok) {
            console.error(`Directus settings fetch error: ${res.status}`);
            return NextResponse.json({ value: "0" });
        }

        const json = await res.json();
        const item = json.data?.[0];
        const value = item?.setting_value != null ? String(item.setting_value).trim() : "0";

        return NextResponse.json({ value });
    } catch (error) {
        console.error("Error fetching general_setting:", error);
        return NextResponse.json({ value: "0" }, { status: 500 });
    }
}
