import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as service from "@/modules/supply-chain-management/warehouse-management/stock-transfer-serialize/services/serialize.service";
import { jwtDecode } from "jwt-decode";

/**
 * API Route for Serialized Stock Transfer operations.
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "lookup_serial") {
      const serial = searchParams.get("serial");
      const branchId = searchParams.get("branch_id");

      if (!serial) {
        return NextResponse.json({ error: "Serial number is required" }, { status: 400 });
      }

      const result = await service.lookupSerial(
        serial, 
        branchId ? Number(branchId) : undefined
      );
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[Stock Transfer Serialize API] GET Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Extract User ID from JWT cookie
    let userId: number | undefined;
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;
    
    if (token) {
      try {
        const decoded = jwtDecode<{ id: number }>(token);
        userId = decoded.id;
      } catch (e) {
        console.warn("[Stock Transfer Serialize API] Failed to decode token:", e);
      }
    }

    const result = await service.updateTransferWithSerials(body, userId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Stock Transfer Serialize API] PATCH Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
