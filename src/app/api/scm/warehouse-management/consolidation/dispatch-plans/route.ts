import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "Approved";
    const branchId = searchParams.get("branchId");

    const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");

    // 🚀 FIXED: Must match @RequestMapping("/api/dispatch") + @GetMapping("/plans")
    let targetUrl = `${springBaseUrl}/api/dispatch/plans?status=${status}`;

    if (branchId) {
        targetUrl += `&branchId=${branchId}`;
    }

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
            console.error(`Spring Error: ${springRes.status} at ${targetUrl}`);
            return NextResponse.json({ content: [] }, { status: springRes.status });
        }

        const data = await springRes.json();

        // 💡 Ensure the frontend always gets an array, even if Spring returns null
        return NextResponse.json(Array.isArray(data) ? data : (data.content || []));
    } catch (err) {
        console.error("BFF Fetch Error:", err);
        return NextResponse.json({ content: [] }, { status: 502 });
    }
}