"use client";

import { useState, useEffect } from "react";
import { RefreshCcw } from "lucide-react";
import { useSKUMasterlist } from "./hooks/useSKUMasterlist";
import { MasterlistTable } from "./components/data-table/MasterlistTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SKUMasterlistModule() {
  const { 
    data,
    totalCount,
    page,
    setPage,
    limit,
    setLimit,
    search,
    setSearch,
    masterData,
    isLoading, 
    error, 
    refresh, 
  } = useSKUMasterlist();
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={isLoading}>
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <MasterlistTable 
          title="Active Product Master Records"
          data={data} 
          totalCount={totalCount}
          pageIndex={page}
          pageSize={limit}
          onPaginationChange={({ pageIndex, pageSize }: { pageIndex: number; pageSize: number }) => {
              setPage(pageIndex);
              setLimit(pageSize);
          }}
          masterData={masterData}
          isLoading={isLoading} 
          onSearch={(v: string) => {
            setSearch(v);
            setPage(0);
          }}
        />
      </div>
    </div>
  );
}
