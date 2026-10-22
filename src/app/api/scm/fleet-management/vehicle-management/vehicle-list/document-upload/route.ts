import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, decodeJwtPayload } from "@/lib/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

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
    const vehicleIdStr = incoming.get("vehicle_id");
    const documentType = incoming.get("document_type") || "Other";
    const documentNo = incoming.get("document_no") || "";
    const issuedDate = incoming.get("issued_date") || null;
    const expiryDate = incoming.get("expiry_date") || null;
    const remarks = incoming.get("remarks") || "";

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
      return NextResponse.json(
        { error: "File too large. Maximum size is 10 MB." },
        { status: 413 }
      );
    }

    // Check duplicate document number across active vehicle documents
    const cleanDocNo = String(documentNo || "").trim();
    if (cleanDocNo) {
      try {
        const [checkRes, vehiclesRes] = await Promise.all([
          fetch(
            `${DIRECTUS_BASE}/items/vehicle_documents?limit=-1&fields=id,vehicle_id,document_no&filter[is_deleted][_neq]=1`,
            {
              cache: "no-store",
              headers: directusHeaders(),
            }
          ),
          fetch(`${DIRECTUS_BASE}/items/vehicles?limit=-1&fields=vehicle_id,vehicle_plate,name`, {
            cache: "no-store",
            headers: directusHeaders(),
          }).catch(() => null),
        ]);

        if (checkRes.ok) {
          const checkData = await checkRes.json();
          const docs = Array.isArray(checkData.data) ? checkData.data : [];
          const vehiclesData = vehiclesRes && vehiclesRes.ok ? await vehiclesRes.json().catch(() => ({ data: [] })) : { data: [] };
          const vehicleList = Array.isArray(vehiclesData.data) ? vehiclesData.data : [];

          const normalizedTarget = cleanDocNo.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

          const duplicate = docs.find((d: { id: number; vehicle_id?: number; document_no?: string }) => {
            const num = (d.document_no || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
            return num.length > 0 && num === normalizedTarget;
          });

          if (duplicate) {
            const v = vehicleList.find((item: { vehicle_id: number }) => Number(item.vehicle_id) === Number(duplicate.vehicle_id));
            const plateDisplay = v?.vehicle_plate ? `vehicle with plate '${v.vehicle_plate}'` : `vehicle #${duplicate.vehicle_id || "record"}`;
            return NextResponse.json(
              { error: `Document number '${cleanDocNo}' is already registered to ${plateDisplay}.` },
              { status: 409 }
            );
          }
        }
      } catch (checkErr) {
        console.warn("[Document Upload] Duplicate check warning:", checkErr);
      }
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
      const detail = await fileUploadRes
        .json()
        .catch(() => ({ message: "Directus file upload failed" }));
      return NextResponse.json(detail, { status: fileUploadRes.status });
    }

    const fileData = (await fileUploadRes.json()) as { data?: { id?: string } };
    const fileId = fileData?.data?.id;

    if (!fileId) {
      return NextResponse.json(
        { error: "File saved but no ID returned from storage." },
        { status: 500 }
      );
    }

    // 2. Link to vehicle_documents table
    let createdDocId: number | null = null;
    const vehicleId = vehicleIdStr ? parseInt(String(vehicleIdStr), 10) : null;

    if (vehicleId) {
      try {
        const docPayload = {
          vehicle_id: vehicleId,
          document_type: String(documentType),
          document_no: String(documentNo),
          issued_date: issuedDate ? String(issuedDate) : null,
          expiry_date: expiryDate ? String(expiryDate) : null,
          file_id: fileId,
          file_name: file.name,
          remarks: String(remarks),
          is_deleted: 0,
          uploaded_by: authedUserId,
          uploaded_at: new Date().toISOString(),
        };

        const docRes = await fetch(`${DIRECTUS_BASE}/items/vehicle_documents`, {
          method: "POST",
          headers: directusHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(docPayload),
        });

        if (docRes.ok) {
          const docJson = await docRes.json();
          createdDocId = docJson.data?.id ? Number(docJson.data.id) : null;
        } else {
          const errText = await docRes.text();
          console.warn("[Vehicle Document Upload] vehicle_documents insert failed:", errText);
        }
      } catch (err) {
        console.warn("[Vehicle Document Upload] Failed to create vehicle_documents record:", err);
      }
    }

    return NextResponse.json({
      file_id: fileId,
      file_name: file.name,
      document_id: createdDocId,
    });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json({ error: String(err?.message ?? e) }, { status: 500 });
  }
}
