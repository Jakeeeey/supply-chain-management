import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await context.params;
        const directusUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://goatedcodoer:8091").replace(/\/$/, "");
        const directusToken = process.env.DIRECTUS_STATIC_TOKEN || "";

        // Get the header first to ensure it exists and to return its branch/product details if needed
        const headerUrl = `${directusUrl}/items/registered_rfid_header/${id}`;
        const headerRes = await fetch(headerUrl, {
            headers: { "Authorization": `Bearer ${directusToken}`, "Content-Type": "application/json" },
            cache: "no-store",
        });

        if (!headerRes.ok) {
            const errBody = await headerRes.text();
            console.error(`Header fetch failed: ${headerRes.status}`, errBody);
            return NextResponse.json({ ok: false, message: "Header not found" }, { status: 404 });
        }

        const headerData = (await headerRes.json()).data;
        const springBaseUrl = (process.env.SPRING_API_BASE_URL || "http://goatedcodoer:8083").replace(/\/$/, "");

        const fetchBranch = async () => {
            try {
                const bRes = await fetch(`${springBaseUrl}/api/branches`, {
                    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                    cache: "no-store"
                });
                if (bRes.ok) {
                    const bData = await bRes.json();
                    const b = Array.isArray(bData) ? bData.find((x: Record<string, unknown>) => x.id == headerData.branch_id || x.branch_id == headerData.branch_id || x.branchId == headerData.branch_id) : null;
                    if (b) headerData.branch = b;
                }
            } catch (e) { console.error(e); }
        };

        const fetchProductAndInventory = async () => {
            try {
                const pRes = await fetch(`${directusUrl}/items/products?filter[product_id][_eq]=${headerData.product_id}&fields=product_id,product_name,description,product_code,unit_of_measurement_count`, {
                    headers: { "Authorization": `Bearer ${directusToken}`, "Content-Type": "application/json" },
                    cache: "no-store",
                });
                if (pRes.ok) {
                    const pJson = await pRes.json();
                    const p = (pJson.data || [])[0];
                    if (p) headerData.product = p;
                    
                    let runningInventory = 0;
                    if (headerData.product_id && headerData.branch_id) {
                        const invRes = await fetch(`${springBaseUrl}/api/view-running-inventory-by-unit/all?branch_id=${headerData.branch_id}`, {
                            headers: { "Authorization": `Bearer ${token}` }
                        });
                        if (invRes.ok) {
                            const invData = await invRes.json();
                            const invItem = Array.isArray(invData) ? invData.find((item: Record<string, unknown>) => String(item.product_id) === String(headerData.product_id) || String(item.productId) === String(headerData.product_id)) : null;
                            runningInventory = invItem ? Number(invItem.running_inventory || invItem.runningInventory || 0) : 0;
                        }
                    }
                    headerData.running_inventory = runningInventory;
                }
            } catch (e) { 
                console.error("Error fetching running inventory:", e); 
                headerData.running_inventory = 0;
            }
        };

        const fetchListItems = async () => {
            const listUrl = `${directusUrl}/items/registered_rfid_list?filter[header_id][_eq]=${id}&limit=-1`;
            const listRes = await fetch(listUrl, {
                headers: { "Authorization": `Bearer ${directusToken}`, "Content-Type": "application/json" },
                cache: "no-store",
            });
            return listRes.ok ? ((await listRes.json()).data || []) : [];
        };

        const [, , listData] = await Promise.all([
            fetchBranch(),
            fetchProductAndInventory(),
            fetchListItems()
        ]);

        return NextResponse.json({ header: headerData, tags: listData });
    } catch (err) {
        console.error("Tags GET Error:", err);
        return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 502 });
    }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await context.params;
        const body = await request.json();
        const { rfid_tags } = body;

        if (!rfid_tags || rfid_tags.length === 0) {
            return NextResponse.json({ ok: false, message: "No tags provided" }, { status: 400 });
        }

        const directusUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://goatedcodoer:8091").replace(/\/$/, "");
        const directusToken = process.env.DIRECTUS_STATIC_TOKEN || "";

        // Verify the header is not posted yet!
        const headerRes = await fetch(`${directusUrl}/items/registered_rfid_header/${id}`, {
            headers: { "Authorization": `Bearer ${directusToken}`, "Content-Type": "application/json" },
        });

        if (!headerRes.ok) {
            return NextResponse.json({ ok: false, message: "Header not found" }, { status: 404 });
        }

        const headerData = (await headerRes.json()).data;
        if (headerData.posted_at) {
            return NextResponse.json({ ok: false, message: "Cannot append tags to a posted batch" }, { status: 403 });
        }

        const listPayload = rfid_tags.map((rfid: string) => ({
            header_id: parseInt(id),
            rfid: rfid
        }));

        const listRes = await fetch(`${directusUrl}/items/registered_rfid_list`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${directusToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(listPayload),
        });

        if (!listRes.ok) {
            const errStr = await listRes.text();
            console.error(`Directus append tags failed: ${listRes.status}`, errStr);
            return NextResponse.json({ ok: false, message: errStr }, { status: listRes.status });
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("Tags POST Error:", err);
        return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 502 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await context.params;
        const { searchParams } = new URL(request.url);
        const rfid = searchParams.get("rfid");

        if (!rfid) {
            return NextResponse.json({ ok: false, message: "No RFID provided" }, { status: 400 });
        }

        const directusUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://goatedcodoer:8091").replace(/\/$/, "");
        const directusToken = process.env.DIRECTUS_STATIC_TOKEN || "";

        // Verify the header is not posted yet!
        const headerRes = await fetch(`${directusUrl}/items/registered_rfid_header/${id}`, {
            headers: { "Authorization": `Bearer ${directusToken}`, "Content-Type": "application/json" },
        });

        if (!headerRes.ok) {
            return NextResponse.json({ ok: false, message: "Header not found" }, { status: 404 });
        }

        const headerData = (await headerRes.json()).data;
        if (headerData.posted_at) {
            return NextResponse.json({ ok: false, message: "Cannot remove tags from a posted batch" }, { status: 403 });
        }

        // Find the tag item id in the list
        const findRes = await fetch(`${directusUrl}/items/registered_rfid_list?filter[header_id][_eq]=${id}&filter[rfid][_eq]=${encodeURIComponent(rfid)}&fields=id`, {
            headers: { "Authorization": `Bearer ${directusToken}` },
        });

        if (!findRes.ok) {
            return NextResponse.json({ ok: false, message: "Failed to find tag" }, { status: 500 });
        }

        const findData = await findRes.json();
        if (!findData.data || findData.data.length === 0) {
            return NextResponse.json({ ok: false, message: "Tag not found in this batch" }, { status: 404 });
        }

        const tagItemId = findData.data[0].id;

        // Delete the tag
        const delRes = await fetch(`${directusUrl}/items/registered_rfid_list/${tagItemId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${directusToken}` },
        });

        if (!delRes.ok) {
            return NextResponse.json({ ok: false, message: "Failed to delete tag" }, { status: delRes.status });
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("Tags DELETE Error:", err);
        return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 502 });
    }
}

