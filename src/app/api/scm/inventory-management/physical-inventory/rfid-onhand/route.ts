import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPRING_API_BASE_URL = process.env.SPRING_API_BASE_URL;
const COOKIE_NAME = "vos_access_token";

type SpringRfidOnhandRow = {
    productId: number;
};

type RfidOnhandResult = {
    ok: boolean;
    item: SpringRfidOnhandRow | null;
    message?: string;
};

function toProductItem(payload: unknown): SpringRfidOnhandRow | null {
    if (Array.isArray(payload) && payload.length > 0) {
        const first = payload[0];
        if (
            first &&
            typeof first === "object" &&
            "productId" in first &&
            Number.isFinite(Number((first as { productId: unknown }).productId))
        ) {
            return {
                productId: Number((first as { productId: unknown }).productId),
            };
        }
    }

    if (
        payload &&
        typeof payload === "object" &&
        "productId" in payload &&
        Number.isFinite(Number((payload as { productId: unknown }).productId))
    ) {
        return {
            productId: Number((payload as { productId: unknown }).productId),
        };
    }

    return null;
}

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
        const rfid = incomingUrl.searchParams.get("rfid")?.trim() ?? "";
        const branchId = incomingUrl.searchParams.get("branchId")?.trim() ?? "";

        if (!rfid) {
            return NextResponse.json(
                { ok: false, message: "RFID tag is required." },
                { status: 400 },
            );
        }

        if (!branchId) {
            return NextResponse.json(
                { ok: false, message: "branchId is required." },
                { status: 400 },
            );
        }

        const targetUrl = new URL(
            `${SPRING_API_BASE_URL.replace(/\/$/, "")}/api/view-rfid-onhand`,
        );

        targetUrl.searchParams.set("rfid", rfid);
        targetUrl.searchParams.set("branchId", branchId);

        const springRes = await fetch(targetUrl.toString(), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                Cookie: `vos_access_token=${token}`,
                Accept: "application/json",
            },
            cache: "no-store",
        });

        const text = await springRes.text();

        if (!springRes.ok) {
            return new NextResponse(text || "RFID on-hand lookup failed.", {
                status: springRes.status,
                headers: {
                    "Content-Type":
                        springRes.headers.get("content-type") ?? "application/json",
                },
            });
        }

        const parsed: unknown = text ? JSON.parse(text) : [];
        const item = toProductItem(parsed);

        const result: RfidOnhandResult = {
            ok: true,
            item,
            message: item ? undefined : "RFID not found in on-hand records.",
        };

        return NextResponse.json(result);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "RFID on-hand lookup failed.";

        return NextResponse.json(
            { ok: false, message },
            { status: 502 },
        );
    }
}