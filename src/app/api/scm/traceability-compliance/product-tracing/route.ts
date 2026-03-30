//src/app/api/scm/traceability-compliance/product-tracing/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPRING_API_BASE_URL = process.env.SPRING_API_BASE_URL;
const COOKIE_NAME = "vos_access_token";

export async function GET(req: NextRequest): Promise<NextResponse> {
    const token = req.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
        console.error("[Product Tracing Proxy] No vos_access_token cookie found!");
        return NextResponse.json(
            { ok: false, message: "Unauthorized: Missing access token" },
            { status: 401 },
        );
    }

    console.log(`[Product Tracing Proxy] Token found (prefix): ${token.substring(0, 10)}...`);

    if (!SPRING_API_BASE_URL) {
        return NextResponse.json(
            { ok: false, error: "SPRING_API_BASE_URL is not configured." },
            { status: 500 },
        );
    }

    try {
        const incomingUrl = new URL(req.url);
        const branchId = incomingUrl.searchParams.get("branchId") ?? "";
        const parentId = incomingUrl.searchParams.get("parentId") ?? "";
        const startDate = incomingUrl.searchParams.get("startDate") ?? "";
        const endDate = incomingUrl.searchParams.get("endDate") ?? "";

        const targetUrl = new URL(
            `${SPRING_API_BASE_URL.replace(/\/$/, "")}/api/view-product-movements/all`,
        );

        if (branchId) targetUrl.searchParams.set("branch_id", branchId);
        if (parentId) targetUrl.searchParams.set("product_id", parentId);
        if (startDate) targetUrl.searchParams.set("from", startDate);
        if (endDate) targetUrl.searchParams.set("to", endDate);

        console.log(`[Product Tracing Proxy] Requesting: ${targetUrl.toString()}`);

        const springRes = await fetch(targetUrl.toString(), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
            cache: "no-store",
        });

        console.log(`[Product Tracing Proxy] Spring Response: ${springRes.status}`);

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
