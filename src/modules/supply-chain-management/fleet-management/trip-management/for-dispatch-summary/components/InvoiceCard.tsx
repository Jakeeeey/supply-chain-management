"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { ForDispatchInvoice } from "../types/for-dispatch-summary.types";
import {
  formatCurrency,
  buildAddress,
} from "../services/for-dispatch-summary.helpers";

interface InvoiceCardProps {
  invoice: ForDispatchInvoice;
}

function getInvoiceStatusVariant(
  status: string,
): "secondary" | "outline" | "default" {
  switch (status) {
    case "Fulfilled":
      return "default";
    case "Not Fulfilled":
      return "outline";
    case "Fulfilled With Returns":
    case "Fulfilled With Concerns":
      return "secondary";
    default:
      return "outline";
  }
}

export function InvoiceCard({ invoice }: InvoiceCardProps) {
  const driverName =
    `${invoice.driverFirstName} ${invoice.driverLastName}`.trim() || "N/A";
  const address = buildAddress(invoice.brgy, invoice.city, invoice.province);

  return (
    <Card className="gap-0 rounded-md border border-border py-0">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1" className="border-b-0">
          {/* Main Details (Always Visible) */}
          <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]>div>svg]:rotate-180">
            <div className="flex w-full flex-col gap-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">
                  {invoice.invoiceNo || invoice.invoiceId}
                </span>
                <Badge variant={getInvoiceStatusVariant(invoice.invoiceStatus)}>
                  {invoice.invoiceStatus || "N/A"}
                </Badge>
              </div>

              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1.5 py-0.5 text-[10px] font-semibold"
                  >
                    {invoice.sequence}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Sequence
                  </span>
                </div>
              </div>

              <div className="mt-1">
                <p className="text-xs font-semibold text-foreground truncate">
                  {invoice.customerName}
                </p>
              </div>
            </div>
          </AccordionTrigger>

          {/* Accordion Content (Hidden by default) */}
          <AccordionContent className="px-4 pb-3 space-y-3">
            <Separator className="mb-3" />

            {/* Order ID */}
            {invoice.orderId && (
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Order ID
                </p>
                <p className="text-xs text-foreground">{invoice.orderId}</p>
              </div>
            )}

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Net Amount
                </p>
                <p className="text-xs font-semibold text-foreground">
                  {formatCurrency(invoice.netAmount)}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Total Amount
                </p>
                <p className="text-xs font-semibold text-foreground">
                  {formatCurrency(invoice.totalAmount)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Address */}
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Delivery Address
                </p>
                <p className="text-xs text-foreground leading-tight">
                  {address}
                </p>
              </div>
            </div>

            {/* Driver & Vehicle (Optional if header already has it, but kept for full card details) */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Driver
                </p>
                <p className="text-xs text-foreground truncate">
                  {driverName}
                </p>
              </div>
              {invoice.vehiclePlate && (
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Vehicle
                  </p>
                  <p className="text-xs text-foreground truncate">
                    {invoice.vehiclePlate}
                  </p>
                </div>
              )}
            </div>

            {/* Helpers */}
            {invoice.helperNames.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Helper(s)
                </p>
                {invoice.helperNames.map((name) => (
                  <p key={name} className="text-[10px] text-foreground truncate">
                    {name}
                  </p>
                ))}
              </div>
            )}
            
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
