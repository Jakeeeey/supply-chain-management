import { NextRequest, NextResponse } from "next/server";

const SPRING_BASE_URL = process.env.SPRING_API_BASE_URL;

async function handleSpringProxy(
    req: NextRequest,
    { params }: { params: { path: string[] } }
) {
    if (!SPRING_BASE_URL) {
        return NextResponse.json({ error: "Spring API Base URL not configured" }, { status: 500 });
    }

    // 1. Buuin ang tamang URL patungo sa Spring Boot
    const path = (await params).path.join("/");
    const targetUrl = new URL(`${SPRING_BASE_URL}/${path}`);

    // 2. Kopyahin ang search parameters (query strings)
    req.nextUrl.searchParams.forEach((value, key) => {
        targetUrl.searchParams.set(key, value);
    });

    // 3. I-prepare ang request body (kung meron)
    const body = ["GET", "HEAD"].includes(req.method) ? undefined : await req.arrayBuffer();

    try {
        const response = await fetch(targetUrl.toString(), {
            method: req.method,
            headers: {
                "Authorization": req.headers.get("authorization") || "",
                "Content-Type": req.headers.get("content-type") || "application/json",
            },
            body,
        });

        const data = await response.arrayBuffer();

        return new NextResponse(data, {
            status: response.status,
            headers: {
                "Content-Type": response.headers.get("content-type") || "application/json",
            },
        });
    } catch (error) {
        console.error("Spring Proxy Error:", error);
        return NextResponse.json({ error: "Failed to connect to Spring backend" }, { status: 502 });
    }
}

export const GET = handleSpringProxy;
export const POST = handleSpringProxy;
export const PUT = handleSpringProxy;
export const DELETE = handleSpringProxy;