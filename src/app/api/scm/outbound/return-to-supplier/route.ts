// =============================================================================
// Return-to-Supplier — Next.js API Route (Server Gateway)
// Thin wrapper around the service layer with Zod validation.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createReturnSchema } from "@/modules/supply-chain-management/outbound/return-to-supplier/types/rts.schema";
import {
  fetchTransactions,
  fetchTransactionDetails,
  fetchReferences,
  fetchInventory,
  lookupRfid,
  createTransaction,
  updateTransaction,
} from "@/modules/supply-chain-management/outbound/return-to-supplier/services/rts-service";

export const runtime = "nodejs";

function json(res: any, status = 200) {
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
        const cookieStore = await cookies();
        const token = cookieStore.get("vos_access_token")?.value;

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

      case "rfid-lookup": {
        const rfid = url.searchParams.get("rfid");
        const rfidBranchId = Number(url.searchParams.get("branchId"));

        if (!rfid || !rfidBranchId) {
          return json(
            { error: "rfid and branchId are required" },
            400,
          );
        }

        const rfidCookieStore = await cookies();
        const rfidToken = rfidCookieStore.get("vos_access_token")?.value;

        if (!rfidToken) {
          return json(
            { error: "Unauthorized: Missing access token" },
            401,
          );
        }

        const result = await lookupRfid(rfid, rfidBranchId, rfidToken);
        return json({ data: result });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error: any) {
    console.error("RTS API GET Error:", error);
    return json({ error: error.message || "Internal server error" }, 500);
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

    const data = await createTransaction(parsed.data);
    return json({ data }, 201);
  } catch (error: any) {
    console.error("RTS API POST Error:", error);
    return json({ error: error.message || "Failed to create transaction" }, 500);
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

    await updateTransaction(id, parsed.data);
    return json({ data: { success: true } });
  } catch (error: any) {
    console.error("RTS API PATCH Error:", error);
    return json(
      { error: error.message || "Failed to update transaction" },
      500,
    );
  }
}
