"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCcw } from "lucide-react";
import { useSKUs } from "@/modules/supply-chain-management/product-management/sku-creation/hooks/useSKUs";
import { ApprovalTable } from "@/modules/supply-chain-management/product-management/sku-approval/components/data-table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";

export default function SKUApprovalPage() {
  const { 
    pendingApprovalData,
    pendingTotal,
    pendingPage,
    setPendingPage,
    pendingLimit,
    setPendingLimit,
    pendingSorting,
    setPendingSorting,
    setSearch,
    
    masterData,
    isLoading, 
    error, 
    refresh, 
    approveSKU,
    rejectSKU,
  } = useSKUs();
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePagination = useCallback(({ pageIndex, pageSize }: { pageIndex: number; pageSize: number }) => {
    setPendingPage(pageIndex);
    setPendingLimit(pageSize);
  }, [setPendingPage, setPendingLimit]);

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    setPendingPage(0);
  }, [setSearch, setPendingPage]);

  const handleApproveAndActivate = async (id: number | string) => {
    try {
      await approveSKU(id);
      toast.success("SKU Activated and Master Record Created");
    } catch (err: any) {
      toast.error("Activation failed: " + err.message);
    }
  };

  const handleReject = async (id: number | string) => {
    try {
      await rejectSKU(id);
      toast.success("Record returned to Draft status");
    } catch (err: any) {
      toast.error("Process failed: " + err.message);
    }
  };

  if (!mounted || (isLoading && !pendingApprovalData.length)) {
    return <ModuleSkeleton hasActions={false} rowCount={5} />;
  }

  if (error) {
    return (
      <ErrorPage 
        code="Connection Error"
        title="Approval Queue Unavailable"
        message={error}
        reset={refresh}
      />
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">SKU Approval Queue</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={isLoading}>
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <ApprovalTable 
          title="Items Pending Approval"
          data={pendingApprovalData} 
          totalCount={pendingTotal}
          pageIndex={pendingPage}
          pageSize={pendingLimit}
          onPaginationChange={handlePagination}
          sorting={pendingSorting}
          onSortingChange={setPendingSorting}
          onSearch={handleSearch}
          masterData={masterData}
          isLoading={isLoading} 
          onApprove={handleApproveAndActivate as any}
          onReject={handleReject as any}
          emptyTitle="Queue clear"
          emptyDescription="There are currently no items pending approval. All submitted SKUs have been processed."
        />
      </div>
    </div>
  );
}
