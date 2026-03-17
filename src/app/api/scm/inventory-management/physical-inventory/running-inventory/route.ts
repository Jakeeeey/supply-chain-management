//src/app/api/scm/physical-inventory/running-inventory/route.ts
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
            { ok: false, error: "SPRING_API_BASE_URL is not configured." },
            { status: 500 },
        );
    }

    try {
        const incomingUrl = new URL(req.url);

        const branchName = incomingUrl.searchParams.get("branchName")?.trim() ?? "";
        const supplierShortcut =
            incomingUrl.searchParams.get("supplierShortcut")?.trim() ?? "";
        const productCategory =
            incomingUrl.searchParams.get("productCategory")?.trim() ?? "";

        const targetUrl = new URL(
            `${SPRING_API_BASE_URL.replace(/\/$/, "")}/api/view-running-inventory/filter`,
        );

        if (branchName) {
            targetUrl.searchParams.set("branchName", branchName);
        }

        if (supplierShortcut) {
            targetUrl.searchParams.set("supplierShortcut", supplierShortcut);
        }

        if (productCategory) {
            targetUrl.searchParams.set("productCategory", productCategory);
        }

        const springRes = await fetch(targetUrl.toString(), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
            cache: "no-store",
        });

        const contentType = springRes.headers.get("content-type") ?? "application/json";
        const text = await springRes.text();

        return new NextResponse(text, {
            status: springRes.status,
            headers: {
                "Content-Type": contentType,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Gateway Error";

        return NextResponse.json(
            { ok: false, error: message },
            { status: 502 },
        );
    }
}