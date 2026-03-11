import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { consolidatorNo, checkerId } = body;

        if (!consolidatorNo || !checkerId) {
            return NextResponse.json({ message: "Missing parameters" }, { status: 400 });
        }

        const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");

        // 🚀 ALIGNED PATH: Matches your @RequestMapping + @PostMapping
        const targetUrl = `${springBaseUrl}/api/consolidators/delivery-picking/start`;

        console.log("BFF Proxying to:", targetUrl);

        const springRes = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ consolidatorNo, checkerId }),
            cache: "no-store",
        });

        if (!springRes.ok) {
            const errorText = await springRes.text();
            console.error(`Spring Error ${springRes.status}:`, errorText);
            return NextResponse.json({ message: "Failed to initialize picking" }, { status: springRes.status });
        }

        return NextResponse.json(await springRes.json());

    } catch (error) {
        console.error("BFF Start Picking Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}