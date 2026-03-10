import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ consolidatorNo: string }> } // 🚀 Change to Promise
) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    // 🚀 CRITICAL: Await the params object
    const resolvedParams = await params;
    const consolidatorNo = resolvedParams.consolidatorNo;

    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    try {
        const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");

        // 🎯 Path matches your @GetMapping("/delivery-picking/manifest/{consolidatorNo}")
        const targetUrl = `${springBaseUrl}/api/consolidators/delivery-picking/manifest/${consolidatorNo}`;

        console.log("BFF Fetching Manifest from:", targetUrl);

        const springRes = await fetch(targetUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            cache: "no-store",
        });

        if (!springRes.ok) {
            console.error(`Spring Manifest Error ${springRes.status}`);
            return NextResponse.json({ message: "Manifest data not found" }, { status: springRes.status });
        }

        const data = await springRes.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("BFF Manifest Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}