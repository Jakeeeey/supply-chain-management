//src/modules/vehicle-management/vehicle-list/components/VehicleHistoryDialog.tsx
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

import type { VehicleRow } from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/types";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import DetailsTab from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/components/history/DetailsTab";
import TripsTab from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/components/history/TripsTab";
import PartsTab from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/components/history/PartsTab";
import DriversTab from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/components/history/DriversTab";
import CustodianTab from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/components/history/CustodianTab";
import JobOrdersTab from "@/modules/supply-chain-management/fleet-management/vehicle-management/vehicle-list/components/history/JobOrdersTab";

function Trigger({
  value,
  icon: Icon,
  children,
}: {
  value: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "relative gap-2 rounded-none bg-transparent px-3 py-2 text-muted-foreground shadow-none",
        "data-[state=active]:text-foreground",
        "data-[state=active]:after:absolute data-[state=active]:after:left-0 data-[state=active]:after:right-0",
        "data-[state=active]:after:-bottom-[13px] data-[state=active]:after:h-[2px] data-[state=active]:after:bg-primary"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </TabsTrigger>
  );
}

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
      <DialogContent
        className="
          p-0 overflow-hidden
          w-[calc(100vw-24px)]
          md:w-[1000px]
          lg:w-[1100px]
          max-w-none
          sm:max-w-none
        "
      >
        {/* Header */}
        <div className="px-6 py-5">
          <div className="text-lg font-semibold">Vehicle History</div>
          <div className="text-sm text-muted-foreground">
            {vehicle.vehicleName} - {vehicle.plateNo}
          </div>
        </div>

        <div className="border-t">
          <Tabs defaultValue="details" className="w-full">
            {/* Tabs row */}
            <div className="border-b px-6 py-3">
              <TabsList className="h-auto w-full justify-start gap-2 bg-transparent p-0">
                <Trigger value="details" icon={Info}>
                  Details
                </Trigger>
                <Trigger value="trips" icon={CalendarDays}>
                  Trips
                </Trigger>
                <Trigger value="parts" icon={Package}>
                  Parts
                </Trigger>
                <Trigger value="drivers" icon={Users}>
                  Drivers
                </Trigger>
                <Trigger value="custodian" icon={UserCircle}>
                  Custodian
                </Trigger>
                <Trigger value="job_orders" icon={Wrench}>
                  Job Orders
                </Trigger>
              </TabsList>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <ScrollArea className="h-[calc(80vh-200px)] pr-3">
                <div className="w-full">
                  <TabsContent value="details" className="mt-0">
                    <DetailsTab vehicle={vehicle} />
                  </TabsContent>

                  <TabsContent value="trips" className="mt-0">
                    <TripsTab vehicle={vehicle} />
                  </TabsContent>

                  <TabsContent value="parts" className="mt-0">
                    <PartsTab vehicle={vehicle} />
                  </TabsContent>

                  <TabsContent value="drivers" className="mt-0">
                    <DriversTab vehicle={vehicle} />
                  </TabsContent>

                  <TabsContent value="custodian" className="mt-0">
                    <CustodianTab vehicle={vehicle} />
                  </TabsContent>

                  <TabsContent value="job_orders" className="mt-0">
                    <JobOrdersTab />
                  </TabsContent>
                </div>
              </ScrollArea>
            </div>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-6 py-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
