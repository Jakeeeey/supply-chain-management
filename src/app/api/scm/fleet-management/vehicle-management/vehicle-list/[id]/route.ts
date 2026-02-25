//src/app/api/vehicle-management/vehicle-list/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const UPSTREAM =
  process.env.UPSTREAM_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;

function withCors(res: NextResponse, req: NextRequest) {
  const origin = req.headers.get("origin") || "*";
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return res;
}

function pickForwardHeaders(req: NextRequest) {
  const headers = new Headers();

  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);

  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);

  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  return headers;
}

function buildUpstreamUrl(req: NextRequest, path: string) {
  const base = (UPSTREAM || "").replace(/\/+$/, "");
  const url = new URL(`${base}${path}`);
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.append(k, v));
  return url;
}

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!UPSTREAM) {
    return withCors(
      NextResponse.json(
        { error: "UPSTREAM_API_BASE_URL / NEXT_PUBLIC_API_BASE_URL is not set" },
        { status: 500 }
      ),
      req
    );
  }

  const { id } = await ctx.params;
  const upstreamUrl = buildUpstreamUrl(req, `/items/vehicles/${id}`);

  const method = req.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const upstreamRes = await fetch(upstreamUrl.toString(), {
    method,
    headers: pickForwardHeaders(req),
    body,
    redirect: "manual",
  });

  const contentType =
    upstreamRes.headers.get("content-type") || "application/json";
  const raw = await upstreamRes.arrayBuffer();

  const res = new NextResponse(raw, {
    status: upstreamRes.status,
    headers: { "content-type": contentType },
  });

  return withCors(res, req);
}

export async function OPTIONS(req: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), req);
}

export async function GET(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
