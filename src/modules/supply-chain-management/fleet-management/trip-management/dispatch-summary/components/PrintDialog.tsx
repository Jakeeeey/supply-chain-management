"use client";

import * as React from "react";
import type { DispatchPlan } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Printer } from "lucide-react";
import { generateDispatchPdf } from "../utils/printPdf";

export default function PrintDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;

  visibleTablePlans: DispatchPlan[];

  uniqueDrivers: string[];
  uniqueSalesmen: string[];
  uniqueVehicles: string[];
  uniqueStatuses: string[];

  printDriver: string;
  setPrintDriver: (v: string) => void;
  printSalesman: string;
  setPrintSalesman: (v: string) => void;
  printVehicle: string;
  setPrintVehicle: (v: string) => void;
  printStatus: string;
  setPrintStatus: (v: string) => void;

  printDateRange: string;
  setPrintDateRange: (v: string) => void;
  printCustomStart: string;
  setPrintCustomStart: (v: string) => void;
  printCustomEnd: string;
  setPrintCustomEnd: (v: string) => void;
}) {
  function dataToPrint() {
    const rows = props.visibleTablePlans.filter((p) => {
      if (props.printDriver !== "All Drivers" && p.driverName !== props.printDriver) return false;
      if (props.printSalesman !== "All Salesmen" && p.salesmanName !== props.printSalesman) return false;
      if (props.printVehicle !== "All Vehicles" && p.vehiclePlateNo !== props.printVehicle) return false;
      if (props.printStatus !== "All Statuses (Full Matrix)" && p.status !== props.printStatus) return false;

      const planDate = new Date(p.createdAt);
      const now = new Date();

      if (props.printDateRange === "Today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return planDate >= today;
      }

      if (props.printDateRange === "This Week") {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return planDate >= startOfWeek;
      }

      if (props.printDateRange === "This Month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return planDate >= startOfMonth;
      }

      if (props.printDateRange === "Custom" && props.printCustomStart && props.printCustomEnd) {
        const start = new Date(props.printCustomStart);
        const end = new Date(props.printCustomEnd);
        end.setHours(23, 59, 59, 999);
        return planDate >= start && planDate <= end;
      }

      return true;
    });

    return rows;
  }

  function onPrint() {
    const rows = dataToPrint();
    generateDispatchPdf({
      title: "Active Dispatch Plans Report",
      generatedOn: new Date().toLocaleString(),
      filtersLine: `${props.printDriver}, ${props.printSalesman}, ${props.printStatus}`,
      rows,
    });
    props.onOpenChange(false);
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>What needs to be printed?</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Vehicle</Label>
            <Select value={props.printVehicle} onValueChange={props.setPrintVehicle}>
              <SelectTrigger>
                <SelectValue placeholder="All Vehicles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Vehicles">All Vehicles</SelectItem>
                {props.uniqueVehicles.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Salesman</Label>
            <Select value={props.printSalesman} onValueChange={props.setPrintSalesman}>
              <SelectTrigger>
                <SelectValue placeholder="All Salesmen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Salesmen">All Salesmen</SelectItem>
                {props.uniqueSalesmen.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Driver</Label>
            <Select value={props.printDriver} onValueChange={props.setPrintDriver}>
              <SelectTrigger>
                <SelectValue placeholder="All Drivers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Drivers">All Drivers</SelectItem>
                {props.uniqueDrivers.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={props.printStatus} onValueChange={props.setPrintStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses (Full Matrix)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Statuses (Full Matrix)">All Statuses (Full Matrix)</SelectItem>
                {props.uniqueStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">Date Range</Label>

          <div className="grid grid-cols-3 gap-2">
            {["Today", "This Week", "This Month"].map((r) => (
              <Button
                key={r}
                type="button"
                variant={props.printDateRange === r ? "secondary" : "outline"}
                onClick={() => props.setPrintDateRange(r)}
              >
                {r}
              </Button>
            ))}
          </div>

          <Button
            type="button"
            variant={props.printDateRange === "Custom" ? "secondary" : "outline"}
            onClick={() => props.setPrintDateRange("Custom")}
            className="w-full"
          >
            Custom
          </Button>

          {props.printDateRange === "Custom" && (
            <div className="flex items-center gap-2">
              <Input type="date" value={props.printCustomStart} onChange={(e) => props.setPrintCustomStart(e.target.value)} />
              <span className="text-muted-foreground">-</span>
              <Input type="date" value={props.printCustomEnd} onChange={(e) => props.setPrintCustomEnd(e.target.value)} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onPrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
