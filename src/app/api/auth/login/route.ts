// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";
const COOKIE_MAX_AGE_CAP = 60 * 60 * 24 * 7; // 7 days cap

function pickToken(payload: Record<string, unknown> | null | string): string | null {
    if (!payload) return null;
    if (typeof payload === "string") return payload.trim() || null;
    const t = payload.token ?? payload.accessToken ?? payload.access_token ?? payload.jwt;
    return typeof t === "string" && t.trim() ? t.trim() : null;
}

// Base64URL decode for JWT header/payload (no verification)
function b64urlDecodeToJson(part: string): Record<string, unknown> | null {
    try {
        let s = part.replace(/-/g, "+").replace(/_/g, "/");
        // pad to multiple of 4
        while (s.length % 4) s += "=";
        const json = Buffer.from(s, "base64").toString("utf8");
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function cookieMaxAgeFromJwt(token: string): number {
    const parts = token.split(".");
    if (parts.length < 2) return COOKIE_MAX_AGE_CAP;

    const payload = b64urlDecodeToJson(parts[1]);
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

        return NextResponse.json({ ok: false, message: msg }, { status: springRes.status });
    }

    const token = pickToken(data as Record<string, unknown> | string | null);
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
        // use this for production
        // secure: process.env.NODE_ENV === "production",

        // for development only to allow cookies to work on http
        secure: false,
        path: "/",
        maxAge: cookieMaxAgeFromJwt(token),
    });

    return res;
}
