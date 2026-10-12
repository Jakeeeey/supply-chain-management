import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const DIRECTUS_FOLDER_ID = "fe219036-fca1-485e-8f95-4a5d3bedb5ef";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const rawBase = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
        const DIRECTUS_URL = rawBase.trim().replace(/\/$/, "");
        const DIRECTUS_TOKEN = (process.env.DIRECTUS_STATIC_TOKEN || process.env.DIRECTUS_TOKEN || "").trim();

        if (!DIRECTUS_URL || !DIRECTUS_TOKEN) {
            return NextResponse.json({ error: "Directus credentials not configured" }, { status: 500 });
        }

        const file = formData.get("file") as File | null;
        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate size
        if (file.size > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json(
                { error: `File size exceeds the 20MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)` },
                { status: 400 }
            );
        }

        // Validate type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: `Unsupported file type: ${file.type}. Allowed: Images (JPG, PNG, WEBP, GIF), PDF, Word (DOC, DOCX)` },
                { status: 400 }
            );
        }

        // Directus requires folder before file in FormData
        const uploadFormData = new FormData();
        uploadFormData.append("folder", DIRECTUS_FOLDER_ID);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const blob = new Blob([buffer], { type: file.type });
        uploadFormData.append("file", blob, file.name);

        const uploadRes = await fetch(`${DIRECTUS_URL}/files`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${DIRECTUS_TOKEN}`,
            },
            body: uploadFormData,
        });

        const uploadData = await uploadRes.json().catch(() => ({}));

        if (!uploadRes.ok) {
            const errorMsg = uploadData?.errors?.[0]?.message || uploadData?.error || "Directus file upload failed";
            return NextResponse.json({ error: errorMsg }, { status: uploadRes.status });
        }

        const uploadedFile = uploadData?.data;
        return NextResponse.json({
            data: {
                id: uploadedFile?.id,
                filename_download: uploadedFile?.filename_download || file.name,
                filesize: uploadedFile?.filesize ?? file.size,
                type: uploadedFile?.type || file.type,
            },
        });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: (err as Error).message || "An unexpected error occurred during file upload" },
            { status: 500 }
        );
    }
}
