//src/app/api/scm/physical-inventory/directus/[...slug]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN ?? "";

function ensureDirectusBaseUrl(): void {
    if (!DIRECTUS_BASE_URL) {
        throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
    }
}

function buildUpstreamUrl(slug: string[], request: NextRequest): string {
    ensureDirectusBaseUrl();

    const upstream = new URL(`/items/${slug.join("/")}`, DIRECTUS_BASE_URL);

    request.nextUrl.searchParams.forEach((value, key) => {
        upstream.searchParams.set(key, value);
    });

    return upstream.toString();
}

function buildHeaders(contentType?: string | null): HeadersInit {
    const headers: Record<string, string> = {};

    if (DIRECTUS_TOKEN) {
        headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    }

    if (contentType) {
        headers["Content-Type"] = contentType;
    }

    return headers;
}

async function passthrough(response: Response): Promise<NextResponse> {
    const status = response.status;

    if (status === 204 || status === 205 || status === 304) {
        return new NextResponse(null, {
            status,
        });
    }

    const text = await response.text();
    const contentType = response.headers.get("content-type");

    return new NextResponse(text, {
        status,
        headers: contentType
            ? {
                "Content-Type": contentType,
            }
            : undefined,
    });
}

async function handleGet(request: NextRequest, slug: string[]): Promise<NextResponse> {
    const response = await fetch(buildUpstreamUrl(slug, request), {
        method: "GET",
        headers: buildHeaders(),
        cache: "no-store",
    });

    return passthrough(response);
}

async function handlePost(request: NextRequest, slug: string[]): Promise<NextResponse> {
    const body = await request.text();
    const contentType = request.headers.get("content-type") ?? "application/json";

    const response = await fetch(buildUpstreamUrl(slug, request), {
        method: "POST",
        headers: buildHeaders(contentType),
        body,
        cache: "no-store",
    });

    return passthrough(response);
}

async function handlePatch(request: NextRequest, slug: string[]): Promise<NextResponse> {
    const body = await request.text();
    const contentType = request.headers.get("content-type") ?? "application/json";

    const response = await fetch(buildUpstreamUrl(slug, request), {
        method: "PATCH",
        headers: buildHeaders(contentType),
        body,
        cache: "no-store",
    });

    return passthrough(response);
}

async function handleDelete(request: NextRequest, slug: string[]): Promise<NextResponse> {
    const response = await fetch(buildUpstreamUrl(slug, request), {
        method: "DELETE",
        headers: buildHeaders(),
        cache: "no-store",
    });

    return passthrough(response);
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ slug: string[] }> },
): Promise<NextResponse> {
    try {
        const { slug } = await context.params;
        return await handleGet(request, slug);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Directus proxy GET failed.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ slug: string[] }> },
): Promise<NextResponse> {
    try {
        const { slug } = await context.params;
        return await handlePost(request, slug);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Directus proxy POST failed.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ slug: string[] }> },
): Promise<NextResponse> {
    try {
        const { slug } = await context.params;
        return await handlePatch(request, slug);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Directus proxy PATCH failed.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ slug: string[] }> },
): Promise<NextResponse> {
    try {
        const { slug } = await context.params;
        return await handleDelete(request, slug);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Directus proxy DELETE failed.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}