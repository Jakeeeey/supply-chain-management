"use client";

import * as React from "react";
import { usePurchaseOrderModule } from "./hooks/usePurchaseOrderModule";
import { PurchaseOrderSummaryCards } from "./components/PurchaseOrderSummaryCards";
import { PurchaseOrderToolbar } from "./components/PurchaseOrderToolbar";
import { ReorderTriggersTable } from "./components/ReorderTriggersTable";
import { PurchaseRequestsHistoryTable } from "./components/PurchaseRequestsHistoryTable";
import { CreatePurchaseRequestDialog } from "./components/CreatePurchaseRequestDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReorderTriggerItem } from "./types";

export default function PurchaseOrderModule() {
  const {
    triggers,
    prs,
    branches,
    parts,
    loading,
    search,
    setSearch,
    selectedBranch,
    setSelectedBranch,
    metrics,
    refresh,
  } = usePurchaseOrderModule();

  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [selectedTrigger, setSelectedTrigger] = React.useState<ReorderTriggerItem | null>(null);

  const handleRequestReorder = (item: ReorderTriggerItem) => {
    setSelectedTrigger(item);
    setCreateModalOpen(true);
  };

  const handleOpenBlankModal = () => {
    setSelectedTrigger(null);
    setCreateModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* 1. KPI Summary Cards */}
      <PurchaseOrderSummaryCards
        totalDeficitItems={metrics.totalDeficitItems}
        criticalCount={metrics.criticalCount}
        estimatedReplenishmentCost={metrics.estimatedReplenishmentCost}
        pendingPrsCount={metrics.pendingPrsCount}
      />

      {/* 2. Toolbar */}
      <PurchaseOrderToolbar
        search={search}
        onSearchChange={setSearch}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        branches={branches}
        loading={loading}
        onRefresh={refresh}
        onOpenCreateModal={handleOpenBlankModal}
      />

      {/* 3. Tabs: Reorder Triggers (Low Stock) vs Purchase Requests */}
      <Tabs defaultValue="triggers" className="w-full space-y-3">
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
          <TabsTrigger value="triggers" className="text-xs">
            Low Stock Triggers ({triggers.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            Purchase Requests ({prs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="triggers" className="space-y-3 m-0">
          <ReorderTriggersTable
            items={triggers}
            loading={loading}
            onRequestReorder={handleRequestReorder}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-3 m-0">
          <PurchaseRequestsHistoryTable items={prs} loading={loading} />
        </TabsContent>
      </Tabs>

      {/* 4. Create PR Dialog */}
      <CreatePurchaseRequestDialog
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        branches={branches}
        parts={parts}
        initialTrigger={selectedTrigger}
        onSuccess={refresh}
      />
    </div>
  );
}
