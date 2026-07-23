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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

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
        { error: `Unsupported file type: ${file.type}. Allowed: Images, PDF, Word` },
        { status: 400 }
      );
    }

    const targetFolderName = "stock_transfer_attachments";
    let folderId = "";

    // Find the folder by name
    const folderSearchRes = await fetch(
      `${DIRECTUS_URL}/folders?filter[name][_eq]=${targetFolderName}&fields=id`,
      {
        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      }
    );
    const folderSearch = await folderSearchRes.json();

    if (folderSearch.data && folderSearch.data.length > 0) {
      folderId = folderSearch.data[0].id;
    } else {
      // Create it if not found
      const createFolderRes = await fetch(`${DIRECTUS_URL}/folders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DIRECTUS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: targetFolderName }),
      });
      const createdFolder = await createFolderRes.json();
      folderId = createdFolder.data?.id;
    }

    // Rebuild FormData with folder FIRST, then file (Directus requires this order)
    const uploadFormData = new FormData();
    if (folderId) {
      uploadFormData.append("folder", folderId);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const blob = new Blob([buffer], { type: file.type });
    uploadFormData.append("file", blob, file.name);

    const response = await fetch(`${DIRECTUS_URL}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      },
      body: uploadFormData,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Directus Upload Error:", result);
      return NextResponse.json(
        { error: result.errors?.[0]?.message || "Upload failed" },
        { status: response.status }
      );
    }

    // Return the Directus file metadata (which contains .data.id as the UUID)
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Upload Route Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
