// src/middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { decodeJwtPayload, COOKIE_NAME, REFRESH_COOKIE_NAME, pickTokenFromPayload, IS_SECURE_COOKIE } from "@/lib/auth-utils"

const PUBLIC_FILE = /\.(.*)$/
const BASELINE_PREFIXES = ["/main-dashboard"]

// Edge Memory Cache — Subsystem Prefixes
let CACHED_PREFIXES: string[] = [...BASELINE_PREFIXES]
let LAST_FETCH_TIME = 0
const CACHE_TTL = process.env.NODE_ENV === "development" ? 60000 : 300000 // 5 minutes in production

// Edge Memory Cache — Subscription Lock
let CACHED_COMPANY_TIER: number | null = null
let COMPANY_TIER_FETCH_TIME = 0

interface ModuleSubscriptionInfo {
    base_path: string;
    subscription: number | null;
}

interface DirectusModuleSubscriptionRow {
    base_path?: string | null;
    subscription?: number | null;
}

let CACHED_MODULES_INFO: ModuleSubscriptionInfo[] = []
let MODULES_INFO_FETCH_TIME = 0

const SUBSCRIPTION_TIER_CACHE: Record<number, number | null> = {}
let SUBSCRIPTION_TIER_CACHE_TIME = 0

interface UserPermissionsCache {
    bypassModuleAuthorization: boolean;
    authorizedSubsystemPaths: string[];
    authorizedModulePaths: string[];
    allModulePaths: string[];
}

const USER_PERMISSIONS_CACHE = new Map<string, UserPermissionsCache>();
const MAX_CACHE_SIZE = 500;


function normalizeLockedModuleMode(value?: string | null) {
    const mode = value?.trim().toLowerCase()
    if (mode === "enable" || mode === "enabled") return "enable"
    if (mode === "hide") return "hide"
    if (mode === "disabled") return "disabled"
    return "disabled"
}

async function getDynamicProtectedPrefixes() {
    const now = Date.now()

    // Check if cache is fresh
    if (LAST_FETCH_TIME > 0 && (now - LAST_FETCH_TIME) < CACHE_TTL) {
        return CACHED_PREFIXES
    }

    const directusBase = process.env.NEXT_PUBLIC_API_BASE_URL
    const directusToken = process.env.DIRECTUS_STATIC_TOKEN

    if (!directusBase || !directusToken) {
        return CACHED_PREFIXES // Fallback to baseline if config is missing
    }

    try {
        const filter = encodeURIComponent(JSON.stringify({ status: { _eq: "active" } }))
        const url = `${directusBase.replace(/\/$/, "")}/items/subsystems?fields=base_path&filter=${filter}&limit=-1`

        const res = await fetch(url, {
            headers: { "Authorization": `Bearer ${directusToken}` },
            cache: 'no-store'
        })

        if (!res.ok) throw new Error("Directus Registry")

        const { data } = await res.json()
        const dynamicPaths = (data || [])
            .map((s: { base_path?: string }) => s.base_path?.trim())
            .filter(Boolean) as string[]

        // Merge baseline with dynamic paths and deduplicate
        const merged = Array.from(new Set([...BASELINE_PREFIXES, ...dynamicPaths]))

        CACHED_PREFIXES = merged
        LAST_FETCH_TIME = now

        return CACHED_PREFIXES
    } catch (error) {
        console.error("[Middleware] Registry Fetch Failed:", error)

        // Fail-Fast: If we have no cache at all (beyond baseline), we redirect to error
        if (CACHED_PREFIXES.length <= BASELINE_PREFIXES.length) {
            throw error
        }

        // Otherwise, use stale cache (Graceful Degradation)
        return CACHED_PREFIXES
    }
}

