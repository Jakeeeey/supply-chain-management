"use client";

import * as React from "react";
import {
  CalendarDays,
  Info,
  Package,
  Users,
  UserCircle,
  Wrench,
} from "lucide-react";

import type { VehicleRow } from "../types";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

import DetailsTab from "./history/DetailsTab";
import TripsTab from "./history/TripsTab";
import PartsTab from "./history/PartsTab";
import DriversTab from "./history/DriversTab";
import CustodianTab from "./history/CustodianTab";
import JobOrdersTab from "./history/JobOrdersTab";

export function VehicleHistoryDialog({
  open,
  onOpenChange,
  vehicle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicle: VehicleRow | null;
}) {
  if (!vehicle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0">
        <div className="px-6 py-5">
          <div className="text-lg font-semibold">Vehicle History</div>
          <div className="text-sm text-muted-foreground">
            {vehicle.vehicleName} - {vehicle.plateNo}
          </div>
        </div>

        <div className="border-t px-6 py-3">
          <Tabs defaultValue="details">
            <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
              <TabsTrigger value="details" className="gap-2">
                <Info className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="trips" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Trips
              </TabsTrigger>
              <TabsTrigger value="parts" className="gap-2">
                <Package className="h-4 w-4" />
                Parts
              </TabsTrigger>
              <TabsTrigger value="drivers" className="gap-2">
                <Users className="h-4 w-4" />
                Drivers
              </TabsTrigger>
              <TabsTrigger value="custodian" className="gap-2">
                <UserCircle className="h-4 w-4" />
                Custodian
              </TabsTrigger>
              <TabsTrigger value="job_orders" className="gap-2">
                <Wrench className="h-4 w-4" />
                Job Orders
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <ScrollArea className="h-[520px] pr-2">
                <TabsContent value="details" className="mt-0">
                  <DetailsTab vehicle={vehicle} />
                </TabsContent>

                <TabsContent value="trips" className="mt-0">
                  <TripsTab />
                </TabsContent>

                <TabsContent value="parts" className="mt-0">
                  <PartsTab />
                </TabsContent>

                <TabsContent value="drivers" className="mt-0">
                  <DriversTab />
                </TabsContent>

                <TabsContent value="custodian" className="mt-0">
                  <CustodianTab />
                </TabsContent>

                <TabsContent value="job_orders" className="mt-0">
                  <JobOrdersTab />
                </TabsContent>
              </ScrollArea>
            </div>
          </Tabs>
        </div>

        <div className="border-t bg-muted/30 px-6 py-4">
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
