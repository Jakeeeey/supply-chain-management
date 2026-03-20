// src/app/api/scm/inventory-management/physical-inventory/rfid-onhand/all/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPRING_API_BASE_URL = process.env.SPRING_API_BASE_URL;
const COOKIE_NAME = "vos_access_token";

export async function GET(req: NextRequest): Promise<NextResponse> {
    const token = req.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
        return NextResponse.json(
            { ok: false, message: "Unauthorized: Missing access token" },
            { status: 401 },
        );
    }

    if (!SPRING_API_BASE_URL) {
        return NextResponse.json(
            { ok: false, message: "SPRING_API_BASE_URL is not configured." },
            { status: 500 },
        );
    }

    try {
        const incomingUrl = new URL(req.url);
        const branchId = incomingUrl.searchParams.get("branchId")?.trim() ?? "";

        if (!branchId) {
            return NextResponse.json(
                { ok: false, message: "branchId is required." },
                { status: 400 },
            );
        }

        // We try the Spring API endpoint without the 'rfid' parameter to see if it returns all
        // Some Spring endpoints in this project use '/all' suffix, some use filters
        // We'll try the base endpoint first with just branchId
        const targetUrl = new URL(
            `${SPRING_API_BASE_URL.replace(/\/$/, "")}/api/view-rfid-onhand`,
        );

        targetUrl.searchParams.set("branchId", branchId);

        const springRes = await fetch(targetUrl.toString(), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
            cache: "no-store",
        });

        if (!springRes.ok) {
            // If the base endpoint fails without rfid, try the /all suffix (common pattern)
            const fallbackUrl = new URL(
                `${SPRING_API_BASE_URL.replace(/\/$/, "")}/api/view-rfid-onhand/all`,
            );
            fallbackUrl.searchParams.set("branchId", branchId);

            const fallbackRes = await fetch(fallbackUrl.toString(), {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
                cache: "no-store",
            });

            if (!fallbackRes.ok) {
                const text = await fallbackRes.text();
                return new NextResponse(text || "Bulk RFID on-hand fetch failed.", {
                    status: fallbackRes.status,
                    headers: {
                        "Content-Type":
                            fallbackRes.headers.get("content-type") ?? "application/json",
                    },
                });
            }
            
            const data = await fallbackRes.json();
            return NextResponse.json({ ok: true, data });
        }

        const data = await springRes.json();
        return NextResponse.json({ ok: true, data });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Bulk RFID on-hand fetch failed.";

        return NextResponse.json(
            { ok: false, message },
            { status: 502 },
        );
    }
}
