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
  handleRfidScan: () => Promise<void>;
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
  const [orderNo, setOrderNo] = useState('');

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

  const handleRfidScan = useCallback(async () => {
    const rfid = rfidInput.trim();
    if (!rfid) return;

    // Prevent duplicate scans
    if (scannedItems.find((i) => i.rfid.toLowerCase() === rfid.toLowerCase())) {
      setRfidInput('');
      return;
    }

    setRfidInput(''); // Clear input immediately for better UX
    
    try {
      const res = await fetch(`/api/scm/warehouse-management/stock-transfer?action=lookup_rfid&rfid=${rfid}`);
      
      if (!res.ok) {
        // Unknown RFID (or server error) — still add as a placeholder row
        const newItem: ScannedItem = {
          rfid,
          productId: 0,
          productName: 'Unknown Product',
          description: 'Not found in received records',
          unit: '—',
          qtyAvailable: 0,
          unitQty: 0,
          unitPrice: 0,
          totalAmount: 0,
        };
        setScannedItems((prev) => [newItem, ...prev]);
        return;
      }

      const match = await res.json();

      const newItem: ScannedItem = {
        rfid,
        productId: match.productId,
        productName: match.productName,
        description: match.barcode,
        unit: 'box', // Default unit
        qtyAvailable: 1, // RFID represents 1 specific item
        unitQty: 1, // Default to 1 for convenience
        unitPrice: match.unitPrice,
        totalAmount: match.unitPrice,
      };
      setScannedItems((prev) => [newItem, ...prev]);
    } catch (err) {
      console.error('RFID Lookup failed:', err);
    }
  }, [rfidInput, scannedItems]);

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
    setOrderNo('');
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

      const json = await res.json();
      setIsTransferConfirmed(true);
      setTransferStatus('requested');
      // Capture the generated order number
      if (json.orderNo) {
        setOrderNo(json.orderNo);
        setTransferStatus(`requested (Order: ${json.orderNo})`);
      }
    } finally {
      setConfirming(false);
    }
  }, [sourceBranch, targetBranch, leadDate, scannedItems]);

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
    orderNo: orderNo,
    status: transferStatus,
  };
}

export { getBranchLabel };
