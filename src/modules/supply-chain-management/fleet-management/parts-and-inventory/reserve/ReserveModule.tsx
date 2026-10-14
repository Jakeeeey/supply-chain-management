"use client";

import * as React from "react";
import { useReserveModule } from "./hooks/useReserveModule";
import type { IssuePartsInput } from "./types";
import { ReserveToolbar } from "./components/ReserveToolbar";
import { IssuedPartsTable } from "./components/IssuedPartsTable";
import { IssuePartsModal } from "./components/IssuePartsModal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function ReserveModule() {
  const {
    issuedParts,
    jobOrders,
    parts,
    branches,
    loading,
    saving,
    error,
    search,
    setSearch,
    selectedJoFilter,
    setSelectedJoFilter,
    reload,
    issueParts,
  } = useReserveModule();

  const [modalOpen, setModalOpen] = React.useState(false);

  const handleSaveIssuance = async (payload: IssuePartsInput) => {
    return await issueParts(payload);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Issue Parts to Job Order</h1>
        <p className="text-sm text-muted-foreground">
          Allocate and release spare parts directly to maintenance Job Orders with automatic inventory deduction.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ReserveToolbar
        search={search}
        onSearchChange={setSearch}
        selectedJoFilter={selectedJoFilter}
        onJoFilterChange={setSelectedJoFilter}
        jobOrders={jobOrders}
        onOpenIssueModal={() => setModalOpen(true)}
        onRefresh={reload}
        loading={loading}
      />

      <IssuedPartsTable items={issuedParts} loading={loading} />

      <IssuePartsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        jobOrders={jobOrders}
        parts={parts}
        branches={branches}
        saving={saving}
        onSave={handleSaveIssuance}
      />
    </div>
  );
}
