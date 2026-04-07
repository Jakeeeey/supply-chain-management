import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    const response = await fetch(
      `${DIRECTUS_URL}/items/product_images?filter[product_id][_eq]=${id}&sort=sort_order&fields=image_id,image,sort_order,isActive`,
      {
        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
<<<<<<< HEAD
      },
=======
      }
>>>>>>> 1b6130b (feat(sku): add multi-image gallery support and modal)
    );

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result.errors?.[0]?.message || "Failed to fetch gallery" },
<<<<<<< HEAD
        { status: response.status },
=======
        { status: response.status }
>>>>>>> 1b6130b (feat(sku): add multi-image gallery support and modal)
      );
    }

    return NextResponse.json(result);
<<<<<<< HEAD
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
=======
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
>>>>>>> 1b6130b (feat(sku): add multi-image gallery support and modal)
  }
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const { imageId } = await req.json();
    const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    const response = await fetch(`${DIRECTUS_URL}/items/product_images`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: parseInt(id),
        image: imageId,
        isActive: 1,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result.errors?.[0]?.message || "Failed to add to gallery" },
<<<<<<< HEAD
        { status: response.status },
=======
        { status: response.status }
>>>>>>> 1b6130b (feat(sku): add multi-image gallery support and modal)
      );
    }

    return NextResponse.json(result);
<<<<<<< HEAD
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
=======
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
>>>>>>> 1b6130b (feat(sku): add multi-image gallery support and modal)
  }
}
