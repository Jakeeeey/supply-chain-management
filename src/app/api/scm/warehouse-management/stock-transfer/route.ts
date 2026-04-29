import { NextRequest, NextResponse } from "next/server";
import { 
  getEnrichedTransfers, 
  getEnrichedProducts, 
  createTransfer, 
  updateTransferStatus 
} from "@/modules/supply-chain-management/warehouse-management/stock-transfer/services/stock-transfer.service";
import * as repo from "@/modules/supply-chain-management/warehouse-management/stock-transfer/services/stock-transfer.repo";
import type { 
  CreateTransferPayload, 
  UpdateTransferPayload 
} from "@/modules/supply-chain-management/warehouse-management/stock-transfer/types/stock-transfer.types";

export const dynamic = "force-dynamic";

// ─── In-Memory RFID Cache (60s TTL) ─────────────────────────────────────────
// Kept in route.ts for edge-side performance on common lookups
const rfidCache = new Map<string, { data: Record<string, unknown>; expiry: number }>();
const CACHE_TTL_MS = 60_000;

function getCachedRfid(key: string) {
  const entry = rfidCache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  rfidCache.delete(key);
  return null;
}

function setCachedRfid(key: string, data: Record<string, unknown>) {
  rfidCache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

// ─── GET: Dispatches to specialized service methods ──────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const rfid = searchParams.get("rfid");
  const branchId = searchParams.get("branch_id");
  const token = request.cookies.get("vos_access_token")?.value;

  try {
    // 1. RFID Lookup
    if (action === "lookup_rfid" && rfid) {
      const cacheKey = `rfid:${rfid}:${branchId || ""}`;
      const cached = getCachedRfid(cacheKey);
      if (cached) return NextResponse.json(cached);

      // Try Spring Boot lookup through repo
      const springMatch = await repo.fetchBranchInventory(Number(branchId), token);
      const match = Array.isArray(springMatch) ? springMatch.find((i: Record<string, unknown>) => i.rfid === rfid) : null;

      let productId: number | null = null;
      let branchIdMatch = branchId;

      if (match) {
        productId = (match.productId as number) || (match.product_id as number);
        branchIdMatch = String(match.branchId || match.branch_id || branchId);
      } else {
        // Fallback to Directus legacy records
        const fallbackProd = await repo.fallbackRfidLookup(rfid);
        productId = fallbackProd?.product_id ?? null;
      }

      if (!productId) {
        return NextResponse.json({ error: "RFID not found" }, { status: 404 });
      }

<<<<<<< HEAD
      // Fetch full product details directly by ID
      const product = await repo.fetchProductById(productId);
      
      if (!product) {
        return NextResponse.json({ error: "Product details not found" }, { status: 404 });
      }

      const inventory = await repo.fetchBranchInventory(Number(branchIdMatch), token);
      const invCount = Array.isArray(inventory) ? inventory.filter((i: Record<string, unknown>) => (i.productId || i.product_id) === productId).length : 0;

=======
      // Fetch full product details
      const products = await repo.fetchProducts(); // We can filter here if repo supported it, but fetching all for lookup is what original did
      const product = products.find(p => p.product_id === productId);

      if (!product) {
        return NextResponse.json({ error: "Product details not found" }, { status: 404 });
      }

      const inventory = await repo.fetchBranchInventory(Number(branchIdMatch), token);
      const invCount = Array.isArray(inventory) ? inventory.filter((i: Record<string, unknown>) => (i.productId || i.product_id) === productId).length : 0;

>>>>>>> origin/master
      const result = {
        rfid,
        productId: product.product_id,
        productName: product.product_name,
        barcode: product.barcode || product.product_code || String(product.product_id),
        unitPrice: product.price_per_unit || product.cost_per_unit || 0,
        branchId: branchIdMatch,
        qtyAvailable: invCount
      };

      setCachedRfid(cacheKey, result);
      return NextResponse.json(result);
    }

    // 2. Product List with Inventory
    if (action === "products") {
      const search = searchParams.get("search") || "";
      const bId = Number(branchId || 0);
      const enrichedProducts = await getEnrichedProducts(bId, search, token);
      return NextResponse.json({ data: enrichedProducts });
    }

    // 3. Default: Fetch Transfers + Branches
    const statusFilter = searchParams.get("status") || undefined;
    const [stockTransfers, branches] = await Promise.all([
      getEnrichedTransfers(statusFilter),
      repo.fetchBranches()
    ]);

    return NextResponse.json({ stockTransfers, branches });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[Stock Transfer API GET Error]:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST: Delegate to service layer ─────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateTransferPayload;
    // Note: In a real app, we'd get the actual user ID from the session
    const result = await createTransfer(body); 
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Stock Transfer API POST Error]:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// ─── PATCH: Delegate to service layer ────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdateTransferPayload;
    const result = await updateTransferStatus(body);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Stock Transfer API PATCH Error]:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
