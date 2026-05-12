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
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { ok: false, message: "Email is required." },
                { status: 400 }
            );
        }

        const backendUrl = `${baseUrl.replace(/\/$/, "")}/auth/forgot-password`;
        const response = await fetch(backendUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return NextResponse.json({
                ok: false,
                message: data.message || "Failed to send OTP."
            }, { status: response.status });
        }

        return NextResponse.json({
            ok: true,
            message: data.message || "OTP sent to your email",
            sessionToken: data.sessionToken
        });
    } catch (error) {
        console.error("[api/auth/forgot-password] Error:", error);
        return NextResponse.json({ ok: false, message: "Internal server error" }, { status: 500 });
    }
}
