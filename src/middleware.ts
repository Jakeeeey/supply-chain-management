// src/middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { decodeJwtPayload, COOKIE_NAME } from "@/lib/auth-utils"

const PUBLIC_FILE = /\.(.*)$/
const BASELINE_PREFIXES = ["/main-dashboard"]

// Edge Memory Cache
let CACHED_PREFIXES: string[] = [...BASELINE_PREFIXES]
let LAST_FETCH_TIME = 0
const CACHE_TTL = 300000 // 5 minutes

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
        pathname === "/login" ||
        pathname.startsWith("/api/auth/login") ||
        pathname.startsWith("/api/auth/logout") ||
        pathname.startsWith("/error/service-down")
    ) {
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

    const token = req.cookies.get(COOKIE_NAME)?.value
    if (!token) {
        const url = req.nextUrl.clone()
        url.pathname = "/login"
        url.searchParams.set("next", pathname)
        return NextResponse.redirect(url)
    }
    const payload = decodeJwtPayload(token);

    // Map path to subsystem ID and specific module slug (e.g. /hrm -> hrm)
    const subsystemMatch = prefixes.find((p) => pathname.startsWith(p));

    if (subsystemMatch) {
        const subsystemId = subsystemMatch.replace("/", "");

        // Dashboard is always allowed if logged in
        if (subsystemId === "main-dashboard") {
            return NextResponse.next();
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

        if (directusBase && directusToken && payload && payload.sub) {
            try {
                // Fetch LIVE permissions from junction tables + User Role
                const [subRes, modRes, allModsRes, userRes] = await Promise.all([
                    fetch(`${directusBase}/items/user_access_subsystems?filter=${encodeURIComponent(JSON.stringify({ user_id: { _eq: payload.sub } }))}&limit=-1&fields=subsystem_id.base_path`, {
                        headers: { "Authorization": `Bearer ${directusToken}` },
                        cache: 'no-store'
                    }),
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

                if (subRes.ok && modRes.ok && allModsRes.ok && userRes.ok) {
                    const [subData, modData, allModsData, userData] = await Promise.all([
                        subRes.json(),
                        modRes.json(),
                        allModsRes.json(),
                        userRes.json()
                    ]);

                    const u = userData?.data || {};
                    const isAdmin = u.role === "ADMIN" || u.isAdmin === 1 || u.isAdmin === true;
                    if (isAdmin) {
                        return NextResponse.next(); // SILENT BYPASS for Admins
                    }

                    authorizedSubsystemPaths = (subData.data || []).map((row: { subsystem_id?: { base_path?: string } }) => row.subsystem_id?.base_path?.trim()).filter(Boolean) as string[];
                    authorizedModulePaths = (modData.data || []).map((row: { module_id?: { base_path?: string } }) => row.module_id?.base_path?.trim()).filter(Boolean) as string[];
                    allModulePaths = (allModsData.data || []).map((row: { base_path?: string }) => row.base_path?.trim()).filter(Boolean) as string[];
                } else {
                    // Fail-fast on server errors
                    const service = !subRes.ok || !modRes.ok || !allModsRes.ok ? "Directus" : "Spring Boot";
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
        let isAuthorized = false;

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

        console.log("=== MIDDLEWARE DEBUG ===");
        console.log("cleanPathname:", cleanPathname);
        console.log("authorizedSubsystemPaths:", authorizedSubsystemPaths);
        console.log("authorizedModulePaths:", authorizedModulePaths);
        console.log("allModulePaths.includes(cleanPathname):", allModulePaths.includes(cleanPathname));
        console.log("isAuthorized:", isAuthorized);
        console.log("========================");

        if (!isAuthorized) {
            console.warn(`[Middleware] Unauthorized access attempt: User ${payload?.email} -> ${pathname}`);
            const url = req.nextUrl.clone();
            url.pathname = "/main-dashboard";
            url.searchParams.set("error", "unauthorized_access");
            url.searchParams.set("module", subsystemId);
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/:path*"],
}
