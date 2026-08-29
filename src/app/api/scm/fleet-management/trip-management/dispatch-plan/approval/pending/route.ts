import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

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

        // 🚀 OVERRIDE AMOUNT USING DIRECTUS (As requested by User)
        const directusBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
        const staticToken = process.env.DIRECTUS_STATIC_TOKEN;
        
        try {
            const planIds = data.map((p: any) => p.id);
            if (planIds.length > 0) {
                const dUrl = `${directusBaseUrl}/items/post_dispatch_plan?filter[id][_in]=${planIds.join(",")}&fields=id,amount`;
                const dRes = await fetch(dUrl, {
                    headers: { "Authorization": `Bearer ${staticToken || token}` }
                });
                
                if (dRes.ok) {
                    const dData = await dRes.json();
                    const directusAmounts = dData.data.reduce((acc: any, item: any) => {
                        acc[item.id] = item.amount;
                        return acc;
                    }, {});

                    data.forEach((plan: any) => {
                        if (directusAmounts[plan.id] !== undefined) {
                            plan.amount = directusAmounts[plan.id];
                        }
                    });
                }
            }
        } catch (e) {
            console.error("Failed to fetch amounts from Directus", e);
        }

        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ ok: false, message: "BFF Network Error" }, { status: 502 });
    }
}