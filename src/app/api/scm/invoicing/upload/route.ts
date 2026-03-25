import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "File is required" }, { status: 400 });
        }

        console.log(`[Upload API] Uploading file: ${file.name} (${file.size} bytes)`);

        const directusFormData = new FormData();
        // Directus expects 'file' field for the binary content
        directusFormData.append("file", file);
        // Optionally set title or other fields
        directusFormData.append("title", `Receipt Background - ${new Date().toISOString()}`);

        const response = await fetch(`${DIRECTUS_BASE}/files`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${DIRECTUS_TOKEN}`,
            },
            body: directusFormData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Upload API] Directus Error (${response.status}):`, errorText);
            
            try {
                const errorJson = JSON.parse(errorText);
                return NextResponse.json({ 
                    error: "Directus upload failed", 
                    details: errorJson.errors?.[0]?.message || errorText 
                }, { status: response.status });
            } catch {
                return NextResponse.json({ 
                    error: "Directus upload failed", 
                    details: errorText 
                }, { status: response.status });
            }
        }

        const data = await response.json();
        console.log(`[Upload API] Upload successful. File ID: ${data.data.id}`);
        
        return NextResponse.json({ id: data.data.id });

    } catch (err: any) {
        console.error("[Upload API] Catch Error:", err);
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
}
