import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;
    if (!token) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

    const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, "");
    const body = await req.json();

    try {
        const res = await fetch(`${springBaseUrl}/api/consolidators/repick-batch`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) return NextResponse.json({ ok: false }, { status: res.status });
        return NextResponse.json(await res.json());
    } catch (err) {
        return NextResponse.json({ ok: false }, { status: 502 });
    }
}