// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
    decodeJwtPayload,
    pickTokenFromPayload,
    COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    REFRESH_PATH,
    COOKIE_MAX_AGE_CAP,
    extractClientIp,
    resolveIpGeo,
    getCookieOptions,
    IS_SECURE_COOKIE
} from "@/modules/supply-chain-management/inventory-management/stock-adjustment/utils/auth-utils";

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

// --- In-memory lockout tracking ---
interface LockoutInfo {
    attempts: number;
    lockedUntil: number | null;
}
const lockoutMap = new Map<string, LockoutInfo>();


function getLockoutDuration(attempts: number): number {
    if (attempts >= 7) return 30 * 60 * 1000; // 30 minutes
    if (attempts === 6) return 10 * 60 * 1000; // 10 minutes
    if (attempts === 5) return 5 * 60 * 1000;  // 5 minutes
    return 0;
}

function normalizeLoginErrorMessage(status: number): string {
    if (status === 401) return "Credentials invalid.";
    if (status === 429 || status === 423) return "ACCOUNT_LOCKED";
    if (status >= 500) return "Server is down, please contact Administrator.";
    return `Login failed (HTTP ${status}).`;
}

async function throttle() {
    await new Promise((resolve) => setTimeout(resolve, 1500));
}

export async function POST(req: NextRequest) {
    const userAgent = req.headers.get("user-agent") || "unknown";

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
    const remember = Boolean(body?.remember);
    let latitude = typeof body?.latitude === "number" && Number.isFinite(body.latitude) ? body.latitude : null;
    let longitude = typeof body?.longitude === "number" && Number.isFinite(body.longitude) ? body.longitude : null;

    if (!email || !hashPassword) {
        return NextResponse.json(
            { ok: false, message: 'Both "email" and "hashPassword" are required.' },
            { status: 400 }
        );
    }

    // --- Check Lockout Status ---
    let lockout = lockoutMap.get(email);

    // If not in memory (e.g. server restart), check the Database directly
    if (!lockout || !lockout.lockedUntil || lockout.lockedUntil <= Date.now()) {
        try {
            const directusUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.DIRECTUS_API_URL || "";
            const staticToken = process.env.DIRECTUS_STATIC_TOKEN || "";

            if (directusUrl && staticToken) {
                const filter = encodeURIComponent(JSON.stringify({ user_email: { _eq: email } }));
                const dbRes = await fetch(`${directusUrl}/items/user?access_token=${staticToken}&filter=${filter}&limit=1`, {
                    cache: 'no-store'
                });

                if (dbRes.ok) {
                    const result = await dbRes.json();
                    const dbUser = result.data?.[0];

                    if (dbUser) {
                        // Check if blocked
                        const isBlockedRaw = dbUser.is_blocked;
                        const isBlocked = typeof isBlockedRaw === 'boolean' ? isBlockedRaw : !!isBlockedRaw;

                        if (isBlocked) {
                            return NextResponse.json({ ok: false, message: "ACCOUNT_BLOCKED" }, { status: 403 });
                        }

                        // Check if locked
                        if (dbUser.lock_until) {
                            const safeStr = dbUser.lock_until.replace(' ', 'T') + (dbUser.lock_until.endsWith('Z') ? '' : 'Z');
                            const lockUntilTs = new Date(safeStr).getTime();

                            if (lockUntilTs > Date.now()) {
                                lockout = {
                                    attempts: dbUser.failed_attempts || 5,
                                    lockedUntil: lockUntilTs
                                };
                                lockoutMap.set(email, lockout);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error("[auth/login] Database lockout check failed:", error);
            // Fallback: proceed to Spring API if DB check fails
        }
    }

    if (lockout?.lockedUntil && lockout.lockedUntil > Date.now()) {
        const remaining = lockout.lockedUntil - Date.now();
        return NextResponse.json({
            ok: false,
            message: "TOO_MANY_ATTEMPTS",
            lockedUntil: lockout.lockedUntil,
            lockDurationMs: Math.max(0, remaining)
        }, { status: 429 });
    }

    // IP Geolocation fallback
    if (latitude === null || longitude === null) {
        const clientIp = extractClientIp(req.headers);
        if (clientIp) {
            const geo = await resolveIpGeo(clientIp);
            if (geo) {
                latitude = geo.latitude;
                longitude = geo.longitude;
            }
        }
    }

    const loginUrl = `${baseUrl.replace(/\/$/, "")}/auth/login`;
    const springPayload = {
        email,
        hashPassword,
        rememberMe: remember,
        latitude: latitude ?? "",
        longitude: longitude ?? "",
    };

    let springRes: Response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    try {
        springRes = await fetch(loginUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "User-Agent": userAgent,
            },
            body: JSON.stringify(springPayload),
            signal: controller.signal,
            cache: "no-store",
        });
    } catch (err: unknown) {
        console.error("[auth/login] Upstream fetch error:", err);
        await throttle();
        return NextResponse.json(
            { ok: false, message: "Server is down, please contact Administrator." },
            { status: 502 }
        );
    } finally {
        clearTimeout(timeout);
    }

    const raw = await springRes.text();
    let data: Record<string, unknown> | string | null = null;
    try {
        data = raw ? JSON.parse(raw) : null;
    } catch {
        data = raw;
    }

    if (!springRes.ok) {
        // Narrow data to an object so property accesses are type-safe.
        // When JSON.parse fails, `data` is the raw string — treat it as an empty object.
        const d = (data !== null && typeof data === "object") ? data : {} as Record<string, unknown>;

        const m = String(d.message ?? "").toLowerCase();
        const backendAttempts =
            typeof d.attempts === "number" ? d.attempts :
                typeof d.failedAttempts === "number" ? d.failedAttempts :
                    typeof d.failed_attempts === "number" ? d.failed_attempts : null;

        // 1. Check for Blocked status from backend (15+ attempts)
        if (m.includes("blocked") || m.includes("account_blocked") || (backendAttempts !== null && backendAttempts >= 15)) {
            return NextResponse.json({
                ok: false,
                message: "ACCOUNT_BLOCKED"
            }, { status: 403 });
        }

        // 2. Check for Locked status from backend (5-14 attempts)
        if (m.includes("locked") || m.includes("account_locked") || d.lockUntil || d.lock_until || (backendAttempts !== null && backendAttempts >= 5)) {
            const duration = getLockoutDuration(backendAttempts ?? 5);
            const rawLockUntil = d.lockUntil || d.lock_until;

            let lockedUntilTs: number;
            if (rawLockUntil && typeof rawLockUntil === 'string') {
                // Ensure SQL datetime format "YYYY-MM-DD HH:MM:SS" is parsed correctly as UTC
                const safeDateString = rawLockUntil.replace(' ', 'T') + (rawLockUntil.endsWith('Z') ? '' : 'Z');
                const parsed = new Date(safeDateString).getTime();
                // If parsing failed (NaN), fallback to duration
                lockedUntilTs = !isNaN(parsed) ? parsed : (Date.now() + duration);
            } else {
                lockedUntilTs = Date.now() + duration;
            }

            // CRITICAL SAFETY: If the timestamp is in the past or too close to 'now',
            // force a minimum duration so the client doesn't see "00:00"
            const minBuffer = 5000; // 5 second grace
            if (lockedUntilTs <= (Date.now() + minBuffer)) {
                lockedUntilTs = Date.now() + Math.max(duration, 5 * 60 * 1000);
            }

            return NextResponse.json({
                ok: false,
                message: "ACCOUNT_LOCKED",
                lockedUntil: lockedUntilTs,
                lockUntilRaw: rawLockUntil,
                lockDurationMs: duration, // Send relative duration to prevent clock desync
                attempts: backendAttempts
            }, { status: 423 }); // 423 Locked
        }

        // 3. Handle standard failure with remaining attempts calculation
        let remainingToLock = null;
        let remainingToBlock = null;
        let msg = normalizeLoginErrorMessage(springRes.status);

        if (backendAttempts !== null) {
            remainingToBlock = Math.max(0, 15 - backendAttempts);

            if (backendAttempts < 5) {
                remainingToLock = 5 - backendAttempts;
            } else if (backendAttempts < 6) {
                // Just came back from 5m lock, next fail is 10m
                remainingToLock = 1;
                msg = "Incorrect email or password. 1 attempt remaining before a 10 minute temporary lockout.";
            } else if (backendAttempts < 7) {
                // Just came back from 10m lock, next fail is 30m
                remainingToLock = 1;
                msg = "Incorrect email or password. 1 attempt remaining before a 30 minute temporary lockout.";
            } else {
                remainingToLock = 0;
            }
        } else {
            // Fallback to local in-memory lockout tracking
            const current = lockoutMap.get(email) || { attempts: 0, lockedUntil: null };
            current.attempts += 1;
            if (current.attempts >= 5) {
                current.lockedUntil = Date.now() + getLockoutDuration(current.attempts);
            }
            lockoutMap.set(email, current);
            remainingToLock = Math.max(0, 5 - current.attempts);
        }

        await throttle();
        return NextResponse.json({
            ok: false,
            message: msg,
            remainingAttempts: remainingToLock, // For the "X attempts remaining" toast
            remainingUntilBlock: remainingToBlock,
            attempts: backendAttempts
        }, { status: springRes.status });
    }

    lockoutMap.delete(email);

    const dataObj = (data && typeof data === "object" && "data" in data)
        ? (data as Record<string, unknown>).data as Record<string, unknown> | string | null
        : data;
    const token = pickTokenFromPayload(dataObj);

    if (!token) {
        return NextResponse.json(
            { ok: false, message: "Login succeeded but no token was returned." },
            { status: 502 }
        );
    }

    // --- Handle Forced Password Reset ---
    if (token === "PASSWORD_RESET_REQUIRED") {
        return NextResponse.json({
            ok: false,
            message: "PASSWORD_RESET_REQUIRED"
        }, { status: 403 });
    }

    const backendExp =
        (data as Record<string, unknown>)?.rememberMeExpiration ??
        ((data as Record<string, unknown>)?.data as Record<string, unknown> | undefined)?.rememberMeExpiration;
    const cookieMaxAge = typeof backendExp === "number" ? backendExp : cookieMaxAgeFromJwt(token);

    const decoded = decodeJwtPayload(token);

    const res = NextResponse.json(
        {
            ok: true,
            user: {
                firstName: decoded?.FirstName || "",
                lastName: decoded?.LastName || "",
                email: decoded?.email || "",
                role: decoded?.role || ""
            }
        },
        { headers: { "Cache-Control": "no-store" } }
    );

    res.cookies.set({
        name: COOKIE_NAME,
        value: token,
        ...getCookieOptions(remember, "/")
    });

    // --- Handle Refresh Token from Backend ---
    const setCookies = springRes.headers.getSetCookie();
    const refreshCookieStr = setCookies.find(c => c.startsWith(`${REFRESH_COOKIE_NAME}=`));

    if (refreshCookieStr) {
        const value = refreshCookieStr.split(';')[0].split('=')[1];
        if (value) {
            res.cookies.set({
                name: REFRESH_COOKIE_NAME,
                value: value,
                ...getCookieOptions(remember, REFRESH_PATH)
            });
        }
    }

    if (latitude !== null && longitude !== null) {
        res.cookies.set({
            name: "user_latitude",
            value: String(latitude),
            httpOnly: true,
            sameSite: "lax",
            secure: IS_SECURE_COOKIE,
            path: "/",
            ...(remember ? { maxAge: cookieMaxAge } : {}),
        });
        res.cookies.set({
            name: "user_longitude",
            value: String(longitude),
            httpOnly: true,
            sameSite: "lax",
            secure: IS_SECURE_COOKIE,
            path: "/",
            ...(remember ? { maxAge: cookieMaxAge } : {}),
        });
    }

    return res;
}