function isProtectedPath(pathname: string, prefixes: string[]) {
    return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * Fetches the company's subscription tier (company_id = 1, always).
 * Results are cached in edge memory for CACHE_TTL ms.
 */
async function getCompanyTier(): Promise<number | null> {
    const now = Date.now()
    if (CACHED_COMPANY_TIER !== null && (now - COMPANY_TIER_FETCH_TIME) < CACHE_TTL) {
        return CACHED_COMPANY_TIER
    }
    const directusBase = process.env.NEXT_PUBLIC_API_BASE_URL
    const directusToken = process.env.DIRECTUS_STATIC_TOKEN
    if (!directusBase || !directusToken) return null
    try {
        const compFilter = encodeURIComponent(JSON.stringify({ company_id: { _eq: 1 } }))
        const compRes = await fetch(
            `${directusBase.replace(/\/+$/, "")}/items/company?filter=${compFilter}&fields=company_subscription&limit=1`,
            { headers: { Authorization: `Bearer ${directusToken}` }, cache: "no-store" }
        )
        if (!compRes.ok) return null
        const compJson = await compRes.json()
        const subscriptionId: number | null = compJson.data?.[0]?.company_subscription ?? null
        if (!subscriptionId) return null

        const subFilter = encodeURIComponent(JSON.stringify({ id: { _eq: subscriptionId } }))
        const subRes = await fetch(
            `${directusBase.replace(/\/+$/, "")}/items/subscription?filter=${subFilter}&fields=tier&limit=1`,
            { headers: { Authorization: `Bearer ${directusToken}` }, cache: "no-store" }
        )
        if (!subRes.ok) return null
        const subJson = await subRes.json()
        const tier: number | null = subJson.data?.[0]?.tier ?? null

        CACHED_COMPANY_TIER = tier
        COMPANY_TIER_FETCH_TIME = now
        return tier
    } catch {
        return null
    }
}

async function getAllModulesInfo(): Promise<ModuleSubscriptionInfo[]> {
    const now = Date.now()
    if (CACHED_MODULES_INFO.length > 0 && (now - MODULES_INFO_FETCH_TIME) < CACHE_TTL) {
        return CACHED_MODULES_INFO
    }

    const directusBase = process.env.NEXT_PUBLIC_API_BASE_URL
    const directusToken = process.env.DIRECTUS_STATIC_TOKEN
    if (!directusBase || !directusToken) return []

    try {
        const url = `${directusBase.replace(/\/+$/, "")}/items/modules?fields=base_path,subscription&limit=-1`
        const res = await fetch(url, {
            headers: { "Authorization": `Bearer ${directusToken}` },
            cache: 'no-store'
        })
        if (!res.ok) return []
        const { data } = await res.json()
        const mapped = ((data || []) as DirectusModuleSubscriptionRow[]).map((m) => ({
            base_path: m.base_path?.trim() || "",
            subscription: m.subscription ?? null
        })).filter((m) => m.base_path)

        CACHED_MODULES_INFO = mapped
        MODULES_INFO_FETCH_TIME = now
        return CACHED_MODULES_INFO
    } catch (err) {
        console.error("[Middleware] Fetch modules info failed:", err)
        return CACHED_MODULES_INFO
    }
}

async function getSubscriptionTier(subscriptionId: number): Promise<number | null> {
    const now = Date.now()
    if ((now - SUBSCRIPTION_TIER_CACHE_TIME) < CACHE_TTL && subscriptionId in SUBSCRIPTION_TIER_CACHE) {
        return SUBSCRIPTION_TIER_CACHE[subscriptionId]
    }

    const directusBase = process.env.NEXT_PUBLIC_API_BASE_URL
    const directusToken = process.env.DIRECTUS_STATIC_TOKEN
    if (!directusBase || !directusToken) return null

    try {
        const subFilter = encodeURIComponent(JSON.stringify({ id: { _eq: subscriptionId } }))
        const subRes = await fetch(
            `${directusBase.replace(/\/+$/, "")}/items/subscription?filter=${subFilter}&fields=tier&limit=1`,
            { headers: { Authorization: `Bearer ${directusToken}` }, cache: "no-store" }
        )
        if (!subRes.ok) return null
        const subJson = await subRes.json()
        const tier: number | null = subJson.data?.[0]?.tier ?? null

        SUBSCRIPTION_TIER_CACHE[subscriptionId] = tier
        SUBSCRIPTION_TIER_CACHE_TIME = now
        return tier
    } catch {
        return null
    }
}

async function getModuleTierForPath(pathname: string): Promise<number | null> {
    const modulesInfo = await getAllModulesInfo()
    const cleanPath = pathname.replace(/\/$/, "")

    const sortedModules = [...modulesInfo].sort((a, b) => b.base_path.length - a.base_path.length)
    const matchedModule = sortedModules.find(m => {
        const base = m.base_path.replace(/\/$/, "")
        return cleanPath === base || cleanPath.startsWith(base + "/")
    })

    if (!matchedModule || !matchedModule.subscription) {
        return null
    }

    return getSubscriptionTier(matchedModule.subscription)
}

async function isSubscriptionLocked(pathname: string): Promise<boolean> {
    const lockMode = normalizeLockedModuleMode(process.env.NEXT_PUBLIC_LOCKED_MODULE_MODE)

    try {
        const cleanPathname = pathname.replace(/\/$/, "")
        const [companyTier, moduleTier] = await Promise.all([
            getCompanyTier(),
            getModuleTierForPath(cleanPathname),
        ])

        if (process.env.NODE_ENV === 'development') {
            console.log(`[SubscriptionLock] Path: ${cleanPathname} | Company Tier: ${companyTier} | Module Tier: ${moduleTier} | Lock Mode: ${lockMode}`)
        }

        if (
            companyTier !== null &&
            moduleTier !== null &&
            moduleTier > companyTier
        ) {
            return true
        }
    } catch (err) {
        console.error("[Middleware] Subscription lock check failed:", err)
    }
    return false
}

function applyCommonCookies(response: NextResponse, req: NextRequest, token: string) {
    const currentToken = req.cookies.get(COOKIE_NAME)?.value;
    if (token && token !== currentToken) {
        response.cookies.set({
            name: COOKIE_NAME,
            value: token,
            httpOnly: true,
            sameSite: "lax",
            secure: IS_SECURE_COOKIE,
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        });
    }

    // Last visited path tracking removed
}

export async function middleware(req: NextRequest) {
    if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
        return NextResponse.next()
    }

    const { pathname } = req.nextUrl

    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon.ico") ||
        pathname.startsWith("/robots.txt") ||
        pathname.startsWith("/sitemap.xml") ||
        PUBLIC_FILE.test(pathname)
    ) {
        return NextResponse.next()
    }

    if (
        pathname === "/" ||
        pathname === "/login" ||
        pathname.startsWith("/api/auth/login") ||
        pathname.startsWith("/api/auth/logout") ||
        pathname.startsWith("/api/auth/forgot-password") ||
        pathname.startsWith("/api/auth/verify-otp") ||
        pathname.startsWith("/api/auth/resend-otp") ||
        pathname.startsWith("/api/auth/reset-password") ||
        pathname.startsWith("/api/activity-logs") ||
        pathname.startsWith("/error/service-down") ||
        pathname.startsWith("/forgot-password") ||
        pathname.startsWith("/reset-password")
    ) {
        if (pathname.startsWith("/api/auth/logout")) {
            const token = req.cookies.get(COOKIE_NAME)?.value;
            if (token) {
                USER_PERMISSIONS_CACHE.delete(token);
            }
        }

        // If the user is already logged in (with a VALID token) and tries to go to root / or /login, take them to their last visited subsystem
        if (pathname === "/" || pathname === "/login") {
            const token = req.cookies.get(COOKIE_NAME)?.value;
            let isValid = false;
            
            if (token) {
                const payload = decodeJwtPayload(token);
                if (payload && payload.exp) {
                    const now = Math.floor(Date.now() / 1000);
                    if (payload.exp > now + 10) {
                        isValid = true;
                    }
                }
            }

            if (isValid) {
                return NextResponse.redirect(new URL("/main-dashboard", req.url));
            } else if (token) {
                 // If token exists but is invalid/expired, we should let them stay on /login
                 // (We don't need to clear it here, the login process or subsequent requests will overwrite it)
            }
        }
        return NextResponse.next()
    }

    let prefixes: string[] = []
    try {
        prefixes = await getDynamicProtectedPrefixes()
    } catch {
        // Fatal initialization error (API Down + No Cache)
        const url = req.nextUrl.clone()
        url.pathname = "/error/service-down"
        url.searchParams.set("service", "Directus Registry")
        return NextResponse.redirect(url)
    }

    if (!isProtectedPath(pathname, prefixes)) {
        return NextResponse.next()
    }

    const requestHeaders = new Headers(req.headers);
    const currentToken = req.cookies.get(COOKIE_NAME)?.value;
    let token = currentToken;

    // --- Validate Token Expiration ---
    if (token) {
        const payload = decodeJwtPayload(token);
        if (payload && payload.exp) {
            const now = Math.floor(Date.now() / 1000);
            // If expired or expiring within 10 seconds, treat as expired to trigger refresh
            if (payload.exp <= now + 10) {
            if (process.env.NODE_ENV === 'development') {
                console.log("[Middleware] Access token is expired or expiring soon. Forcing refresh...");
            }
                token = undefined;
            }
        } else {
            if (process.env.NODE_ENV === 'development') {
                console.log("[Middleware] Access token payload is invalid. Forcing refresh...");
            }
            token = undefined;
        }
    }

    // --- Automatic Session Refresh ---
    if (!token) {
        const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
        const springBase = process.env.SPRING_API_BASE_URL;

        if (refreshToken && springBase) {
            try {
                if (process.env.NODE_ENV === 'development') {
                    console.log("[Middleware] Access token missing or expired, attempting refresh...");
                }
                const refreshUrl = `${springBase.replace(/\/$/, "")}/auth/refresh`;

                const refreshRes = await fetch(refreshUrl, {
                    method: "POST",
                    headers: {
                        "Cookie": `${REFRESH_COOKIE_NAME}=${refreshToken}`,
                        "Accept": "application/json",
                    },
                    cache: "no-store",
                });
                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    const newToken = pickTokenFromPayload(data);

                    if (newToken) {
                        if (process.env.NODE_ENV === 'development') {
                            console.log("[Middleware] Refresh successful.");
                        }
                        if (currentToken) {
                            USER_PERMISSIONS_CACHE.delete(currentToken);
                        }
                        token = newToken;

                        // Propagate new token to downstream request headers
                        requestHeaders.set("Authorization", `Bearer ${newToken}`);
                        const cookieHeader = req.headers.get("cookie") || "";
                        let updatedCookieHeader = cookieHeader;
                        const cookiePattern = new RegExp(`(${COOKIE_NAME}=)[^;]*`);

                        if (cookiePattern.test(cookieHeader)) {
                            updatedCookieHeader = cookieHeader.replace(cookiePattern, `$1${newToken}`);
                        } else {
                            updatedCookieHeader = cookieHeader 
                                ? `${cookieHeader}; ${COOKIE_NAME}=${newToken}` 
                                : `${COOKIE_NAME}=${newToken}`;
                        }
                        requestHeaders.set("cookie", updatedCookieHeader);
                    } else {
                        // Backend returned 200 but no usable token in response body.
                        // Clear the stale expired cookie immediately and redirect to login
                        // to prevent an infinite refresh loop on the next request.
                        console.error("[Middleware] Refresh returned 200 but no valid token was found in the response. Clearing session.");
                        const loginUrl = req.nextUrl.clone();
                        loginUrl.pathname = "/login";
                        loginUrl.searchParams.set("next", pathname);
                        const clearResponse = NextResponse.redirect(loginUrl);
                        clearResponse.cookies.delete(COOKIE_NAME);
                        clearResponse.cookies.delete(REFRESH_COOKIE_NAME);
                        return clearResponse;
                    }
                } else if (refreshRes.status >= 500) {
                    console.error(`[Middleware] Spring Boot returned ${refreshRes.status} during refresh.`);
                    const url = req.nextUrl.clone();
                    url.pathname = "/error/service-down";
                    url.searchParams.set("service", `Spring Boot (Refresh Status ${refreshRes.status})`);
                    return NextResponse.redirect(url);
                } else {
                    // Refresh token is expired or invalid (401, 403, etc.).
                    // Clear both cookies immediately so the middleware won't keep retrying
                    // on the next request and cause an infinite redirect loop.
                    console.warn(`[Middleware] Refresh token rejected by backend (status ${refreshRes.status}). Clearing session and redirecting to login.`);
                    const loginUrl = req.nextUrl.clone();
                    loginUrl.pathname = "/login";
                    loginUrl.searchParams.set("next", pathname);
                    const clearResponse = NextResponse.redirect(loginUrl);
                    clearResponse.cookies.delete(COOKIE_NAME);
                    clearResponse.cookies.delete(REFRESH_COOKIE_NAME);
                    return clearResponse;
                }
            } catch (err) {
                console.error("[Middleware] Refresh failed (Server Outage):", err);
                const url = req.nextUrl.clone();
                url.pathname = "/error/service-down";
                url.searchParams.set("service", "Spring Boot (Session Refresh)");
                return NextResponse.redirect(url);
            }
        }
    }

    if (!token) {
        const url = req.nextUrl.clone()
        url.pathname = "/login"
        url.searchParams.set("next", pathname)
        const redirectResponse = NextResponse.redirect(url)
        // Ensure the stale access token is cleared so it doesn't cause loops
        redirectResponse.cookies.delete(COOKIE_NAME)
        return redirectResponse
    }
    const payload = decodeJwtPayload(token);

    // Map path to subsystem ID and specific module slug (e.g. /hrm -> hrm)
    const subsystemMatch = prefixes.find((p) => pathname.startsWith(p));

    if (subsystemMatch) {
        const subsystemId = subsystemMatch.replace("/", "");
        let bypassModuleAuthorization = false;

        // Dashboard is always allowed if logged in
        if (subsystemId === "main-dashboard") {
            requestHeaders.delete("x-locked-module");
            const response = NextResponse.next({
                request: {
                    headers: requestHeaders,
                }
            });
            response.cookies.delete("x-locked-module");
            applyCommonCookies(response, req, token);
            return response;
        }

        // --- 1. Subsystem Level Check (Short-Circuit via JWT) ---
        const userSubsystems = (payload?.subsystems as string[]) || [];
        const isUserAdmin = payload?.role === "ADMIN";

        if (!isUserAdmin && !userSubsystems.includes(subsystemId)) {
            console.warn(`[Middleware] Subsystem Blocked (JWT): User ${payload?.email} -> ${subsystemId}`);
            const url = req.nextUrl.clone();
            url.pathname = "/main-dashboard";
            url.searchParams.set("error", "unauthorized_subsystem");
            return NextResponse.redirect(url);
        }

        let authorizedSubsystemPaths: string[] = [];
        let authorizedModulePaths: string[] = [];
        let allModulePaths: string[] = [];

        const directusBase = process.env.NEXT_PUBLIC_API_BASE_URL;
        const directusToken = process.env.DIRECTUS_STATIC_TOKEN;

        const cachedPerms = USER_PERMISSIONS_CACHE.get(token);
        if (cachedPerms) {
            bypassModuleAuthorization = cachedPerms.bypassModuleAuthorization;
            authorizedSubsystemPaths = cachedPerms.authorizedSubsystemPaths;
            authorizedModulePaths = cachedPerms.authorizedModulePaths;
            allModulePaths = cachedPerms.allModulePaths;
        } else if (directusBase && directusToken && payload && payload.sub) {
            try {
                // Fetch LIVE permissions from junction tables + User Role
                const [modRes, allModsRes, userRes] = await Promise.all([
                    fetch(`${directusBase}/items/user_access_modules?filter=${encodeURIComponent(JSON.stringify({ user_id: { _eq: payload.sub } }))}&limit=-1&fields=module_id.base_path`, {
                        headers: { "Authorization": `Bearer ${directusToken}` },
                        cache: 'no-store'
                    }),
                    fetch(`${directusBase}/items/modules?limit=-1&fields=base_path`, {
                        headers: { "Authorization": `Bearer ${directusToken}` },
                        cache: 'no-store'
                    }),
                    fetch(`${directusBase}/items/user/${payload.sub}?fields=role,isAdmin`, {
                        headers: { "Authorization": `Bearer ${directusToken}` },
                        cache: 'no-store'
                    })
                ]);

                if (modRes.ok && allModsRes.ok) {
                    const [modData, allModsData] = await Promise.all([
                        modRes.json(),
                        allModsRes.json(),
                    ]);

                    let userData: { data?: { role?: string; isAdmin?: boolean | number } } = { data: {} };
                    if (userRes.ok) {
                        userData = await userRes.json();
                    } else {
                        const errorText = await userRes.text().catch(() => "Could not read error text");
                        console.error("[Middleware] User fetch failed:", userRes.status, errorText);
                    }

                    const u = userData?.data || {};
                    const isAdmin = u.role === "ADMIN" || u.isAdmin === 1 || u.isAdmin === true;
                    if (isAdmin) {
                        bypassModuleAuthorization = true;
                    } else {
                        // Derive authorized subsystem paths directly from the JWT payload
                        authorizedSubsystemPaths = userSubsystems.map(id => `/${id}`);

                        authorizedModulePaths = (modData.data || []).map((row: { module_id?: { base_path?: string } }) => row.module_id?.base_path?.trim()).filter(Boolean) as string[];
                        allModulePaths = (allModsData.data || []).map((row: { base_path?: string }) => row.base_path?.trim()).filter(Boolean) as string[];
                    }

                    // Evict oldest entries if cache exceeds max size
                    if (USER_PERMISSIONS_CACHE.size >= MAX_CACHE_SIZE) {
                        const firstKey = USER_PERMISSIONS_CACHE.keys().next().value;
                        if (firstKey !== undefined) {
                            USER_PERMISSIONS_CACHE.delete(firstKey);
                        }
                    }

                    // Save to Cache
                    USER_PERMISSIONS_CACHE.set(token, {
                        bypassModuleAuthorization,
                        authorizedSubsystemPaths,
                        authorizedModulePaths,
                        allModulePaths
                    });
                } else {
                    // Fail-fast on server errors
                    const service = !modRes.ok || !allModsRes.ok ? "Directus Permissions" : "Directus User Profile";
                    throw new Error(service);
                }
            } catch (err) {
                console.error("[Middleware] Critical Service Failure:", err);
                const service = err instanceof Error ? err.message : "Authorization System";
                const url = req.nextUrl.clone();
                url.pathname = "/error/service-down";
                url.searchParams.set("service", service);
                return NextResponse.redirect(url);
            }
        }

        // --- Stricter URL Matching Logic ---
        const cleanPathname = pathname.replace(/\/$/, "");
        let isAuthorized = bypassModuleAuthorization;

        // 1. Root Subsystem Match (e.g. exactly /hrm)
        if (authorizedSubsystemPaths.includes(cleanPathname)) {
            isAuthorized = true;
        }

        // 2. Exact Module Match or Sub-Route of Module
        if (!isAuthorized) {
            if (authorizedModulePaths.includes(cleanPathname)) {
                isAuthorized = true;
            } else {
                if (allModulePaths.includes(cleanPathname)) {
                    isAuthorized = false;
                } else {
                    isAuthorized = authorizedModulePaths.some(p => p !== "/" && p !== "" && cleanPathname.startsWith(p + "/"));
                }
            }
        }

        if (!isAuthorized) {
            console.warn(`[Middleware] Unauthorized access attempt: User ${payload?.email} -> ${pathname}`);
            const url = req.nextUrl.clone();
            url.pathname = "/main-dashboard";
            url.searchParams.set("error", "unauthorized_access");
            url.searchParams.set("module", subsystemId);
            return NextResponse.redirect(url);
        }
    }

    // --- Subscription Lock Check ---
    // Authorization must run first. If the authorized path is subscription-locked,
    // let the request proceed and mark it so the layout can show the paywall.
    const isLocked = await isSubscriptionLocked(pathname);
    if (isLocked) {
        const lockMode = normalizeLockedModuleMode(process.env.NEXT_PUBLIC_LOCKED_MODULE_MODE);

        if (lockMode === "hide" || lockMode === "disabled") {
            const url = req.nextUrl.clone();
            url.pathname = "/main-dashboard";
            url.searchParams.set("error", "locked_module");
            return NextResponse.redirect(url);
        }

        requestHeaders.set("x-locked-module", "true");
        const response = NextResponse.next({
            request: {
                headers: requestHeaders,
            }
        });
        response.cookies.set("x-locked-module", "true", { path: "/" });
        applyCommonCookies(response, req, token);
        return response;
    }

    requestHeaders.delete("x-locked-module");
    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        }
    });
    response.cookies.delete("x-locked-module");

    applyCommonCookies(response, req, token);
    return response;
}

export const config = {
    matcher: ["/:path*"],
}


