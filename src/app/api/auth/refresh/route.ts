import { NextRequest, NextResponse } from "next/server";
import {
    COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    REFRESH_PATH,
    decodeJwtPayload,
    pickTokenFromPayload,
    getCookieOptions
} from "@/lib/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const baseUrl = process.env.SPRING_API_BASE_URL;
    if (!baseUrl) {
        return NextResponse.json({ ok: false, message: "Server misconfigured." }, { status: 500 });
    }

    const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;

    if (!refreshToken) {
        return NextResponse.json({ ok: false, message: "No refresh token found." }, { status: 401 });
    }

    const refreshUrl = `${baseUrl.replace(/\/$/, "")}/auth/refresh`;

    try {
        const response = await fetch(refreshUrl, {
            method: "POST",
            headers: {
                "Cookie": `${REFRESH_COOKIE_NAME}=${refreshToken}`,
                "Accept": "application/json",
            },
            cache: "no-store",
        });

        if (!response.ok) {
            return NextResponse.json({ ok: false, message: "Refresh failed." }, { status: response.status });
        }

        const data = await response.json();
        const newToken = pickTokenFromPayload(data);

        if (!newToken) {
            return NextResponse.json({ ok: false, message: "No new access token returned." }, { status: 502 });
        }

        const decoded = decodeJwtPayload(newToken);
        const res = NextResponse.json({
            ok: true,
            user: {
                firstName: decoded?.FirstName || "",
                lastName: decoded?.LastName || "",
                email: decoded?.email || "",
                role: decoded?.role || ""
            }
        });

        // Update Access Token
        res.cookies.set({
            name: COOKIE_NAME,
            value: newToken,
            ...getCookieOptions(true, "/") // Default to persistent for refresh cycles
        });

        // Update Refresh Token if returned in Set-Cookie header
        const setCookies = response.headers.getSetCookie();
        const refreshCookieStr = setCookies.find(c => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
        if (refreshCookieStr) {
            const value = refreshCookieStr.split(';')[0].split('=')[1];
            if (value) {
                res.cookies.set({
                    name: REFRESH_COOKIE_NAME,
                    value: value,
                    ...getCookieOptions(true, REFRESH_PATH)
                });
            }
        }

        return res;
    } catch (error) {
        console.error("[auth/refresh] error:", error);
        return NextResponse.json({ ok: false, message: "Internal server error during refresh." }, { status: 500 });
    }
}
