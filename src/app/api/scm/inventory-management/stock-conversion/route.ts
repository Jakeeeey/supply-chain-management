import { NextRequest, NextResponse } from "next/server";
import { handleApiError, AppError } from "@/lib/error-handler";
import { fetchStockList, convertStock } from "@/modules/supply-chain-management/inventory-management/stock-conversion/services/stock-conversion";
import { stockConversionPayloadSchema } from "@/modules/supply-chain-management/inventory-management/stock-conversion/types/stock-conversion.schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const springToken = req.cookies.get('springboot_token')?.value;
    const authToken = req.cookies.get('auth_token')?.value;
    const authjsToken = req.cookies.get('authjs.session-token')?.value;
    const vosToken = req.cookies.get('vos_access_token')?.value;
    
    // Fallback token provided by user
    const PROVIDED_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4cmN0Z2Vuc2hyYmp1c3VudWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDU5OTc1NjIsImV4cCI6MjAyMTU3MzU2Mn0.f7n81JSXJmnVGvJRUUfbmElo5a9mx8rn6asxsRh8AYQ";
    
    // Token Priority System
    const isEncrypted = (t?: string) => t?.startsWith("eyJhbGciOiJkaXI") || t === "mock-jwt-token";
    
    let token = vosToken;
    let source = "vos_access_token";

    if (!token || isEncrypted(token)) {
        if (springToken && !isEncrypted(springToken)) {
            token = springToken;
            source = "springboot_token";
        } else if (authjsToken && !isEncrypted(authjsToken)) {
            token = authjsToken;
            source = "authjs.session-token";
        } else if (authToken && !isEncrypted(authToken)) {
            token = authToken;
            source = "auth_token";
        } else {
            token = PROVIDED_TOKEN;
            source = "PROVIDED_TOKEN (fallback)";
        }
    }
    
    console.log(`[Stock-Conversion API] Using token from source: ${source}`);
    
    const data = await fetchStockList(token);
    return NextResponse.json({ data });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = stockConversionPayloadSchema.parse(body);
    const result = await convertStock(validated);

    return NextResponse.json({ data: result });
  } catch (error: any) {
    return handleApiError(error);
  }
}
