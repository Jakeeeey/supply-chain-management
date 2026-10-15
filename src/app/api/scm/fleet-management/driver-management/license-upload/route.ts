import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, decodeJwtPayload } from "@/lib/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);

function directusHeaders(extra: Record<string, string> = {}) {
    const h: Record<string, string> = { ...extra };
    if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    return h;
}

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get(COOKIE_NAME)?.value;
        let authedUserId: number | null = null;
        if (token) {
            const payload = decodeJwtPayload(token);
            if (payload && payload.sub) {
                authedUserId = parseInt(String(payload.sub), 10) || null;
            }
        }

        const incoming = await req.formData();
        const file = incoming.get("file");
        const userIdStr = incoming.get("user_id");
        const recordName = incoming.get("record_name") || "Driver's License";
        const description = incoming.get("description") || "Scanned Driver License";

        if (!(file instanceof File)) {
            return NextResponse.json({ error: "File is required" }, { status: 400 });
        }

        const mime = String(file.type || "").toLowerCase();
        if (!ALLOWED_TYPES.has(mime)) {
            return NextResponse.json(
                { error: "Invalid file type. Allowed: JPG, PNG, WEBP, HEIC, PDF." },
                { status: 400 }
            );
        }

        if (typeof file.size === "number" && file.size > MAX_BYTES) {
            return NextResponse.json({ error: "File too large. Maximum size is 10 MB." }, { status: 413 });
        }

        // 1. Upload file to Directus /files
        const directusForm = new FormData();
        directusForm.append("file", file);

        const fileUploadRes = await fetch(`${DIRECTUS_BASE}/files`, {
            method: "POST",
            headers: directusHeaders(),
            body: directusForm,
        });

        if (!fileUploadRes.ok) {
            const detail = await fileUploadRes.json().catch(() => ({ message: "Directus file upload failed" }));
            return NextResponse.json(detail, { status: fileUploadRes.status });
        }

        const fileData = (await fileUploadRes.json()) as { data?: { id?: string } };
        const fileId = fileData?.data?.id;

        if (!fileId) {
            return NextResponse.json({ error: "File saved but no ID returned from storage." }, { status: 500 });
        }

        // 2. Link to employee_file_records (Document Management)
        let createdRecordId: number | null = null;
        const targetUserId = userIdStr ? parseInt(String(userIdStr), 10) : authedUserId;

        if (targetUserId) {
            try {
                // Check if employee_file_record_list has a driver license category or fallback to 1
                let listId = 1;
                try {
                    const listCheckRes = await fetch(
                        `${DIRECTUS_BASE}/items/employee_file_record_list?limit=1&filter[title][_icontains]=License`,
                        { headers: directusHeaders(), cache: "no-store" }
                    );
                    if (listCheckRes.ok) {
                        const listJson = await listCheckRes.json();
                        if (listJson.data && listJson.data.length > 0 && listJson.data[0].id) {
                            listId = listJson.data[0].id;
                        }
                    }
                } catch {
                    listId = 1;
                }

                let validCreatedBy: number | null = null;
                if (authedUserId) {
                    try {
                        const userCheck = await fetch(`${DIRECTUS_BASE}/items/user?filter[user_id][_eq]=${authedUserId}&limit=1&fields=user_id`, {
                            headers: directusHeaders(),
                            cache: "no-store",
                        });
                        if (userCheck.ok) {
                            const uJson = await userCheck.json();
                            if (Array.isArray(uJson.data) && uJson.data.length > 0) {
                                validCreatedBy = authedUserId;
                            }
                        }
                    } catch {
                        validCreatedBy = null;
                    }
                }

                const docRecordPayload = {
                    user_id: targetUserId,
                    list_id: listId,
                    record_name: String(recordName),
                    description: String(description),
                    file_ref: fileId,
                    created_by: validCreatedBy,
                    is_deleted: 0,
                };

                const docRes = await fetch(`${DIRECTUS_BASE}/items/employee_file_records`, {
                    method: "POST",
                    headers: directusHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify(docRecordPayload),
                });

                if (docRes.ok) {
                    const docJson = await docRes.json();
                    createdRecordId = docJson.data?.id ? Number(docJson.data.id) : null;
                } else {
                    const errText = await docRes.text();
                    console.warn("[Driver License Upload] employee_file_records insert failed:", errText);
                }
            } catch (err) {
                console.warn("[Driver License Upload] Failed to create employee_file_records entry:", err);
            }
        }

        return NextResponse.json({
            file_id: fileId,
            record_id: createdRecordId,
        });
    } catch (e: unknown) {
        const err = e as Error;
        return NextResponse.json({ error: String(err?.message ?? e) }, { status: 500 });
    }
}
