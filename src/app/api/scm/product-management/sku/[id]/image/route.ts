import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const { main_image } = await req.json();

    const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    // Update the master product record in /items/products
    const response = await fetch(`${DIRECTUS_URL}/items/products/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ main_image }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Directus Image Update Error:", result);
      return NextResponse.json(
        { error: result.errors?.[0]?.message || "Update failed" },
        { status: response.status },
      );
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Image Route Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
