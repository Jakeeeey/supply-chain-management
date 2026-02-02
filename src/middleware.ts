// src/middleware.ts
import { NextRequest, NextResponse } from "next/server"

const COOKIE_NAME = "vos_access_token"
const PROTECTED_PREFIXES = ["/dashboard", "/scm", "/fm", "/hrm", "/bia", "/arf"]
const PUBLIC_FILE = /\.(.*)$/

function isProtectedPath(pathname: string) {
    return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function middleware(req: NextRequest) {
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
        pathname.startsWith("/api/auth/logout")
    ) {
        return NextResponse.next()
    }

    if (!isProtectedPath(pathname)) {
        return NextResponse.next()
    }

    const token = req.cookies.get(COOKIE_NAME)?.value
    if (!token) {
        const url = req.nextUrl.clone()
        url.pathname = "/login"
        url.searchParams.set("next", pathname)
        return NextResponse.redirect(url)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/:path*"],
}
