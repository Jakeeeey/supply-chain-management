'use client';

import { useState, useCallback, useEffect } from 'react';
import { StockTransfer, Branch, ScannedItem } from '../types';

interface UseStockTransferReturn {
  stockTransfers: StockTransfer[];
  branches: Branch[];
  loading: boolean;
  confirming: boolean;
  sourceBranch: string;
  setSourceBranch: (v: string) => void;
  targetBranch: string;
  setTargetBranch: (v: string) => void;
  leadDate: string;
  setLeadDate: (v: string) => void;
  rfidInput: string;
  setRfidInput: (v: string) => void;
  scannedItems: ScannedItem[];
  handleRfidScan: () => void;
  updateQty: (rfid: string, qty: number) => void;
  removeItem: (rfid: string) => void;
  reset: () => void;
  confirmTransfer: () => Promise<void>;
  isTransferConfirmed: boolean;
  orderNo: string;
  status: string;
}

/**
 * Derives a display name from a branch record.
 * Tries common field names used across the Directus schema.
 */
function getBranchLabel(b: Branch): string {
  return (
    (b.branch_name as string) ||
    (b.name as string) ||
    `Branch ${b.id}`
  );
}

/**
 * Simulates a product lookup from stock_transfer data using the RFID value.
 * In the real system the `remarks` field contains the RFID/batch code.
 */
function lookupProduct(rfid: string, transfers: StockTransfer[]): StockTransfer | undefined {
  const needle = rfid.trim().toLowerCase();
  return transfers.find(
    (t) => t.remarks?.toLowerCase() === needle || t.order_no?.toLowerCase() === needle
  );
}

export function useStockTransfer(): UseStockTransferReturn {
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const [sourceBranch, setSourceBranch] = useState('');
  const [targetBranch, setTargetBranch] = useState('');
  const [leadDate, setLeadDate] = useState('');
  const [rfidInput, setRfidInput] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isTransferConfirmed, setIsTransferConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [transferStatus, setTransferStatus] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/scm/warehouse-management/stock-transfer');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setStockTransfers(json.stockTransfers ?? []);
        setBranches(json.branches ?? []);
      } catch (err) {
        console.error('useStockTransfer fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleRfidScan = useCallback(() => {
    const rfid = rfidInput.trim();
    if (!rfid) return;

    // Prevent duplicate scans
    if (scannedItems.find((i) => i.rfid.toLowerCase() === rfid.toLowerCase())) {
      setRfidInput('');
      return;
    }

    const match = lookupProduct(rfid, stockTransfers);

    if (match) {
      const unitPrice =
        match.ordered_quantity > 0
          ? parseFloat((match.amount / match.ordered_quantity).toFixed(4))
          : 0;
      const newItem: ScannedItem = {
        rfid,
        productId: match.product_id,
        productName: `Product #${match.product_id}`,
        description: match.order_no,
        unit: 'box',
        qtyAvailable: match.ordered_quantity,
        unitQty: 0,
        unitPrice,
        totalAmount: 0,
      };
      setScannedItems((prev) => [...prev, newItem]);
    } else {
      // Unknown RFID — still add as a placeholder row so user can see it was scanned
      const newItem: ScannedItem = {
        rfid,
        productId: 0,
        productName: 'Unknown Product',
        description: '—',
        unit: '—',
        qtyAvailable: 0,
        unitQty: 0,
        unitPrice: 0,
        totalAmount: 0,
      };
      setScannedItems((prev) => [...prev, newItem]);
    }

    setRfidInput('');
  }, [rfidInput, scannedItems, stockTransfers]);

  const updateQty = useCallback((rfid: string, qty: number) => {
    setScannedItems((prev) =>
      prev.map((item) => {
        if (item.rfid !== rfid) return item;
        // Use the stored unit price so total calculates correctly even from qty=0
        const total = parseFloat((item.unitPrice * qty).toFixed(2));
        return { ...item, unitQty: qty, totalAmount: total };
      })
    );
  }, []);

  const removeItem = useCallback((rfid: string) => {
    setScannedItems((prev) => prev.filter((item) => item.rfid !== rfid));
  }, []);

  const reset = useCallback(() => {
    setSourceBranch('');
    setTargetBranch('');
    setLeadDate('');
    setRfidInput('');
    setScannedItems([]);
    setIsTransferConfirmed(false);
    setTransferStatus('');
  }, []);

  const confirmTransfer = useCallback(async () => {
    setConfirming(true);
    try {
      const res = await fetch('/api/scm/warehouse-management/stock-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceBranch, targetBranch, leadDate, scannedItems }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error ?? 'Failed to save transfer');
      }

      setIsTransferConfirmed(true);
      setTransferStatus('requested');
    } finally {
      setConfirming(false);
    }
  }, [sourceBranch, targetBranch, leadDate, scannedItems]);

  // Derive orderNo from the first successfully matched scanned item
  const firstMatch = scannedItems.length > 0
    ? stockTransfers.find((t) => t.remarks?.toLowerCase() === scannedItems[0].rfid.toLowerCase() || t.order_no?.toLowerCase() === scannedItems[0].rfid.toLowerCase())
    : undefined;

  return {
    stockTransfers,
    branches,
    loading,
    confirming,
    sourceBranch,
    setSourceBranch,
    targetBranch,
    setTargetBranch,
    leadDate,
    setLeadDate,
    rfidInput,
    setRfidInput,
    scannedItems,
    handleRfidScan,
    updateQty,
    removeItem,
    reset,
    confirmTransfer,
    isTransferConfirmed,
    orderNo: firstMatch?.order_no ?? '',
    status: transferStatus,
  };
}

export { getBranchLabel };
