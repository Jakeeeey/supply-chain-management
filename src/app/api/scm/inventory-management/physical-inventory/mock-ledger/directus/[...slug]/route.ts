//src/app/api/arf/inventory-management/physical-inventory/directus/[...slug]/route.ts
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

    const finalSlug = [...slug];
    if (finalSlug[0] === "physical_inventory") {
        finalSlug[0] = "mock_ledger";
    } else if (finalSlug[0] === "physical_inventory_details") {
        finalSlug[0] = "mock_ledger_details";
    }

    const upstream = new URL(`/items/${finalSlug.join("/")}`, DIRECTUS_BASE_URL);

    request.nextUrl.searchParams.forEach((value, key) => {
        // Rewrite query params for mock_ledger filters
        if (key === "filter" && value) {
            const newVal = value.replace(/"ph_id"/g, '"ml_id"').replace(/"ph_no"/g, '"ml_no"');
            upstream.searchParams.set(key, newVal);
        } else if (key === "fields" && value) {
            const newVal = value.replace(/ph_id/g, 'ml_id').replace(/ph_no/g, 'ml_no');
            upstream.searchParams.set(key, newVal);
        } else if (key === "sort" && value) {
            const newVal = value.replace(/ph_no/g, 'ml_no').replace(/ph_id/g, 'ml_id');
            upstream.searchParams.set(key, newVal);
        } else {
            upstream.searchParams.set(key, value);
        }
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

    let finalContent = text;

    if (contentType && contentType.includes("application/json")) {
        try {
            const json = JSON.parse(text);
            if (json && json.data) {
                if (Array.isArray(json.data)) {
                    for (const item of json.data) {
                        if (item.ml_no !== undefined) {
                            item.ph_no = item.ml_no;
                            delete item.ml_no;
                        }
                        if (item.ml_id !== undefined) {
                            item.ph_id = item.ml_id;
                            delete item.ml_id;
                        }
                    }
                } else {
                    if (json.data.ml_no !== undefined) {
                        json.data.ph_no = json.data.ml_no;
                        delete json.data.ml_no;
                    }
                    if (json.data.ml_id !== undefined) {
                        json.data.ph_id = json.data.ml_id;
                        delete json.data.ml_id;
                    }
                }
            }
            finalContent = JSON.stringify(json);
        } catch {}
    }

    return new NextResponse(finalContent, {
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

    let finalBody = body;
    if (contentType && contentType.includes("application/json")) {
        try {
            const json = JSON.parse(body);
            if (Array.isArray(json)) {
                for (const item of json) {
                    if (item.ph_no !== undefined) {
                        item.ml_no = item.ph_no;
                        delete item.ph_no;
                    }
                    if (item.ph_id !== undefined) {
                        item.ml_id = item.ph_id;
                        delete item.ph_id;
                    }
                }
            } else {
                if (json.ph_no !== undefined) {
                    json.ml_no = json.ph_no;
                    delete json.ph_no;
                }
                if (json.ph_id !== undefined) {
                    json.ml_id = json.ph_id;
                    delete json.ph_id;
                }
            }
            finalBody = JSON.stringify(json);
        } catch {}
    }

    const response = await fetch(buildUpstreamUrl(slug, request), {
        method: "POST",
        headers: buildHeaders(contentType),
        body: finalBody,
        cache: "no-store",
    });

    return passthrough(response);
}

async function handlePatch(request: NextRequest, slug: string[]): Promise<NextResponse> {
    const body = await request.text();
    const contentType = request.headers.get("content-type") ?? "application/json";

    let finalBody = body;
    if (contentType && contentType.includes("application/json")) {
        try {
            const json = JSON.parse(body);
            if (json.ph_no !== undefined) {
                json.ml_no = json.ph_no;
                delete json.ph_no;
            }
            if (json.ph_id !== undefined) {
                json.ml_id = json.ph_id;
                delete json.ph_id;
            }
            finalBody = JSON.stringify(json);
        } catch {}
    }

    const response = await fetch(buildUpstreamUrl(slug, request), {
        method: "PATCH",
        headers: buildHeaders(contentType),
        body: finalBody,
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