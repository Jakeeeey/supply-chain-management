import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN =
  process.env.DIRECTUS_STATIC_TOKEN || process.env.DIRECTUS_SERVICE_TOKEN || "";

const TABLE_PH = "physical_inventory";
const TABLE_ATTACHMENTS = "physical_inventory_attachments";

function directusHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (DIRECTUS_TOKEN) {
    headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  }
  return headers;
}

type AttachmentRow = {
  id: number;
  physical_inventory_id: number;
  created_at: string;
};

export async function POST(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_API_BASE_URL is not configured." },
        { status: 500 }
      );
    }

    // 1. Fetch attachments (uncommitted and uncancelled PIs, sorted by created_at asc so earliest/first attachments come first)
    const attRes = await fetch(
      `${DIRECTUS_URL}/items/${TABLE_ATTACHMENTS}?fields=id,physical_inventory_id,created_at&sort=created_at&limit=500&filter[physical_inventory_id][isComitted][_eq]=0&filter[physical_inventory_id][isCancelled][_eq]=0`,
      {
        headers: directusHeaders(),
        cache: "no-store",
      }
    );

    if (!attRes.ok) {
      const errText = await attRes.text().catch(() => "");
      return NextResponse.json(
        { error: `Failed to fetch attachments: ${errText}` },
        { status: attRes.status }
      );
    }

    const attJson = (await attRes.json()) as { data: AttachmentRow[] };
    const allAttachments = attJson.data || [];

    // Cutoff time: 8 hours ago in UTC
    const eightHoursAgo = Date.now() - 8 * 60 * 60 * 1000;

    // Parse created_at safely considering Philippine Time (GMT+8) / MySQL local timestamps
    // If string ends with Z or has offset, parse accurately.
    const dueAttachments = allAttachments.filter((att) => {
      if (!att.created_at) return false;
      
      // Normalize raw timestamp without trailing 'Z' if MySQL stored local PH time
      // e.g. "2026-10-29T03:17:00.000Z" -> treat the wall-clock time as Asia/Manila (GMT+8)
      const createdMs = new Date(att.created_at).getTime();
      
      // Check if treating as local GMT+8 wall-clock time matches better:
      const cleanIso = att.created_at.replace("Z", "");
      const phParsedMs = new Date(`${cleanIso}+08:00`).getTime();
      
      // Use the earlier of the two interpretations so users entering local DB time or UTC are both covered
      const effectiveMs = Math.min(
        Number.isFinite(createdMs) ? createdMs : Infinity,
        Number.isFinite(phParsedMs) ? phParsedMs : Infinity
      );

      return Number.isFinite(effectiveMs) && effectiveMs <= eightHoursAgo;
    });

    if (dueAttachments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No attachments older than 8 hours found.",
        committedCount: 0,
        committedIds: [],
      });
    }

    // Get unique physical_inventory_ids
    const candidatePiIds = Array.from(
      new Set(dueAttachments.map((a) => a.physical_inventory_id).filter(Boolean))
    );

    const committedIds: number[] = [];
    const failedIds: Array<{ id: number; error: string }> = [];

    // Internal origin for calling existing commit endpoint
    const url = new URL(req.url);
    const origin = url.origin;

    for (const piId of candidatePiIds) {
      try {
        // Check if PI is still uncommitted and uncancelled
        const piRes = await fetch(
          `${DIRECTUS_URL}/items/${TABLE_PH}/${piId}?fields=id,isComitted,isCancelled`,
          {
            headers: directusHeaders(),
            cache: "no-store",
          }
        );

        if (!piRes.ok) continue;
        const piJson = await piRes.json();
        const pi = piJson.data;

        // Handle directus bit buffer/boolean
        const isComitted =
          typeof pi.isComitted === "object" && pi.isComitted !== null && "data" in pi.isComitted
            ? pi.isComitted.data[0] === 1
            : Boolean(pi.isComitted);

        const isCancelled =
          typeof pi.isCancelled === "object" && pi.isCancelled !== null && "data" in pi.isCancelled
            ? pi.isCancelled.data[0] === 1
            : Boolean(pi.isCancelled);

        if (isComitted || isCancelled) {
          // Already committed or cancelled
          continue;
        }

        // Call our standard commit endpoint
        const commitRes = await fetch(
          `${origin}/api/scm/inventory-management/physical-inventory/header/${piId}/commit`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!commitRes.ok) {
          const errText = await commitRes.text().catch(() => "");
          failedIds.push({ id: piId, error: errText });
        } else {
          committedIds.push(piId);
        }
      } catch (err: unknown) {
        failedIds.push({
          id: piId,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      committedCount: committedIds.length,
      committedIds,
      failedIds,
    });
  } catch (error: unknown) {
    console.error("Auto-commit route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

