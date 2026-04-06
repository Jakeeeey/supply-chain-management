import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// ─── In-Memory RFID Cache (60s TTL) ─────────────────────────────────────────
const rfidCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds

function getCachedRfid(key: string) {
  const entry = rfidCache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  rfidCache.delete(key);
  return null;
}

function setCachedRfid(key: string, data: any) {
  rfidCache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

// ─── GET: Fetch stock transfers + branches OR Lookup RFID ───────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const rfid = searchParams.get('rfid');

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const staticToken = process.env.DIRECTUS_STATIC_TOKEN;

  if (!baseUrl) {
    return NextResponse.json({ error: 'API Base URL is not defined' }, { status: 500 });
  }

  // Handle RFID lookup via Spring Boot v_rfid_onhand view
  if (action === 'lookup_rfid' && rfid) {
    const branchId = searchParams.get('branch_id') || '';
    const token = request.cookies.get('vos_access_token')?.value;
    const cacheKey = `rfid:${rfid}:${branchId}`;

    // ── 0. Check In-Memory Cache ──
    const cached = getCachedRfid(cacheKey);
    if (cached) return NextResponse.json(cached);



    const springApiUrl = process.env.SPRING_API_BASE_URL?.replace(/\/$/, '');

    // ── 2. SPRING BOOT API (Source of Truth for v_rfid_onhand) ──
    if (springApiUrl) {
      try {
        const targetUrl = new URL(`${springApiUrl}/api/view-rfid-onhand`);
        targetUrl.searchParams.set('rfid', rfid);
        if (branchId) targetUrl.searchParams.set('branchId', branchId);

        const headers: Record<string, string> = { Accept: 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const onHandRes = await fetch(targetUrl.toString(), {
          method: 'GET',
          headers,
          cache: 'no-store',
        });

        if (onHandRes.ok) {
          const payload = await onHandRes.json();
          const items = Array.isArray(payload) ? payload : [payload];
          const match = items.find((item: any) => item.rfid === rfid);

          if (match) {
            const productId = match.productId;
            const prodRes = await fetch(
              `${baseUrl}/items/products/${productId}?fields=product_id,product_name,barcode,product_code,cost_per_unit,price_per_unit`,
              {
                method: 'GET',
                headers: { Authorization: `Bearer ${staticToken}`, 'Content-Type': 'application/json' },
                cache: 'no-store',
              }
            );

            if (prodRes.ok) {
              const prodData = await prodRes.json();
              const product = prodData.data;
              const inventory = await getBranchInventory(match.branchId, token);
              const result = {
                rfid,
                productId: product.product_id,
                productName: product.product_name,
                barcode: product.barcode || product.product_code || String(product.product_id),
                unitPrice: product.price_per_unit || product.cost_per_unit || 0,
                branchId: match.branchId,
                qtyAvailable: inventory ? (inventory[product.product_id] || 0) : 0
              };
              setCachedRfid(cacheKey, result);
              return NextResponse.json(result);
            }
          }
        } else {
          console.warn(`[lookup_rfid] Spring Boot returned ${onHandRes.status}, fallback invoked`);
        }
      } catch (err) {
        console.warn('[lookup_rfid] Spring Boot unreachable, fallback invoked');
      }
    }

    // ── 3. DIRECTUS FALLBACK (Legacy Records) ──
    try {
      const rfidRes = await fetch(
        `${baseUrl}/items/purchase_order_receiving_items?filter[rfid_code][_eq]=${encodeURIComponent(rfid)}&fields=product_id,purchase_order_product_id`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${staticToken}`, 'Content-Type': 'application/json' },
          cache: 'no-store',
        }
      );

      if (rfidRes.ok) {
        const rfidData = await rfidRes.json();
        const match = rfidData.data?.[0];

        if (match) {
          const productId = match.product_id;
          const prodRes = await fetch(
            `${baseUrl}/items/products/${productId}?fields=product_id,product_name,barcode,product_code,cost_per_unit,price_per_unit`,
            {
              method: 'GET',
              headers: { Authorization: `Bearer ${staticToken}`, 'Content-Type': 'application/json' },
              cache: 'no-store',
            }
          );

          if (prodRes.ok) {
            const prodData = await prodRes.json();
            const product = prodData.data;
            const inventory = await getBranchInventory(branchId, token);
            const result = {
              rfid,
              productId: product.product_id,
              productName: product.product_name,
              barcode: product.barcode || product.product_code || String(product.product_id),
              unitPrice: product.price_per_unit || product.cost_per_unit || 0,
              qtyAvailable: inventory ? (inventory[product.product_id] || 0) : 0
            };
            setCachedRfid(cacheKey, result);
            return NextResponse.json(result);
          }
        }
      }
    } catch (error) {
      console.error('RFID Lookup Error (Directus fallback):', error);
    }

    // ── 4. NOT FOUND ──
    return NextResponse.json({ 
      error: 'RFID not found', 
      details: 'Not found in on-hand view (401/404) or receiving history.' 
    }, { status: 404 });
  } 
  
  // ─── NEW: Helper for Aggregate Inventory ───
  async function getBranchInventory(branchId: string, token?: string) {
    if (!branchId || !process.env.SPRING_API_BASE_URL) return null;
    const springBase = process.env.SPRING_API_BASE_URL.replace(/\/$/, '');
    
    async function tryFetch(url: string) {
      try {
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/json' } : { Accept: 'application/json' },
          cache: 'no-store'
        });
        if (res.ok) return await res.json();
      } catch (e) { console.warn(`[getBranchInventory] Fetch failed for ${url}`); }
      return null;
    }

    // Attempt 1: Standard endpoint
    const url1 = `${springBase}/api/view-rfid-onhand?branchId=${branchId}`;
    console.log(`[DEBUG] Fetching inventory: ${url1}`);
    let payload = await tryFetch(url1);
    
    // Attempt 2: Fallback to /all endpoint if first failed or returned empty/error
    if (!payload || (payload.error && payload.status === 404) || (Array.isArray(payload) && payload.length === 0)) {
      const url2 = `${springBase}/api/view-rfid-onhand/all?branchId=${branchId}`;
      console.log(`[DEBUG] Attempting fallback: ${url2}`);
      payload = await tryFetch(url2);
    }

    if (payload) {
      // Handle potential { data: [...] } wrapper or raw array
      const rows = Array.isArray(payload) ? payload : (payload.data && Array.isArray(payload.data) ? payload.data : null);
      console.log(`[DEBUG] Inventory rows found: ${rows?.length || 0}`);
      if (rows && rows.length > 0) {
        console.log(`[DEBUG] Sample Row:`, JSON.stringify(rows[0]));
      }
      if (!rows) return null;

      const counts: Record<any, number> = {};
      rows.forEach((row: any) => {
        const pid = row.productId || row.product_id || row.id;
        if (pid) {
          counts[pid] = (counts[pid] || 0) + 1;
        }
      });
      console.log(`[DEBUG] counts keys count: ${Object.keys(counts).length}`);
      return counts;
    }
    console.warn(`[DEBUG] No inventory found for branch ${branchId}`);
    return null;
  }

  if (action === 'debug_inventory') {
    const branchId = searchParams.get('branch_id') || '';
    const springBase = process.env.SPRING_API_BASE_URL;
    const token = request.cookies.get('vos_access_token')?.value;
    
    // Test fetch directly to capture error
    const debugInfo: any = { attempts: [] };
    if (springBase && token) {
       const url = `${springBase.replace(/\/$/, '')}/api/view-rfid-onhand?branchId=${branchId}`;
       try {
         const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
         debugInfo.attempts.push({ url, status: res.status, ok: res.ok });
         if (!res.ok) debugInfo.errorText = await res.text();
       } catch (e: any) { debugInfo.attempts.push({ url, error: e.message }); }
    }

    const inventory = await getBranchInventory(branchId, token);
    return NextResponse.json({ 
      branchId, 
      springBase: springBase || 'NOT_SET', 
      hasToken: !!token, 
      debugInfo,
      inventory 
    });
  }

  if (action === 'products') {
    try {
      const search = searchParams.get('search') || '';
      const branchId = searchParams.get('branch_id') || '';
      let prodUrl = `${baseUrl}/items/products?limit=-1&fields=product_id,product_name,barcode,product_code,cost_per_unit,price_per_unit,unit_of_measurement,unit_of_measurement_count,product_brand`;
      if (search) {
        prodUrl += `&filter[product_name][_icontains]=${encodeURIComponent(search)}`;
      }

      const token = request.cookies.get('vos_access_token')?.value;

      const [prodRes, unitRes, brandRes, inventory] = await Promise.all([
        fetch(prodUrl, { method: 'GET', headers: { Authorization: `Bearer ${staticToken}` }, cache: 'no-store' }),
        fetch(`${baseUrl}/items/units?limit=-1&fields=unit_id,unit_name,unit_shortcut`, { method: 'GET', headers: { Authorization: `Bearer ${staticToken}` }, cache: 'no-store' }),
        fetch(`${baseUrl}/items/brand?limit=-1&fields=brand_id,brand_name`, { method: 'GET', headers: { Authorization: `Bearer ${staticToken}` }, cache: 'no-store' }),
        branchId ? getBranchInventory(branchId, token) : Promise.resolve(null)
      ]);

      if (!prodRes.ok) throw new Error('Failed to fetch products');
      const prodData = await prodRes.json();
      const unitData = unitRes.ok ? await unitRes.json() : { data: [] };
      const brandData = brandRes.ok ? await brandRes.json() : { data: [] };

      // Map unit and brand IDs to objects so it behaves like the old nested objects
      const unitsMap = new Map(unitData.data?.map((u: any) => [u.unit_id, Object.assign({}, u)]));
      const brandsMap = new Map(brandData.data?.map((b: any) => [b.brand_id, Object.assign({}, b)]));

      const enrichedProducts = (prodData.data || []).map((p: any) => {
        const qty = inventory ? (inventory[p.product_id] || 0) : 0;
        if (p.product_name && p.product_name.includes('Pink Lava')) {
          console.log(`[DEBUG] Pink Lava Mapping: ID=${p.product_id}, Name=${p.product_name}, Qty=${qty}`);
        }
        return {
          ...p,
          unit_of_measurement: typeof p.unit_of_measurement === 'number' ? unitsMap.get(p.unit_of_measurement) : p.unit_of_measurement,
          product_brand: typeof p.product_brand === 'number' ? brandsMap.get(p.product_brand) : p.product_brand,
          qtyAvailable: qty / (p.unit_of_measurement_count || 1)
        };
      });

      return NextResponse.json({ data: enrichedProducts });
    } catch (error) {
      console.error('Products List Error:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
  }

  const statusFilter = searchParams.get('status');

  // Default: Fetch everything for the module
  try {
    const relationalFields = 'fields=*,product_id.product_id,product_id.product_name,product_id.description,product_id.barcode,product_id.unit_of_measurement_count,product_id.product_brand.brand_name,product_id.product_category.category_name,product_id.product_per_supplier.supplier_id.supplier_shortcut,product_id.unit_of_measurement.unit_id,product_id.unit_of_measurement.unit_name';
    
    // Correctly encode each status in the comma-separated list
    const encodedStatusFilter = statusFilter 
      ? statusFilter.split(',').map(s => encodeURIComponent(s.trim())).join(',')
      : '';
      
    const stockUrl = statusFilter 
      ? `${baseUrl}/items/stock_transfer?limit=-1&filter[status][_in]=${encodedStatusFilter}&${relationalFields}`
      : `${baseUrl}/items/stock_transfer?limit=-1&${relationalFields}`;

    console.log(`[API] Fetching from Directus: ${stockUrl}`);
    console.log(`[API] Token Present: ${!!staticToken}`);

    const [stockRes, branchRes] = await Promise.all([
      fetch(stockUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${staticToken}`, 'Content-Type': 'application/json' },
        cache: 'no-store',
      }),
      fetch(`${baseUrl}/items/branches?limit=-1`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${staticToken}`, 'Content-Type': 'application/json' },
        cache: 'no-store',
      }),
    ]);

    if (!stockRes.ok) {
      throw new Error(`Failed to fetch stock transfers: ${stockRes.statusText}`);
    }

    const stockData = await stockRes.json();
    const stockTransfers = stockData.data ?? [];
    console.log(`[API] Stock Transfer GET found ${stockTransfers.length} items for status: ${statusFilter || 'all'}`);

    // If we have transfers, fetch their associated DISPATCH RFIDs for validation in downstream modules (like Receive)
    if (stockTransfers.length > 0) {
      const ids = stockTransfers.map((st: any) => st.id);
      const rfidUrl = `${baseUrl}/items/stock_transfer_rfid?filter[stock_transfer_id][_in]=${ids.join(',')}&filter[scan_type][_eq]=DISPATCH&limit=-1`;
      
      try {
        const rfidRes = await fetch(rfidUrl, {
          method: 'GET',
          headers: { Authorization: `Bearer ${staticToken}` },
          cache: 'no-store'
        });
        
        if (rfidRes.ok) {
          const rfidData = await rfidRes.json();
          const rfidMap: Record<number, string[]> = {};
          
          (rfidData.data || []).forEach((r: any) => {
            if (!rfidMap[r.stock_transfer_id]) rfidMap[r.stock_transfer_id] = [];
            rfidMap[r.stock_transfer_id].push(r.rfid_tag);
          });
          
          // Attach the dispatched RFIDs to each item
          stockTransfers.forEach((st: any) => {
            st.dispatched_rfids = rfidMap[st.id] || [];
          });
        }
      } catch (err) {
        console.error('[API] Failed to fetch dispatched RFIDs:', err);
      }
    }

    let branchData = { data: [] };
    if (branchRes.ok) {
      branchData = await branchRes.json();
    }

    return NextResponse.json({
      stockTransfers: stockTransfers,
      branches: branchData.data ?? [],
    });
  } catch (error) {
    console.error('Stock Transfer GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── POST: Save a new stock transfer to Directus with status "Requested" ────────
export async function POST(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const staticToken = process.env.DIRECTUS_STATIC_TOKEN;

  if (!baseUrl) {
    return NextResponse.json({ error: 'API Base URL is not defined' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { sourceBranch, targetBranch, leadDate, scannedItems } = body;

    const now = new Date().toISOString();

    // Auto-generate a unique order number: ST-YYYYMMDDHHMMSS-{src}-{tgt}
    const datePart = now.replace(/[-:.TZ]/g, '').slice(0, 14);
    const orderNo = `ST-${datePart}-${sourceBranch ?? '0'}-${targetBranch ?? '0'}`;

    // Only save items that have an identified product (productId > 0)
    // Directus requires product_id to be non-null
    const validItems = ((scannedItems as Array<{
      rfid: string;
      productId: number;
      unitQty: number;
      unitPrice: number;
      totalAmount: number;
    }>) ?? []).filter((item) => item.productId && item.productId > 0);

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: 'No identified products to save. Scan RFID tags that match existing products first.' },
        { status: 400 }
      );
    }

    console.log(`[API] POSTing ${validItems.length} items for Order ${orderNo}`);
    validItems.forEach(item => {
      console.log(`  > Item: ${item.rfid}, Product: ${item.productId}, Qty: ${item.unitQty}, Amount: ${item.totalAmount}`);
    });

    // Build one Directus record per valid scanned item — all share the same order_no
    const payloads = validItems.map((item) => ({
      order_no: orderNo,
      source_branch: sourceBranch ? Number(sourceBranch) : null,
      target_branch: targetBranch ? Number(targetBranch) : null,
      lead_date: leadDate || null,
      product_id: item.productId,
      ordered_quantity: item.unitQty ?? 0,
      received_quantity: 0,
      amount: item.totalAmount ?? 0,
      status: 'Requested',
      remarks: item.rfid,
      date_requested: now,
      date_encoded: now,
    }));

    // POST each line item to Directus
    const results = await Promise.all(
      payloads.map((payload) =>
        fetch(`${baseUrl}/items/stock_transfer`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${staticToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }).then(async (res) => {
          if (!res.ok) {
            const err = await res.text();
            throw new Error(`Directus POST failed: ${err}`);
          }
          return res.json();
        })
      )
    );

    return NextResponse.json({ success: true, orderNo, data: results }, { status: 201 });
  } catch (error) {
    console.error('Stock Transfer POST Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ─── PATCH: Update stock transfer statuses (e.g. approved, dispatched, received) ────────
export async function PATCH(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const staticToken = process.env.DIRECTUS_STATIC_TOKEN;

  if (!baseUrl) {
    return NextResponse.json({ error: 'API Base URL is not defined' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { ids, status, rfids, scanType, items } = body; 

    if ((!Array.isArray(ids) || ids.length === 0) && (!Array.isArray(items) || items.length === 0)) {
      return NextResponse.json({ error: 'Missing required fields: ids array or items array' }, { status: 400 });
    }

    // 1. Update the status and properties of each selected stock transfer line item
    let results;
    if (Array.isArray(items) && items.length > 0) {
      // New format: [{ id, allocated_quantity, status }]
      results = await Promise.all(
        items.map(async (item: any) => {
            const patchPayload: Record<string, any> = { status: item.status };
            if (item.allocated_quantity !== undefined && item.allocated_quantity !== null) {
              patchPayload.allocated_quantity = Number(item.allocated_quantity);
            }
            
            return fetch(`${baseUrl}/items/stock_transfer/${item.id}`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${staticToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(patchPayload),
          }).then(async (res) => {
            if (!res.ok) {
              const err = await res.text();
              throw new Error(`Directus PATCH failed for ID ${item.id}: ${err}`);
            }
            return res.json();
          });
        })
      );
    } else {
      // Legacy format: ids array + status string
      results = await Promise.all(
        ids.map(async (id: number) => {
          return fetch(`${baseUrl}/items/stock_transfer/${id}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${staticToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              status: String(status)
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const err = await res.text();
              throw new Error(`Directus PATCH failed for ID ${id}: ${err}`);
            }
            return res.json();
          });
        })
      );
    }

    // 2. If RFIDs are provided, insert them into the new tracking table
    let rfidResults = null;
    if (Array.isArray(rfids) && rfids.length > 0 && scanType) {
      const rfidPayloads = rfids.map((r: any) => ({
         stock_transfer_id: r.stock_transfer_id,
         rfid_tag: String(r.rfid_tag).trim(),
         scan_type: scanType
      }));

      const rfidRes = await fetch(`${baseUrl}/items/stock_transfer_rfid`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staticToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rfidPayloads),
      });

      if (!rfidRes.ok) {
        const errText = await rfidRes.text();
        console.error('Failed to insert tracking RFIDs:', errText);
        // We do not throw here to avoid failing the entire transfer if only the RFID log fails, 
        // though typically you'd want a transaction.
      } else {
        rfidResults = await rfidRes.json();
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: Array.isArray(items) ? items.length : (Array.isArray(ids) ? ids.length : 0), 
      data: results,
      rfidTracking: rfidResults
    }, { status: 200 });
  } catch (error) {
    console.error('Stock Transfer PATCH Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
