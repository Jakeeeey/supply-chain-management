import { NextRequest, NextResponse } from "next/server";
import { productRegistrationService } from "@/modules/supply-chain-management/product-management/product-registration/services/product-registration.service";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export async function PATCH(req: NextRequest, { params }: { params: Params }): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await req.json();
    const type = req.nextUrl.searchParams.get("type");

    const token = req.cookies.get("vos_access_token")?.value;
    let userId: string | number | undefined = undefined;
    if (token) {
      try {
        const parts = token.split(".");
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
          userId = payload.user_id ?? payload.userId ?? payload.id ?? payload.sub;
        }
      } catch (e) {
        console.warn("Failed to decode token", e);
      }
    }

    if (userId) {
      body.updated_by = userId;
    }

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
