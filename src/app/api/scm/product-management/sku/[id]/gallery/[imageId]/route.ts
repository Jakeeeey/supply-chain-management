import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = Promise<{ id: string; imageId: string }>;

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  try {
    const { imageId } = await params;
    const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    const response = await fetch(`${DIRECTUS_URL}/items/product_images/${imageId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
    });

    if (!response.ok) {
      const result = await response.json();
      return NextResponse.json(
        { error: result.errors?.[0]?.message || "Failed to remove image from gallery" },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
