import { NextResponse } from 'next/server';

// ─── GET: Fetch stock transfers + branches OR Lookup RFID ───────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const rfid = searchParams.get('rfid');

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const staticToken = process.env.DIRECTUS_STATIC_TOKEN;

  if (!baseUrl) {
    return NextResponse.json({ error: 'API Base URL is not defined' }, { status: 500 });
  }

  // Handle RFID lookup
  if (action === 'lookup_rfid' && rfid) {
    try {
      // 1. Search for the RFID in purchase_order_receiving_items
      const rfidRes = await fetch(
        `${baseUrl}/items/purchase_order_receiving_items?filter[rfid_code][_eq]=${encodeURIComponent(rfid)}&fields=product_id,purchase_order_product_id`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${staticToken}`, 'Content-Type': 'application/json' },
          cache: 'no-store',
        }
      );

      if (!rfidRes.ok) throw new Error('Failed to lookup RFID');
      const rfidData = await rfidRes.json();
      const match = rfidData.data?.[0];

      if (!match) {
        return NextResponse.json({ error: 'RFID not found in received records' }, { status: 404 });
      }

      const productId = match.product_id;

      // 2. Fetch product details
      const prodRes = await fetch(
        `${baseUrl}/items/products/${productId}?fields=product_id,product_name,barcode,product_code,cost_per_unit,price_per_unit`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${staticToken}`, 'Content-Type': 'application/json' },
          cache: 'no-store',
        }
      );

      if (!prodRes.ok) throw new Error('Failed to fetch product details');
      const prodData = await prodRes.json();
      const product = prodData.data;

      return NextResponse.json({
        rfid,
        productId: product.product_id,
        productName: product.product_name,
        barcode: product.barcode || product.product_code || String(product.product_id),
        unitPrice: product.price_per_unit || product.cost_per_unit || 0,
      });
    } catch (error) {
      console.error('RFID Lookup Error:', error);
      return NextResponse.json({ error: 'Failed to lookup RFID' }, { status: 500 });
    }
  }

  const statusFilter = searchParams.get('status');

  // Default: Fetch everything for the module
  try {
    const stockUrl = statusFilter 
      ? `${baseUrl}/items/stock_transfer?limit=-1&filter[status][_in]=${encodeURIComponent(statusFilter)},${encodeURIComponent(String(statusFilter).charAt(0).toUpperCase() + String(statusFilter).slice(1).toLowerCase())}`
      : `${baseUrl}/items/stock_transfer?limit=-1`;

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

    let branchData = { data: [] };
    if (branchRes.ok) {
      branchData = await branchRes.json();
    }

    return NextResponse.json({
      stockTransfers: stockData.data ?? [],
      branches: branchData.data ?? [],
    });
  } catch (error) {
    console.error('Stock Transfer GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── POST: Save a new stock transfer to Directus with status "requested" ────────
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
      status: 'requested',
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
    const { ids, status, rfids, scanType } = body; // rfids: Array<{ stock_transfer_id: number, rfid_tag: string }>

    if (!Array.isArray(ids) || ids.length === 0 || !status) {
      return NextResponse.json({ error: 'Missing required fields: ids array or status' }, { status: 400 });
    }

    // 1. Update the status of each selected stock transfer line item
    const results = await Promise.all(
      ids.map(async (id: number) => {
        return fetch(`${baseUrl}/items/stock_transfer/${id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${staticToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            // Enum values are strict: e.g. "For Picking", "For Loading", "Received"
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
      count: ids.length, 
      data: results,
      rfidTracking: rfidResults
    }, { status: 200 });
  } catch (error) {
    console.error('Stock Transfer PATCH Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
