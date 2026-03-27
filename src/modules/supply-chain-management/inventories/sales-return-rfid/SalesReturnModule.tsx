"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";

// Hooks & Components
import { useSalesReturnList } from "./hooks/useSalesReturnList";
import { SalesReturnHistory } from "./components/SalesReturnHistory";
import { CreateSalesReturnModal } from "./components/CreateSalesReturnModal";
import { UpdateSalesReturnModal } from "./components/UpdateSalesReturnModal";
import { useSearchParams } from "next/navigation";
import { SalesReturn } from "./type";

export default function SalesReturnModule() {
  const searchParams = useSearchParams();
  const fromClearance = searchParams.get("fromClearance");
  const editReturnNo = searchParams.get("editReturnNo");

  const {
    data,
    loading,
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
    setSearch,
    setFilters,
    filters,
    refresh,
    options,
  } = useSalesReturnList();

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<SalesReturn | null>(null);

  React.useEffect(() => {
    if (fromClearance === "true") {
      if (editReturnNo) {
        // If editing/linking, we should wait for data and find it
        setSearch(editReturnNo);
      } else {
        setCreateOpen(true);
      }
    }
  }, [fromClearance, editReturnNo]);

  // Auto-open selected return when data loads and editReturnNo is present
  React.useEffect(() => {
    if (editReturnNo && data.length > 0 && !selectedReturn) {
      const match = data.find(r => r.returnNo === editReturnNo);
      if (match) {
        setSelectedReturn(match);
      }
    }
  }, [data, editReturnNo, selectedReturn]);

  return (
    <div className="space-y-6 p-4 md:p-8 w-full bg-background min-h-screen animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold text-foreground tracking-tight">
            Sales Returns
          </h2>
          <p className="text-muted-foreground">Manage customer product returns</p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="h-10 px-6 font-semibold shadow-md transition-all active:scale-95"
        >
          <Plus className="h-5 w-5 mr-2" /> Add New
        </Button>
      </div>

      {/* TABLE & FILTERS */}
      {loading && data.length === 0 ? (
        <ModuleSkeleton rowCount={5} columnCount={7} />
      ) : (
        <SalesReturnHistory
          data={data}
          loading={loading}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          filters={filters}
          salesmenOptions={options.salesmen}
          customerOptions={options.customers}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearchChange={setSearch}
          onFilterChange={setFilters}
          onRowClick={(record) => setSelectedReturn(record)}
        />
      )}

      {/* MODALS */}
      <CreateSalesReturnModal
        isOpen={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={refresh}
      />

      {selectedReturn && (
        <UpdateSalesReturnModal
          returnId={selectedReturn.id}
          initialData={selectedReturn}
          onClose={() => setSelectedReturn(null)}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
