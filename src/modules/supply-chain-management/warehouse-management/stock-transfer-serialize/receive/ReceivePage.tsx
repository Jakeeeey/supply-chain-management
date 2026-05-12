'use client';

import React from 'react';
import { useSerializeReceive } from '../hooks/use-serialize-receive';
import { ReceiveSidebar } from './components/ReceiveSidebar';
import { ReceiveScanner } from './components/ReceiveScanner';
import { ReceiveAuditLog } from './components/ReceiveAuditLog';

export default function ReceivePage() {
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
    receiveOrder,
    recentScans,
    getBranchName,
  } = useSerializeReceive();

  return (
    <div className="flex h-full w-full flex-1 min-h-0 overflow-hidden bg-background">
      {/* ── Left Panel: Inbound Bay ── */}
      <ReceiveSidebar
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

      {/* ── Center Panel: Verification Bay ── */}
      <ReceiveScanner
        selectedGroup={selectedGroup}
        processing={processing}
        handleSerialInput={handleSerialInput}
        receiveOrder={receiveOrder}
      />

      {/* ── Right Panel: Audit Log ── */}
      <ReceiveAuditLog recentScans={recentScans} />
    </div>
  );
}