"use client";

import { useState, useEffect } from "react";
import { RefreshCcw } from "lucide-react";
import { useSKUs } from "@/modules/supply-chain-management/product-management/sku-creation/hooks/useSKUs";
import { SKUTable } from "@/modules/supply-chain-management/product-management/sku-creation/components/data-table/SKUTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SKUApprovalPage() {
  const { 
    pendingApprovalData,
    pendingTotal,
    pendingPage,
    setPendingPage,
    pendingLimit,
    setPendingLimit,
    
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

  if (!mounted) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertTitle>System Connection Error</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-4">
              <Button onClick={refresh} variant="outline" size="sm">
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
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
        <SKUTable 
          title="Items Pending Approval"
          data={pendingApprovalData} 
          totalCount={pendingTotal}
          pageIndex={pendingPage}
          pageSize={pendingLimit}
          onPaginationChange={({ pageIndex, pageSize }) => {
              setPendingPage(pageIndex);
              setPendingLimit(pageSize);
          }}
          masterData={masterData}
          isLoading={isLoading} 
          onApprove={handleApproveAndActivate as any}
          onReject={handleReject as any}
          manualPagination={false}
        />
      </div>
    </div>
  );
}
