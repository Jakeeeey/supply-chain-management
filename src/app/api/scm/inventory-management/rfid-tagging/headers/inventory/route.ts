import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get("branch_id");
        const productId = searchParams.get("product_id");

        if (!branchId || !productId) {
            return NextResponse.json({ running_inventory: 0 });
        }

        const springBaseUrl = (process.env.SPRING_API_BASE_URL || "http://goatedcodoer:8083").replace(/\/$/, "");
        
        const invRes = await fetch(`${springBaseUrl}/api/view-running-inventory-by-unit/all?branch_id=${branchId}`, {
            headers: { "Authorization": `Bearer ${token}` },
            cache: "no-store"
        });

        if (!invRes.ok) {
            return NextResponse.json({ running_inventory: 0 });
        }

        const invData = await invRes.json();
        const invItem = Array.isArray(invData) ? invData.find((item: Record<string, unknown>) => String(item.product_id) === productId || String(item.productId) === productId) : null;
        
        const availableUnits = invItem ? Number(invItem.running_inventory || invItem.runningInventory || 0) : 0;
        
        return NextResponse.json({ running_inventory: availableUnits });
    } catch (err) {
        console.error("Inventory Fetch Error:", err);
        return NextResponse.json({ running_inventory: 0 }, { status: 502 });
    }
}
