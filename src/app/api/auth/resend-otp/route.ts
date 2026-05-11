import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const baseUrl = process.env.SPRING_API_BASE_URL;
    if (!baseUrl) {
        return NextResponse.json(
            { ok: false, message: "Server misconfigured." },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();
        const { sessionToken } = body;

        if (!sessionToken) {
            return NextResponse.json(
                { ok: false, message: "sessionToken is required." },
                { status: 400 }
            );
        }

        const backendUrl = `${baseUrl.replace(/\/$/, "")}/auth/${sessionToken}/resend-otp`;
        const response = await fetch(backendUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return NextResponse.json({
                ok: false,
                message: data.message || "Failed to resend OTP."
            }, { status: response.status });
        }

        return NextResponse.json({
            ok: true,
            message: data.message || "OTP resent successfully",
            sessionToken: data.sessionToken
        });
    } catch (error) {
        console.error("[api/auth/resend-otp] Error:", error);
        return NextResponse.json({ ok: false, message: "Internal server error" }, { status: 500 });
    }
}
