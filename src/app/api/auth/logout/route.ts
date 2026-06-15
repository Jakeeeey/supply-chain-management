import { NextResponse } from "next/server"
import { COOKIE_NAME, REFRESH_COOKIE_NAME, IS_SECURE_COOKIE } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-registration/utils/auth-utils"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


export async function POST() {
    const res = NextResponse.json({ ok: true })

    res.cookies.set({
        name: COOKIE_NAME,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: IS_SECURE_COOKIE,
        path: "/",
        maxAge: 0,
    })

    res.cookies.set({
        name: REFRESH_COOKIE_NAME,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: IS_SECURE_COOKIE,
        path: "/",
        maxAge: 0,
    })

    return res
}