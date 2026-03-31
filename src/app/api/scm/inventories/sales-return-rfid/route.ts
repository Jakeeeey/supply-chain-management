/* eslint-disable @typescript-eslint/no-explicit-any */
// =============================================================================
// Sales Return RFID — Next.js API Route (Server Gateway)
// Thin wrapper around the service layer.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import {
  fetchReturns,
  fetchReturnDetails,
  fetchReferences,
  fetchProductCatalog,
  fetchInvoices,
  fetchStatusCard,
  fetchRfidTags,
  lookupRfid,
  checkRfidDuplicate,
  submitReturn,
  updateReturn,
  updateStatus,
} from "@/modules/supply-chain-management/inventories/sales-return-rfid/services/sales-return-service";
import { getUserIdFromToken } from "@/lib/auth-utils";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
        const page = Number(url.searchParams.get("page") || 1);
        const limit = Number(url.searchParams.get("limit") || 10);
        const filters = {
          salesman: url.searchParams.get("salesman") || undefined,
          customer: url.searchParams.get("customer") || undefined,
          status: url.searchParams.get("status") || undefined,
          invoiceNo: url.searchParams.get("invoiceNo") || undefined,
        };
        const data = await fetchReturns(page, limit, filters);
        return json({ data: data.data, total: data.total });
      }

      case "details": {
        const id = url.searchParams.get("id");
        const returnNo = url.searchParams.get("returnNo");
        if (!id || !returnNo) {
          return json({ error: "id and returnNo are required" }, 400);
        }
        const data = await fetchReturnDetails(Number(id), returnNo);
        return json({ data });
      }

      case "references": {
        const data = await fetchReferences();
        return json({ data });
      }

      case "products": {
        const data = await fetchProductCatalog();
        return json({ data });
      }

      case "invoices": {
        const salesmanId = url.searchParams.get("salesmanId") || undefined;
        const customerCode = url.searchParams.get("customerCode") || undefined;
        const data = await fetchInvoices(salesmanId, customerCode);
        return json({ data });
      }

      case "rfidTags": {
        const detailId = url.searchParams.get("detailId");
        if (!detailId) {
          return json({ error: "detailId is required" }, 400);
        }
        const data = await fetchRfidTags(Number(detailId));
        return json({ data });
      }

      case "statusCard": {
        const id = url.searchParams.get("id");
        if (!id) {
          return json({ error: "id is required" }, 400);
        }
        const data = await fetchStatusCard(Number(id));
        return json({ data });
      }

      case "check-rfid-duplicate": {
        const rfid = url.searchParams.get("rfid");
        if (!rfid) return json({ error: "rfid is required" }, 400);
        const result = await checkRfidDuplicate(rfid);
        return json({ data: result });
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

        const rfidToken = req.cookies.get("vos_access_token")?.value;
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
    console.error("Sales Return RFID API GET Error:", error);
    return json({ error: error.message || "Internal server error" }, 500);
  }
}

// =============================================================================
// POST — Create a new Sales Return
// =============================================================================
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("vos_access_token")?.value;
    const userId = getUserIdFromToken(token);
    
    if (!userId) {
      return json({ error: "Unauthorized: Invalid or missing session" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const data = await submitReturn(body, userId);
    return json({ data }, 201);
  } catch (error: any) {
    console.error("Sales Return RFID API POST Error:", error);
    return json(
      { error: error.message || "Failed to create sales return" },
      500,
    );
  }
}

// =============================================================================
// PATCH — Update an existing Sales Return or change status
// =============================================================================
export async function PATCH(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "update";

    if (action === "status") {
      const id = url.searchParams.get("id");
      const status = url.searchParams.get("status");
      if (!id || !status) {
        return json({ error: "id and status are required" }, 400);
      }
      const isReceived = url.searchParams.get("isReceived") === "true" ? 1 : undefined;
      const receivedAt = url.searchParams.get("receivedAt") || undefined;

      const data = await updateStatus(Number(id), status, isReceived, receivedAt);
      return json({ data });
    }

    // Default: full update
    const token = req.cookies.get("vos_access_token")?.value;
    const userId = getUserIdFromToken(token);
    
    if (!userId) {
      return json({ error: "Unauthorized: Invalid or missing session" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const data = await updateReturn(body, userId);
    return json({ data });
  } catch (error: any) {
    console.error("Sales Return RFID API PATCH Error:", error);
    return json(
      { error: error.message || "Failed to update sales return" },
      500,
    );
  }
}
