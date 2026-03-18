"use client";

import React from "react";
import { useReturnLists } from "./hooks/useReturnLists";
import { ReturnToSupplierList } from "./components/ReturnToSupplierList";
import ErrorPage from "@/components/shared/ErrorPage";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";

/**
 * Module entry point for Return-to-Supplier.
 * Handles top-level loading, error, and data states using shared components.
 */
export default function ReturnToSupplierModule() {
  const { data, isLoading, error, refresh } = useReturnLists();

  if (error) {
    return (
      <ErrorPage
        title="Failed to load Return to Supplier"
        message={error}
        reset={refresh}
      />
    );
  }

  if (isLoading && data.length === 0) {
    return <ModuleSkeleton />;
  }

  return (
    <ReturnToSupplierList
      data={data}
      isLoading={isLoading}
      onRefresh={refresh}
    />
  );
}
