// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { decodeJwtPayload, pickTokenFromPayload, COOKIE_NAME, COOKIE_MAX_AGE_CAP } from "@/lib/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";



function cookieMaxAgeFromJwt(token: string): number {
    const payload = decodeJwtPayload(token);
    const exp = Number(payload?.exp); // exp is usually seconds since epoch
    const now = Math.floor(Date.now() / 1000);

    if (Number.isFinite(exp) && exp > now + 5) {
        const delta = exp - now;
        return Math.max(60, Math.min(delta, COOKIE_MAX_AGE_CAP)); // at least 60s
    }

    return COOKIE_MAX_AGE_CAP;
}

function normalizeLoginErrorMessage(status: number): string {
    if (status === 401) return "Credentials invalid.";
    if (status >= 500) return "Server is down, please contact Administrator.";
    return `Login failed (HTTP ${status}).`;
}

/**
 * Artificial delay to thwart brute-force attempts.
 */
async function throttle() {
    await new Promise((resolve) => setTimeout(resolve, 1500));
}

export async function POST(req: NextRequest) {
    const baseUrl = process.env.SPRING_API_BASE_URL;
    if (!baseUrl) {
        return NextResponse.json(
            { ok: false, message: "Server misconfigured." },
            { status: 500 }
        );
    }

    const body = await req.json().catch(() => null);

    const email = String(body?.email ?? "").trim();
    const hashPassword = String(body?.hashPassword ?? body?.password ?? "").trim();

    if (!email || !hashPassword) {
        return NextResponse.json(
            { ok: false, message: 'Both "email" and "hashPassword" are required.' },
            { status: 400 }
        );
    }

    const loginUrl = `${baseUrl.replace(/\/$/, "")}/auth/login`;
    const springPayload = { email, hashPassword };

    let springRes: Response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    try {
        springRes = await fetch(loginUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(springPayload),
            signal: controller.signal,
            cache: "no-store",
        });
    } catch (err: unknown) {
        const errorInfo = err as { cause?: { code?: string; message?: string }; code?: string; message?: string };
        // ✅ Log details server-side only
        console.error("[auth/login] Upstream fetch error:", {
            code: errorInfo?.cause?.code || errorInfo?.code,
            message: errorInfo?.cause?.message || errorInfo?.message,
        });

        // ✅ Return generic message to client (no internal URL/IP)
        await throttle();
        return NextResponse.json(
            { ok: false, message: "Server is down, please contact Administrator." },
            { status: 502 }
        );
    } finally {
        clearTimeout(timeout);
    }

    const raw = await springRes.text();
    let data: unknown = null;
    try {
        data = raw ? JSON.parse(raw) : null;
    } catch {
        data = raw;
    }

    if (!springRes.ok) {
        const msg = normalizeLoginErrorMessage(springRes.status);

        // ✅ Avoid logging raw `data` to prevent accidental token leakage
        console.error("[auth/login] Upstream non-OK:", {
            status: springRes.status,
        });

        await throttle();
        return NextResponse.json({ ok: false, message: msg }, { status: springRes.status });
    }

    const token = pickTokenFromPayload(data as Record<string, unknown> | string | null);
    if (!token) {
        console.error("[auth/login] Login OK but no token returned by upstream.");
        return NextResponse.json(
            { ok: false, message: "Login succeeded but no token was returned." },
            { status: 502 }
        );
    }

    const res = NextResponse.json(
        { ok: true },
        { headers: { "Cache-Control": "no-store" } }
    );

    res.cookies.set({
        name: COOKIE_NAME,
        value: token,
        httpOnly: true,
        sameSite: "lax",
        // secure: process.env.NODE_ENV === "production",

        // for development only to allow cookies to work on http
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: cookieMaxAgeFromJwt(token),
    });

    return res;
}
