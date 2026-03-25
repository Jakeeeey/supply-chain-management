"use client";

import React from "react";
import { Trash2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { CartItem, LineDiscount, RTSReturnType } from "../types/rts.schema";

interface ReturnReviewPanelProps {
  items: CartItem[];
  lineDiscounts: LineDiscount[];
  returnTypes: RTSReturnType[];
  onUpdateItem: (id: string, field: keyof CartItem, value: number) => void;
  onRemoveItem: (id: string) => void;
  remarks: string;
  setRemarks: (val: string) => void;
  readOnly?: boolean;
}

export function ReturnReviewPanel({
  items,
  lineDiscounts,
  returnTypes = [],
  onUpdateItem,
  onRemoveItem,
  remarks,
  setRemarks,
  readOnly = false,
}: ReturnReviewPanelProps) {
  // Unified calculation: use the SAME per-row formula as the table rows,
  // rounding each row to 2 decimal places before accumulating.
  const { totalAmount, totalQuantity, totalDiscountAmount, grossAmount } =
    items.reduce(
      (acc, item) => {
        const unitPrice = item.customPrice || item.price;
        const rowGross = Math.round(unitPrice * item.quantity * 100) / 100;
        const rowDiscount = Math.round(rowGross * item.discount * 100) / 100;
        const rowNet = Math.round((rowGross - rowDiscount) * 100) / 100;

        acc.grossAmount += rowGross;
        acc.totalDiscountAmount += rowDiscount;
        acc.totalAmount += rowNet;
        acc.totalQuantity += item.quantity;
        return acc;
      },
      { totalAmount: 0, totalQuantity: 0, totalDiscountAmount: 0, grossAmount: 0 },
    );

  // Helper to find discount name by percentage
  const getDiscountName = (percentage: number) => {
    if (percentage === 0) return "0%";
    const match = lineDiscounts.find(
      (d) => (parseFloat(d.percentage) / 100) === percentage,
    );
    return match ? match.line_discount : `${(percentage * 100).toFixed(0)}%`; // Fallback to % if custom
  };

  return (
    <div className="space-y-8">
      {/* 1. TABLE SECTION */}
      <div className="rounded-md border overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50 border-b">
            <TableRow>
              <TableHead className="w-[100px] text-xs font-bold text-muted-foreground uppercase pl-4">
                Code
              </TableHead>
              <TableHead className="w-[120px] text-xs font-bold text-muted-foreground uppercase">
                RFID
              </TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground uppercase">
                Product Name
              </TableHead>
              <TableHead className="w-20 text-xs font-bold text-muted-foreground uppercase text-center">
                Unit
              </TableHead>
              <TableHead className="w-[100px] text-xs font-bold text-muted-foreground uppercase text-center">
                Quantity
              </TableHead>
              <TableHead className="w-[120px] text-xs font-bold text-muted-foreground uppercase text-right">
                Unit Price
              </TableHead>
              <TableHead className="w-40 text-xs font-bold text-muted-foreground uppercase text-center">
                Discount Type
              </TableHead>
              <TableHead className="w-[120px] text-xs font-bold text-muted-foreground uppercase text-right">
                Discount Amt
              </TableHead>
              <TableHead className="w-40 text-xs font-bold text-muted-foreground uppercase text-center">
                Return Type
              </TableHead>
              <TableHead className="w-[120px] text-xs font-bold text-muted-foreground uppercase text-right">
                Total
              </TableHead>
              {!readOnly && (
                <TableHead className="w-[60px] text-xs font-bold text-muted-foreground uppercase text-center pr-4">
                  Action
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={readOnly ? 10 : 11}
                  className="h-32 text-center text-muted-foreground/50"
                >
                  No items selected.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const unitPrice = item.customPrice || item.price;
                const totalLineDiscount = (unitPrice * item.quantity) * item.discount;
                const rowTotal = (unitPrice * item.quantity) - totalLineDiscount;

                return (
                  <TableRow
                    key={item.id}
                    className="hover:bg-muted/30 border-b last:border-0"
                  >
                    <TableCell className="text-xs text-muted-foreground font-mono pl-4">
                      {item.code}
                    </TableCell>
                    <TableCell>
                      {item.rfid_tag ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-mono">
                          <ScanLine className="h-3 w-3" />
                          {item.rfid_tag}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {item.name}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-wide">
                        {item.unit}
                      </span>
                    </TableCell>
                    <TableCell>
                      {readOnly || item.rfid_tag ? (
                        <div className="text-center text-sm font-bold">
                          {item.quantity}
                        </div>
                      ) : (
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            onUpdateItem(
                              item.id,
                              "quantity",
                              Math.max(1, parseFloat(e.target.value) || 0),
                            )
                          }
                          className="h-8 text-center"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      <div>
                        ₱{" "}
                        {unitPrice.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </TableCell>

                    {/* ✅ DISCOUNT TYPE COLUMN */}
                    <TableCell>
                      {readOnly ? (
                        <div className="text-center text-sm font-medium">
                          {getDiscountName(item.discount)}
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <Select
                            value={
                              lineDiscounts
                                .find(
                                  (d) => (Number(d.percentage) / 100) === item.discount,
                                )
                                ?.id.toString() || "custom"
                            }
                            onValueChange={(val) => {
                              if (val === "custom") {
                                // Custom logic if implemented
                              } else {
                                const selected = lineDiscounts.find(
                                  (d) => d.id.toString() === val,
                                );
                                if (selected)
                                  onUpdateItem(
                                    item.id,
                                    "discount",
                                    Number(selected.percentage) / 100,
                                  );
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 w-full text-xs truncate">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="custom">Custom</SelectItem>
                              {lineDiscounts.map((d) => (
                                <SelectItem key={d.id} value={d.id.toString()}>
                                  {d.line_discount}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-right text-sm font-medium">
                      {totalLineDiscount > 0 ? (
                        <span>
                          ₱{" "}
                          {totalLineDiscount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30">-</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {readOnly ? (
                        <div className="text-center text-sm">
                          {returnTypes.find((r) => r.id === item.return_type_id)
                            ?.return_type_name || "-"}
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <Select
                            value={
                              item.return_type_id
                                ? String(item.return_type_id)
                                : ""
                            }
                            onValueChange={(val: string) => {
                              onUpdateItem(
                                item.id,
                                "return_type_id",
                                Number(val),
                              );
                            }}
                          >
                            <SelectTrigger className="h-8 w-full text-xs truncate">
                              <SelectValue placeholder="Select Type" />
                            </SelectTrigger>
                            <SelectContent>
                              {returnTypes.map((r) => (
                                <SelectItem key={r.id} value={String(r.id)}>
                                  {r.return_type_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-bold text-sm">
                      ₱{" "}
                      {rowTotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    {!readOnly && (
                      <TableCell className="text-center pr-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveItem(item.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 2. REMARKS & SUMMARY SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3">
          <Label className="flex items-center gap-2 font-bold text-sm">
            Transaction Remarks
          </Label>
          <Textarea
            placeholder="Enter detailed reasons for this return (Optional)..."
            className="min-h-40 resize-none shadow-sm"
            value={remarks}
            onChange={(e) => !readOnly && setRemarks(e.target.value)}
            readOnly={readOnly}
          />
        </div>

        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl border p-6 shadow-sm h-full flex flex-col">
            <h4 className="font-bold text-xs uppercase mb-6 flex items-center gap-2 tracking-wider border-b pb-3">
              Return Summary
            </h4>
            <div className="space-y-4 text-sm flex-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Total Line Items</span>
                <span className="font-medium text-foreground">
                  {items.length}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total Quantity</span>
                <span className="font-medium text-foreground">
                  {totalQuantity} units
                </span>
              </div>
              <div className="border-t border-dashed my-4"></div>
              <div className="flex justify-between text-muted-foreground">
                <span>Gross Amount</span>
                <span className="font-medium text-foreground">
                  ₱{" "}
                  {grossAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between px-2 py-1 rounded bg-amber-500/10 text-amber-600">
                <span>Total Discount</span>
                <span className="font-medium">
                  - ₱{" "}
                  {totalDiscountAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div className="border-t mt-6 pt-4">
              <div className="flex justify-between items-end">
                <span className="font-bold text-muted-foreground uppercase text-xs mb-1">
                  Net Amount
                </span>
                <span className="font-extrabold text-3xl text-primary leading-none">
                  ₱{" "}
                  {totalAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
