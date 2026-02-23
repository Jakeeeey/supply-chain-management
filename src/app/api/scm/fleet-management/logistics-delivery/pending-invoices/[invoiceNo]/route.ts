import { NextResponse } from "next/server";
import { fetchInvoiceDetails } from "../logic";

export async function GET(_: Request, ctx: { params: Promise<{ invoiceNo: string }> }) {
  const { invoiceNo } = await ctx.params;

  const details = await fetchInvoiceDetails(invoiceNo);
  if (!details) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  return NextResponse.json(details);
}
