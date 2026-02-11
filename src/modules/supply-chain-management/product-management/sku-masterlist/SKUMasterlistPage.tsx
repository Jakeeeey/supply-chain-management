"use client";

import { useState, useEffect, useCallback } from "react";
import { useSKUMasterlist } from "./hooks/useSKUMasterlist";
import { MasterlistTable } from "./components/data-table";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";

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
    sorting,
    setSorting,
    masterData,
    isLoading, 
    error, 
    refresh, 
  } = useSKUMasterlist();
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePagination = useCallback(({ pageIndex, pageSize }: { pageIndex: number; pageSize: number }) => {
    setPage(pageIndex);
    setLimit(pageSize);
  }, [setPage, setLimit]);

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(0);
  }, [setSearch, setPage]);

  if (!mounted || (isLoading && !data.length)) {
    return <ModuleSkeleton hasActions={false} rowCount={8} />;
  }

  if (error) {
    return (
      <ErrorPage 
        code="Connection Error"
        title="Masterlist Unreachable"
        message={error}
        reset={refresh}
      />
    );
  }

  return (
    <div className="space-y-4">
     

        <MasterlistTable 
          title="Active Product Master Records"
          data={data} 
          totalCount={totalCount}
          pageIndex={page}
          pageSize={limit}
          onPaginationChange={handlePagination}
          sorting={sorting}
          onSortingChange={setSorting}
          masterData={masterData}
          isLoading={isLoading} 
          onSearch={handleSearch}
        />

    </div>
  );
}
