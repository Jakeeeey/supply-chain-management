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
        const { otp, sessionToken } = body;

        if (!otp || !sessionToken) {
            return NextResponse.json(
                { ok: false, message: "OTP and sessionToken are required." },
                { status: 400 }
            );
        }

        const backendUrl = `${baseUrl.replace(/\/$/, "")}/auth/${sessionToken}/verify-otp`;
        const response = await fetch(backendUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ otp }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return NextResponse.json({
                ok: false,
                message: data.message || "OTP verification failed."
            }, { status: response.status });
        }

        return NextResponse.json({
            ok: true,
            message: data.message || "OTP verified successfully",
            resetToken: data.resetToken
        });
    } catch (error) {
        console.error("[api/auth/verify-otp] Error:", error);
        return NextResponse.json({ ok: false, message: "Internal server error" }, { status: 500 });
    }
}
