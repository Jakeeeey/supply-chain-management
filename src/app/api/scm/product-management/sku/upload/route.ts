import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    // Resolve target folder name from formData (default to sku_products)
    const targetFolderName = (formData.get("folder_name") as string) || "sku_products";
    formData.delete("folder_name");

    let folderId = "";

    // Find the folder by name
    const folderSearchRes = await fetch(
      `${DIRECTUS_URL}/folders?filter[name][_eq]=${targetFolderName}&fields=id`,
      {
        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      },
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
    // Copy all remaining fields from original formData
    for (const [key, value] of formData.entries()) {
      uploadFormData.append(key, value);
    }

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
        { status: response.status },
      );
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Upload Route Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
