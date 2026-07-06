import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/**
 * 🚀 GET: Check RFID Status from Directus
 * Proxies the request and attaches the 'DIRECTUS_STATIC_TOKEN' for authorization.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const rfid = searchParams.get("rfid");
    
    if (!rfid) {
        return NextResponse.json({ ok: false, message: "RFID is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const directusUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://goatedcodoer:8091").replace(/\/$/, "");
    const directusToken = process.env.DIRECTUS_STATIC_TOKEN || "";
    const springApiUrl = (process.env.SPRING_API_BASE_URL || "http://goatedcodoer:8091").replace(/\/$/, "");
    
    const urlOnHand = `${springApiUrl}/api/view-rfid-onhand?rfid=${encodeURIComponent(rfid)}`;
    const urlRegistered = `${directusUrl}/items/registered_rfid_list?filter[rfid][_eq]=${encodeURIComponent(rfid)}`;

    try {
        const [resOnHand, resRegistered] = await Promise.all([
            fetch(urlOnHand, {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` }, // Spring uses user token
                cache: "no-store",
            }),
            fetch(urlRegistered, {
                method: "GET",
                headers: { "Authorization": `Bearer ${directusToken}`, "Content-Type": "application/json" },
                cache: "no-store",
            })
        ]);

        if (!resOnHand.ok) {
            console.error("Spring Error OnHand:", resOnHand.status, await resOnHand.text());
            return NextResponse.json({ ok: false, exists: false, message: "Error checking inventory on hand" }, { status: 502 });
        }
        
        if (!resRegistered.ok) {
            console.error("Directus Error Registered:", resRegistered.status, await resRegistered.text());
            return NextResponse.json({ ok: false, exists: false, message: "Error checking registered_rfid_list" }, { status: 502 });
        }

        const dataOnHand = await resOnHand.json();
        const jsonRegistered = await resRegistered.json();
        
        const dataRegistered = jsonRegistered.data || [];

        // Spring API returns array or object if it exists
        const hasInventory = Array.isArray(dataOnHand) ? dataOnHand.length > 0 : (dataOnHand && typeof dataOnHand === 'object' && ('productId' in dataOnHand || 'id' in dataOnHand));
        
        if (hasInventory) {
            const locationName = Array.isArray(dataOnHand) && dataOnHand[0]?.branch_name ? dataOnHand[0].branch_name : "Inventory";
            return NextResponse.json({ exists: true, message: `RFID tag ${rfid} is already in use (exists in ${locationName}).` });
        }
        
        if (Array.isArray(dataRegistered) && dataRegistered.length > 0) {
            return NextResponse.json({ exists: true, message: `RFID tag ${rfid} has already been registered in a previous batch.` });
        }

        return NextResponse.json({ exists: false });
    } catch (err) {
        console.error("BFF Check RFID Route Error:", err);
        return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 502 });
    }
}
