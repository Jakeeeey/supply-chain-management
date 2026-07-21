import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized: Missing vos_access_token" }, { status: 401 });
    }

    try {
        const directusUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://goatedcodoer:8091").replace(/\/$/, "");
        const directusToken = process.env.DIRECTUS_STATIC_TOKEN || "";

        const headersUrl = `${directusUrl}/items/registered_rfid_header?sort=-created_at&limit=100`;
        const countUrl = `${directusUrl}/items/registered_rfid_list?aggregate[count]=id&groupBy[]=header_id`;

        const [headersRes, countRes] = await Promise.all([
            fetch(headersUrl, {
                method: "GET",
                headers: { "Authorization": `Bearer ${directusToken}`, "Content-Type": "application/json" },
                cache: "no-store",
            }),
            fetch(countUrl, {
                method: "GET",
                headers: { "Authorization": `Bearer ${directusToken}`, "Content-Type": "application/json" },
                cache: "no-store",
            })
        ]);

        if (!headersRes.ok) {
            console.error(`Directus Get RFID Headers Failed: ${headersRes.status}`);
            return NextResponse.json([], { status: headersRes.status });
        }

        const headersJson = await headersRes.json();
        let headersData = headersJson.data || [];

        if (countRes.ok) {
            const countJson = await countRes.json();
            const countData = countJson.data || [];
            
            // Map counts to headers
            headersData = headersData.map((header: Record<string, unknown>) => {
                const match = countData.find((c: Record<string, unknown>) => c.header_id === header.id);
                return {
                    ...header,
                    rfid_count: match && match.count && match.count.id ? parseInt(match.count.id) : 0
                };
            });
        }

        // --- Fetch and Map Products & Branches in Parallel ---
        const productIds = Array.from(new Set(headersData.map((h: Record<string, unknown>) => h.product_id).filter(Boolean)));
        const springBaseUrl = (process.env.SPRING_API_BASE_URL || "http://goatedcodoer:8083").replace(/\/$/, "");

        const fetchProducts = async () => {
            if (productIds.length === 0) return;
            const productsUrl = `${directusUrl}/items/products?filter[product_id][_in]=${productIds.join(",")}&fields=product_id,product_name,description,product_code`;
            try {
                const pRes = await fetch(productsUrl, {
                    method: "GET",
                    headers: { "Authorization": `Bearer ${directusToken}`, "Content-Type": "application/json" },
                    cache: "no-store",
                });
                if (pRes.ok) {
                    const pJson = await pRes.json();
                    const pData = pJson.data || [];
                    headersData = headersData.map((h: Record<string, unknown>) => {
                        const p = pData.find((x: Record<string, unknown>) => x.product_id == h.product_id);
                        if (p) h.product = p;
                        return h;
                    });
                }
            } catch (e) {
                console.error("Failed to fetch products to join", e);
            }
        };

        const fetchBranches = async () => {
            try {
                const bRes = await fetch(`${springBaseUrl}/api/branches`, {
                    method: "GET",
                    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                    cache: "no-store"
                });
                if (bRes.ok) {
                    const bData = await bRes.json();
                    headersData = headersData.map((h: Record<string, unknown>) => {
                        const b = Array.isArray(bData) ? bData.find((x: Record<string, unknown>) => x.id == h.branch_id || x.branch_id == h.branch_id || x.branchId == h.branch_id) : null;
                        if (b) h.branch = b;
                        return h;
                    });
                }
            } catch(e) {
                console.error("Failed to fetch branches to join", e);
            }
        };

        await Promise.all([fetchProducts(), fetchBranches()]);

        return NextResponse.json(headersData);
    } catch (err) {
        console.error("BFF Get RFID Headers Route Error:", err);
        return NextResponse.json([], { status: 502 });
    }
}

export async function POST(request: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized: Missing vos_access_token" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { branch_id, product_id, reference_no, rfid_tags } = body;

        const directusUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://goatedcodoer:8091").replace(/\/$/, "");
        const directusToken = process.env.DIRECTUS_STATIC_TOKEN || "";

        // 1. Create the Header
        const headerRes = await fetch(`${directusUrl}/items/registered_rfid_header`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${directusToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                branch_id,
                product_id,
                reference_no
            }),
        });

        if (!headerRes.ok) {
            const errBody = await headerRes.text();
            console.error(`Directus Create Header Failed: ${headerRes.status}`, errBody);
            return NextResponse.json({ ok: false, message: `Header creation failed: ${errBody}` }, { status: headerRes.status });
        }

        const headerData = await headerRes.json();
        const headerId = headerData.data.id;

        // 2. Create the List Items
        if (rfid_tags && rfid_tags.length > 0) {
            const listPayload = rfid_tags.map((rfid: string) => ({
                header_id: headerId,
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
                const listErr = await listRes.text();
                console.error(`Directus Create List Items Failed: ${listRes.status}`, listErr);
                return NextResponse.json({ ok: false, message: `Tags creation failed: ${listErr}` }, { status: listRes.status });
            }
        }

        return NextResponse.json(headerData.data);
    } catch (err) {
        console.error("BFF Create RFID Header Route Error:", err);
        return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 502 });
    }
}
