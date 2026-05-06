// =============================================================================
// Return-to-Supplier Manual — Next.js API Route (Server Gateway)
// Thin wrapper around the service layer with Zod validation.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createReturnSchema } from "@/modules/supply-chain-management/outbound/return-to-supplier-manual/types/rts.schema";
import {
  fetchTransactions,
  fetchTransactionDetails,
  fetchReferences,
  fetchInventory,
  createTransaction,
  updateTransaction,
} from "@/modules/supply-chain-management/outbound/return-to-supplier-manual/services/rts-service";
/**
 * Decodes the base64url payload of a JWT without verifying the signature.
 * @param token The JWT string.
 * @returns The parsed JSON payload, or null if invalid.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    if (!base64Url) return null;

    let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }

    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode JWT payload:", error);
    return null;
  }
}

export const runtime = "nodejs";

function json(res: unknown, status = 200) {
  return NextResponse.json(res, { status });
}

// =============================================================================
// GET — Dispatches based on ?action= query param
// =============================================================================
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    switch (action) {
      case "list": {
        const data = await fetchTransactions();
        return json({ data });
      }

      case "references": {
        const data = await fetchReferences();
        return json({ data });
      }

      case "inventory": {
        const branchId = Number(url.searchParams.get("branchId"));
        const supplierId = Number(url.searchParams.get("supplierId"));

        if (!branchId || !supplierId) {
          return json(
            { error: "branchId and supplierId are required" },
            400,
          );
        }

        // Extract JWT from cookie for Spring Boot auth
        const token = req.cookies.get("vos_access_token")?.value;

        if (!token) {
          return json(
            { error: "Unauthorized: Missing access token" },
            401,
          );
        }

        const data = await fetchInventory(branchId, supplierId, token);
        return json({ data });
      }

      case "details": {
        const id = url.searchParams.get("id");
        if (!id) {
          return json({ error: "id is required" }, 400);
        }

        const data = await fetchTransactionDetails(id);
        return json({ data });
      }


      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error("RTS Manual API GET Error:", err);
    return json({ error: err.message || "Internal server error" }, 500);
  }
}

// =============================================================================
// POST — Create a new Return-to-Supplier transaction
// =============================================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Zod validation
    const parsed = createReturnSchema.safeParse(body);
    if (!parsed.success) {
      return json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        400,
      );
    }

    const token = req.cookies.get("vos_access_token")?.value;
    const jwtPayload = token ? decodeJwtPayload(token) : null;
    const userId = jwtPayload?.user_id ?? jwtPayload?.userId ?? jwtPayload?.sub ?? null;

    if (!userId) {
      return json({ error: "Unauthorized: Invalid or missing session" }, 401);
    }

    const payloadWithAudit = {
      ...parsed.data,
      encoder_id: Number(userId),
    };

    const data = await createTransaction(payloadWithAudit as Parameters<typeof createTransaction>[0]);
    return json({ data }, 201);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("RTS Manual API POST Error:", err);
    return json({ error: err.message || "Failed to create transaction" }, 500);
  }
}

// =============================================================================
// PATCH — Update an existing Return-to-Supplier transaction
// =============================================================================
export async function PATCH(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return json({ error: "id query parameter is required" }, 400);
    }

    const body = await req.json().catch(() => ({}));

    // Zod validation
    const parsed = createReturnSchema.safeParse(body);
    if (!parsed.success) {
      return json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        400,
      );
    }

    const payloadWithAudit = {
      ...parsed.data,
      ...(parsed.data.is_posted === 1 ? { date_posted: new Date().toISOString() } : {}),
    };

    await updateTransaction(id, payloadWithAudit as Parameters<typeof updateTransaction>[1]);
    return json({ data: { success: true } });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("RTS Manual API PATCH Error:", err);
    return json(
      { error: err.message || "Failed to update transaction" },
      500,
    );
  }
}
