import { NextResponse } from "next/server"
import { COOKIE_NAME } from "@/lib/auth-utils"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


export async function POST() {
    const res = NextResponse.json({ ok: true })

    res.cookies.set({
        name: COOKIE_NAME,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
        maxAge: 0,
    })

    return res
}
