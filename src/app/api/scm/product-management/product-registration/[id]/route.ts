import { NextRequest, NextResponse } from "next/server";
import { productRegistrationService } from "@/modules/supply-chain-management/product-management/product-registration/services/product-registration.service";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export async function PATCH(req: NextRequest, { params }: { params: Params }): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await req.json();
    const type = req.nextUrl.searchParams.get("type");

    if (type === "image") {
      const data = await productRegistrationService.updateImage(id, body.main_image);
      return NextResponse.json({ data });
    }

    const data = await productRegistrationService.updateProduct(id, body);
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Product Registration PATCH [id] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
