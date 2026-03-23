import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Allow large payloads (e.g., base64 background images)
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function directusHeaders() {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    return h;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: typeId } = await params;
        if (!typeId) {
            return NextResponse.json({ error: "Type ID is required" }, { status: 400 });
        }

        const res = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template?filter[sales_invoice_type_id][_eq]=${typeId}&limit=1`, {
            headers: directusHeaders()
        });
        
        if (!res.ok) {
            throw new Error(await res.text());
        }

        const data = await res.json();
        const templateRecord = data.data?.[0];

        if (!templateRecord || !templateRecord.template_config) {
            return NextResponse.json({ template_config: null });
        }

        return NextResponse.json({ template_config: templateRecord.template_config });
    } catch (err: any) {
        console.error("[Template API GET] Error:", err);
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: typeId } = await params;
        if (!typeId) {
            return NextResponse.json({ error: "Type ID is required" }, { status: 400 });
        }

        const body = await req.json();
        const { template_config } = body;

        if (!template_config) {
            return NextResponse.json({ error: "template_config is required" }, { status: 400 });
        }

        console.log(`[Template API PATCH] Saving template for Type ID: ${typeId}`);

        // 1. Check if a template for this type already exists
        const checkRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template?filter[sales_invoice_type_id][_eq]=${typeId}&limit=1`, {
            headers: directusHeaders()
        });
        
        let existingId = null;
        if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.data && checkData.data.length > 0) {
                existingId = checkData.data[0].id;
            }
        }

        let saveRes;
        if (existingId) {
            console.log(`[Template API PATCH] Updating existing record ID: ${existingId}`);
            // Update existing
            saveRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template/${existingId}`, {
                method: 'PATCH',
                headers: directusHeaders(),
                body: JSON.stringify({ template_config })
            });
        } else {
            console.log(`[Template API PATCH] Creating new record for type ${typeId}`);
            // Create new
            saveRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template`, {
                method: 'POST',
                headers: directusHeaders(),
                body: JSON.stringify({ 
                    sales_invoice_type_id: parseInt(typeId), 
                    template_config 
                })
            });
        }

        if (!saveRes.ok) {
            const errorText = await saveRes.text();
            console.error(`[Template API PATCH] Directus error (${saveRes.status}):`, errorText);
            
            // Try to parse as JSON for cleaner error
            try {
                const errorJson = JSON.parse(errorText);
                return NextResponse.json({ 
                    error: "Directus error", 
                    details: errorJson.errors || errorText 
                }, { status: saveRes.status });
            } catch {
                return NextResponse.json({ 
                    error: "Failed to save to Directus", 
                    details: errorText 
                }, { status: saveRes.status });
            }
        }

        const saveData = await saveRes.json();
        return NextResponse.json({ success: true, data: saveData.data });

    } catch (err: any) {
        console.error("[Template API PATCH] Uncaught Error:", err);
        return NextResponse.json({ 
            error: "Internal Server Error", 
            details: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }, { status: 500 });
    }
}
