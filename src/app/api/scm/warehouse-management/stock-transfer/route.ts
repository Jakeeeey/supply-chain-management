import { NextResponse } from 'next/server';

// ─── GET: Fetch stock transfers + branches ─────────────────────────────────────
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const staticToken = process.env.DIRECTUS_STATIC_TOKEN;

  if (!baseUrl) {
    return NextResponse.json({ error: 'API Base URL is not defined' }, { status: 500 });
  }

  try {
    const [stockRes, branchRes] = await Promise.all([
      fetch(`${baseUrl}/items/stock_transfer?limit=-1`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${staticToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }),
      fetch(`${baseUrl}/items/branches?limit=-1`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${staticToken}`,
          'Content-Type': 'application/json',
        },
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
