// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const COOKIE_NAME = "vos_access_token"

export async function POST() {
    const res = NextResponse.json({ ok: true })

    res.cookies.set({
        name: COOKIE_NAME,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    })

    return res
}
