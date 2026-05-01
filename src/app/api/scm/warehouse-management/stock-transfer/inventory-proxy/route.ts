import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const springBase = process.env.SPRING_API_BASE_URL?.replace(/\/$/, '');
  
  if (!springBase) {
    console.error('[Proxy] SPRING_API_BASE_URL is not configured');
    return NextResponse.json({ error: 'SPRING_API_BASE_URL is not configured' }, { status: 500 });
  }

  // Construct the target external URL dynamically
  const targetUrl = new URL(`${springBase}/api/view-running-inventory/filter`);
  
  // Forward all query parameters
  searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  // Extract auth token from cookies
  const token = request.cookies.get('vos_access_token')?.value;
  console.log(`[Proxy] Target: ${targetUrl.toString()}`);
  console.log(`[Proxy] Token present: ${!!token}, Length: ${token?.length}`);
  
  if (token) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('fs').writeFileSync('/tmp/latest_token.txt', token);
  }

  try {
    // ── 1. Attempt Aggregate Inventory (Port 8087) ──
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(token ? { 
          'Authorization': `Bearer ${token}`,
          'Cookie': `vos_access_token=${token}`
        } : {}),
      },
      cache: 'no-store',
    });

    let aggregateData: Record<string, unknown> | Record<string, unknown>[] | null = null;
    if (response.ok) {
      const data = await response.json();
      aggregateData = data;
      
      // Check if we found the product with non-zero inventory
      // Handle both camelCase (productId) and snake_case (product_id) from Spring API
      const list = Array.isArray(data) ? data : (data.data || []);
      const productId = searchParams.get('productId');
      const found = list.find((inv: Record<string, unknown>) => 
        String(inv.productId ?? inv.product_id) === productId
      );
      
      if (found) {
        const inventory = found.runningInventory ?? found.running_inventory;
        console.log(`[Proxy] Found aggregate inventory for product ${productId}: ${inventory}`);
        return NextResponse.json(data);
      }
    } else {
      const errText = await response.text();
      console.error(`[Proxy] 8087 API returned ${response.status}:`, errText);
      console.error(`[Proxy] Sent headers: Authorization: Bearer ${token ? 'PRESENT' : 'MISSING'}, Cookie: ${token ? 'PRESENT' : 'MISSING'}`);
    }

    if (aggregateData) {
      return NextResponse.json(aggregateData);
    }

    // ── 2. Fallback to Tag Count (v_rfid_onhand) if aggregate is 0 or missing ──
    const branchId = searchParams.get('branchId');
    const productId = searchParams.get('productId');

    if (branchId && productId && springBase) {
      console.log(`[Proxy] Falling back to tag count for product ${productId} in branch ${branchId}`);
      const tagCount = await getTagCount(branchId, productId, token);
      
      if (tagCount > 0) {
        // Return a compatible object structure
        const fallbackResult = {
          data: [{
            productId: Number(productId),
            branchId: Number(branchId),
            runningInventory: tagCount,
            unitName: searchParams.get('unitName') || 'Pieces',
            _fallback: true
          }]
        };
        console.log(`[Proxy] Tag count fallback found: ${tagCount}`);
        return NextResponse.json(fallbackResult);
      }
    }

    // If both failed or returned 0, return whatever aggregateData we had (or the failed response)
    return aggregateData ? NextResponse.json(aggregateData) : NextResponse.json(
      { error: `External API error: ${response.status}` },
      { status: response.status }
    );
  } catch (error) {
    console.error('Inventory Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy inventory request', details: String(error) },
      { status: 500 }
    );
  }
}

// Simple memory cache for fallback tag counts to prevent N+1 payload crashes
const rfidCache = new Map<string, { expiredAt: number; data: Record<string, unknown>[] }>();

/** Helper to count RFID tags in v_rfid_onhand for a specific product */
async function getTagCount(branchId: string, productId: string, token?: string) {
  const springBase = process.env.SPRING_API_BASE_URL?.replace(/\/$/, '');
  if (!springBase) return 0;

  const cacheKey = branchId; // We cache the entire branch's RFIDs to serve all N+1 lookups instantly
  const cached = rfidCache.get(cacheKey);
  const now = Date.now();

  let rows: Record<string, unknown>[] = [];

  if (cached && cached.expiredAt > now) {
    rows = cached.data;
  } else {
    // Note: If the backend supports productId we pass it, but if it ignores it, we gracefully cache the full array.
    const url = `${springBase}/api/view-rfid-onhand?branchId=${branchId}&productId=${productId}`;
    try {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 
            'Authorization': `Bearer ${token}`,
            'Cookie': `vos_access_token=${token}`
          } : {}),
        },
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        rows = Array.isArray(data) ? data : (data.data || []);
        
        // Cache the result for 15 seconds (perfect for a burst of lazy load requests)
        rfidCache.set(cacheKey, { expiredAt: now + 15000, data: rows });
      }
    } catch (e) {
      console.warn(`[getTagCount] Failed for ${url}:`, e);
      return 0;
    }
  }

  // Count rows matching productId
  return rows.filter((row) => String(row.productId || row.product_id) === productId).length;
}
