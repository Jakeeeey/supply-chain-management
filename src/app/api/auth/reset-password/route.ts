import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
        return NextResponse.json({ ok: false, message: "Token is required" }, { status: 400 });
    }

    try {
        const body = await req.json();
        const baseUrl = process.env.SPRING_API_BASE_URL;
        
        if (!baseUrl) {
            console.error("[api/auth/reset-password] SPRING_API_BASE_URL is not defined in env");
            return NextResponse.json({ ok: false, message: "Server configuration error" }, { status: 500 });
        }
        
        // Construct the backend URL with the token
        const backendUrl = `${baseUrl.replace(/\/$/, "")}/auth/reset-password?token=${token}`;

        const response = await fetch(backendUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json({ 
                ok: false, 
                message: errorData.message || "Failed to reset password" 
            }, { status: response.status });
        }

        return NextResponse.json({ ok: true, message: "Password reset successful" });
    } catch (error) {
        console.error("[api/auth/reset-password] Error:", error);
        return NextResponse.json({ ok: false, message: "Internal server error" }, { status: 500 });
    }
}
