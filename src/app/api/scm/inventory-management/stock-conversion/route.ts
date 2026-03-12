import { NextRequest, NextResponse } from "next/server";
import { handleApiError, AppError } from "@/lib/error-handler";
import { fetchStockList, convertStock } from "@/modules/supply-chain-management/inventory-management/stock-conversion/services/stock-conversion";
import { stockConversionPayloadSchema } from "@/modules/supply-chain-management/inventory-management/stock-conversion/types/stock-conversion.schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const allCookies = req.cookies.getAll();
    
    const springToken = req.cookies.get('springboot_token')?.value;
    const authToken = req.cookies.get('auth_token')?.value;
    const authjsToken = req.cookies.get('authjs.session-token')?.value;
    const vosToken = req.cookies.get('vos_access_token')?.value;
    
    // Fallback token provided by user
    const PROVIDED_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4cmN0Z2Vuc2hyYmp1c3VudWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDU5OTc1NjIsImV4cCI6MjAyMTU3MzU2Mn0.f7n81JSXJmnVGvJRUUfbmElo5a9mx8rn6asxsRh8AYQ";
    
    // Token Priority System
    const isEncrypted = (t?: string) => t?.startsWith("eyJhbGciOiJkaXI") || t === "mock-jwt-token";
    
    let token = springToken;
    let source = "springboot_token";

    if (!token || isEncrypted(token)) {
        // Favor user identity from VOS over the manual anon key if it's a valid JWT
        if (vosToken && !isEncrypted(vosToken)) {
            token = vosToken;
        } else if (authjsToken && !isEncrypted(authjsToken)) {
            token = authjsToken;
        } else if (authToken && !isEncrypted(authToken)) {
            token = authToken;
        } else {
            token = PROVIDED_TOKEN;
        }
    }
    
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
