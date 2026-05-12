'use client';

import React from 'react';
import { useSerializeDispatch } from '../hooks/use-serialize-dispatch';
import { DispatchSidebar } from './components/DispatchSidebar';
import { DispatchScanner } from './components/DispatchScanner';
import { DispatchAuditLog } from './components/DispatchAuditLog';

export default function DispatchingPage() {
  const {
    orderGroups,
    selectedGroup,
    selectedOrderNo,
    setSelectedOrderNo,
    loading,
    processing,
    searchQuery,
    setSearchQuery,
    loadMore,
    hasMore,
    handleSerialInput,
    dispatchOrder,
    recentScans,
    getBranchName,
  } = useSerializeDispatch();

  return (
    <div className="flex h-full w-full flex-1 min-h-0 overflow-hidden bg-background">
      {/* ── Left Panel: Order Navigator ── */}
      <DispatchSidebar
        orderGroups={orderGroups}
        selectedOrderNo={selectedOrderNo}
        setSelectedOrderNo={setSelectedOrderNo}
        loading={loading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        loadMore={loadMore}
        hasMore={hasMore}
        getBranchName={getBranchName}
      />

      {/* ── Center Panel: Scanning Bay ── */}
      <DispatchScanner
        selectedGroup={selectedGroup}
        processing={processing}
        handleSerialInput={handleSerialInput}
        dispatchOrder={dispatchOrder}
      />

      {/* ── Right Panel: Audit Log ── */}
      <DispatchAuditLog recentScans={recentScans} />
    </div>
  );
}