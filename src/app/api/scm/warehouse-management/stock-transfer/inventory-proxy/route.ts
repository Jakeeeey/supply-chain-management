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
      
      if (productId) {
        const found = list.find((inv: Record<string, unknown>) => 
          String(inv.productId ?? inv.product_id) === productId
        );
        
        if (found) {
          const inventory = found.runningInventory ?? found.running_inventory;
          console.log(`[Proxy] Found aggregate inventory for product ${productId}: ${inventory}`);
          return NextResponse.json(data);
        }
      } else {
        // If no productId requested, return the full aggregate list of inventories directly
        console.log(`[Proxy] Returning full aggregate list of size: ${list.length}`);
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
    const branchId = searchParams.get('branchId') || searchParams.get('branch_id');
    const productId = searchParams.get('productId') || searchParams.get('product_id');

    if (branchId && springBase) {
      if (productId) {
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
      } else {
        // Bulk fallback: get full tag counts for all products in this branch
        console.log(`[Proxy] Falling back to bulk tag count for branch ${branchId}`);
        const allTags = await fetchBranchTags(branchId, token);
        if (allTags.length > 0) {
          const countsMap: Record<number, number> = {};
          allTags.forEach((row) => {
            const pId = Number(row.productId ?? row.product_id);
            if (!isNaN(pId)) {
              countsMap[pId] = (countsMap[pId] || 0) + 1;
            }
          });
          
          const bulkFallbackResult = Object.entries(countsMap).map(([pId, count]) => ({
            productId: Number(pId),
            branchId: Number(branchId),
            runningInventory: count,
            unitName: 'Pieces',
            _fallback: true
          }));
          return NextResponse.json({ data: bulkFallbackResult });
        }
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

/** Helper to fetch and cache all RFID tags in v_rfid_onhand for a branch */
async function fetchBranchTags(branchId: string, token?: string): Promise<Record<string, unknown>[]> {
  const springBase = process.env.SPRING_API_BASE_URL?.replace(/\/$/, '');
  if (!springBase) return [];

  const cacheKey = branchId; // We cache the entire branch's RFIDs
  const cached = rfidCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiredAt > now) {
    return cached.data;
  }

  // Fetch full branch inventory tags
  const url = `${springBase}/api/view-rfid-onhand?branch_id=${branchId}`;
  const urlFallback = `${springBase}/api/view-rfid-onhand?branchId=${branchId}`;
  
  try {
    // Try branch_id first
    let res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        ...(token ? { 
          'Authorization': `Bearer ${token}`,
          'Cookie': `vos_access_token=${token}`
        } : {}),
      },
      cache: 'no-store'
    });

    // If failed, try branchId
    if (!res.ok) {
      res = await fetch(urlFallback, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 
            'Authorization': `Bearer ${token}`,
            'Cookie': `vos_access_token=${token}`
          } : {}),
        },
        cache: 'no-store'
      });
    }

    if (res.ok) {
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (data.data || []);
      // Cache the result for 15 seconds (perfect for a burst of lazy load requests)
      rfidCache.set(cacheKey, { expiredAt: now + 15000, data: rows });
      return rows;
    }
  } catch (e) {
    console.warn(`[fetchBranchTags] Failed for ${url}:`, e);
  }
  return [];
}

/** Helper to count RFID tags in v_rfid_onhand for a specific product */
async function getTagCount(branchId: string, productId: string, token?: string) {
  const rows = await fetchBranchTags(branchId, token);
  return rows.filter((row) => String(row.productId || row.product_id) === productId).length;
}
