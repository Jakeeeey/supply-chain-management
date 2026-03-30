"use client";

import React, { useState, useMemo } from "react";
import { Trash2, ScanLine, ChevronDown } from "lucide-react";
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
  discountTypes: any[];
  linePerDiscountType: any[];
  returnTypes: RTSReturnType[];
  onUpdateItem: (id: string, field: keyof CartItem, value: any) => void;
  onRemoveItem: (id: string) => void;
  remarks: string;
  setRemarks: (val: string) => void;
  readOnly?: boolean;
}

// Grouped structure for collapsible RFID rows
interface GroupedProduct {
  key: string;
  code: string;
  name: string;
  unit: string;
  returnTypeName: string;
  totalQty: number;
  totalGross: number;
  totalDiscount: number;
  totalNet: number;
  children: CartItem[];
}

export function ReturnReviewPanel({
  items,
  lineDiscounts,
  discountTypes,
  linePerDiscountType,
  returnTypes = [],
  onUpdateItem,
  onRemoveItem,
  remarks,
  setRemarks,
  readOnly = false,
}: ReturnReviewPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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

  // Helper to find discount name by ID or fallback
  const getDiscountName = (item: CartItem) => {
    if (item.discountTypeId) {
      const match = discountTypes.find((d) => d.id === item.discountTypeId);
      if (match) {
        return (
          match.discount_type_name ||
          match.discount_type ||
          match.name ||
          `Type ${match.id}`
        );
      }
    }
    const matchByValue = lineDiscounts.find(
      (d) => Math.abs(Number(d.percentage) / 100 - item.discount) < 0.0001
    );
    if (matchByValue) return matchByValue.line_discount;

    return `${(item.discount * 100).toFixed(4).replace(/\.?0+$/, "")}%`;
  };

  // Separate items into RFID (grouped) and Manual (flat)
  const rfidItems = useMemo(() => items.filter((i) => !!i.rfid_tag), [items]);
  const manualItems = useMemo(() => items.filter((i) => !i.rfid_tag), [items]);

  // Group RFID items by productId + unit + returnType
  const groupedRfidProducts = useMemo(() => {
    return rfidItems.reduce((acc, item) => {
      const returnTypeObj = returnTypes.find((r) => r.id === item.return_type_id);
      const rTypeName = returnTypeObj?.return_type_name || "Unassigned";
      const key = `${item.productId}-${item.unit}-${rTypeName}`;

      if (!acc[key]) {
        acc[key] = {
          key,
          code: item.code,
          name: item.name,
          unit: item.unit,
          returnTypeName: rTypeName,
          totalQty: 0,
          totalGross: 0,
          totalDiscount: 0,
          totalNet: 0,
          children: [],
        };
      }

      const unitPrice = item.customPrice || item.price;
      const rowGross = Math.round(unitPrice * item.quantity * 100) / 100;
      const rowDiscount = Math.round(rowGross * item.discount * 100) / 100;
      const rowNet = Math.round((rowGross - rowDiscount) * 100) / 100;

      acc[key].totalQty += item.quantity;
      acc[key].totalGross += rowGross;
      acc[key].totalDiscount += rowDiscount;
      acc[key].totalNet += rowNet;
      acc[key].children.push(item);

      return acc;
    }, {} as Record<string, GroupedProduct>);
  }, [rfidItems, returnTypes]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const colSpanCount = readOnly ? 10 : 11;

  const handleDiscountChange = (itemId: string, val: string) => {
    const selectedType = discountTypes.find((d) => d.id.toString() === val);
    if (selectedType) {
      onUpdateItem(itemId, "discountTypeId", selectedType.id);

      // Resolve percentage
      const junctions = linePerDiscountType.filter(
        (j) => String(j.type_id) === String(selectedType.id)
      );
      if (junctions.length > 0) {
        const lineDiscount = lineDiscounts.find(
          (ld) => String(ld.id) === String(junctions[0].line_id)
        );
        if (lineDiscount) {
          onUpdateItem(itemId, "discount", Number(lineDiscount.percentage) / 100);
        }
      } else {
        onUpdateItem(itemId, "discount", 0);
      }
    }
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
                  colSpan={colSpanCount}
                  className="h-32 text-center text-muted-foreground/50"
                >
                  No items selected.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {/* ═══════════════════════════════════════════════════════
                    1. MANUAL ITEMS (Flat rows — no RFID tag)
                    ═══════════════════════════════════════════════════════ */}
                {manualItems.map((item) => {
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
                        <span className="text-muted-foreground/30 text-xs">—</span>
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
                        {readOnly ? (
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

                      {/* DISCOUNT TYPE */}
                      <TableCell>
                        {readOnly ? (
                          <div className="text-center text-sm font-medium">
                            {getDiscountName(item)}
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <Select
                              value={
                                item.discountTypeId
                                  ? item.discountTypeId.toString()
                                  : ""
                              }
                              onValueChange={(val) => handleDiscountChange(item.id, val)}
                            >
                              <SelectTrigger className="h-8 w-full text-xs truncate">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent>
                                {discountTypes.map((d) => (
                                  <SelectItem key={d.id} value={d.id.toString()}>
                                  {d.discount_type_name ||
                                    d.discount_type ||
                                    d.name ||
                                    `Type ${d.id}`}
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
                })}

                {/* ═══════════════════════════════════════════════════════
                    2. RFID ITEMS (Collapsible grouped rows)
                    ═══════════════════════════════════════════════════════ */}
                {Object.values(groupedRfidProducts).map((group) => (
                  <React.Fragment key={group.key}>
                    {/* ── PARENT SUMMARY ROW ── */}
                    <TableRow className="bg-muted/10 font-semibold border-b border-border hover:bg-muted/20 transition-colors">
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.key)}
                            className="p-1 hover:bg-muted rounded-md transition-colors text-foreground"
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform duration-200 ${
                                expandedGroups[group.key] ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                          <span className="text-xs font-mono text-muted-foreground">
                            {group.code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-semibold uppercase tracking-wide">
                          <ScanLine className="h-3 w-3" />
                          {group.children.length} tag{group.children.length > 1 ? "s" : ""}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-sm text-foreground">
                        {group.name}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-wide">
                          {group.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm font-bold text-primary">
                        {group.totalQty}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        —
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        —
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono text-muted-foreground">
                        ₱{" "}
                        {group.totalDiscount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        {group.returnTypeName !== "Unassigned" ? (
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">
                            {group.returnTypeName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50 italic text-xs">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm text-primary">
                        ₱{" "}
                        {group.totalNet.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      {!readOnly && (
                        <TableCell className="text-center pr-4">
                          {/* Empty — delete is per-child */}
                        </TableCell>
                      )}
                    </TableRow>

                    {/* ── CHILD DETAIL ROWS (visible when expanded) ── */}
                    {expandedGroups[group.key] &&
                      group.children.map((item) => {
                        const unitPrice = item.customPrice || item.price;
                        const totalLineDiscount = (unitPrice * item.quantity) * item.discount;
                        const rowTotal = (unitPrice * item.quantity) - totalLineDiscount;

                        return (
                          <TableRow
                            key={item.id}
                            className="bg-muted/5 hover:bg-muted/15 border-b border-dashed transition-colors duration-200"
                          >
                            {/* Code — indented */}
                            <TableCell className="text-xs text-muted-foreground/50 font-mono pl-10">
                              {item.code}
                            </TableCell>
                            {/* RFID Tag */}
                            <TableCell>
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-mono">
                                <ScanLine className="h-3 w-3" />
                                {item.rfid_tag}
                              </span>
                            </TableCell>
                            {/* Product Name */}
                            <TableCell className="font-medium text-sm text-foreground/70">
                              {item.name}
                            </TableCell>
                            {/* Unit */}
                            <TableCell className="text-center">
                              <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-wide">
                                {item.unit}
                              </span>
                            </TableCell>
                            {/* Quantity */}
                            <TableCell className="text-center text-sm font-bold">
                              {item.quantity}
                            </TableCell>
                            {/* Unit Price */}
                            <TableCell className="text-right text-sm font-medium">
                              ₱{" "}
                              {unitPrice.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            {/* Discount Type */}
                            <TableCell>
                              {readOnly ? (
                                <div className="text-center text-sm font-medium">
                                  {getDiscountName(item)}
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                  <Select
                                    value={
                                      item.discountTypeId
                                        ? item.discountTypeId.toString()
                                        : ""
                                    }
                                    onValueChange={(val) => handleDiscountChange(item.id, val)}
                                  >
                                    <SelectTrigger className="h-8 w-full text-xs truncate">
                                      <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {discountTypes.map((d) => (
                                        <SelectItem key={d.id} value={d.id.toString()}>
                                          {d.discount_type_name ||
                                          d.discount_type ||
                                          d.name ||
                                          `Type ${d.id}`}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </TableCell>
                            {/* Discount Amount */}
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
                            {/* Return Type */}
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
                            {/* Total */}
                            <TableCell className="text-right font-bold text-sm">
                              ₱{" "}
                              {rowTotal.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            {/* Delete — only when Pending (not readOnly) */}
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
                      })}
                  </React.Fragment>
                ))}
              </>
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
