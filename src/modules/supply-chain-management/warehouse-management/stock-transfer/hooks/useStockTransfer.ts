'use client';

import { useState, useCallback, useEffect } from 'react';
import { StockTransfer, Branch, ScannedItem } from '../types';

interface UseStockTransferReturn {
  stockTransfers: StockTransfer[];
  branches: Branch[];
  loading: boolean;
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
  reset: () => void;
  confirmTransfer: () => void;
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
      const newItem: ScannedItem = {
        rfid,
        productId: match.product_id,
        productName: `Product #${match.product_id}`,
        description: match.order_no,
        unit: 'box',
        qtyAvailable: match.ordered_quantity,
        unitQty: match.ordered_quantity,
        totalAmount: match.amount,
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
        unitQty: 1,
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
        // Recalculate total amount proportionally
        const unitCost = item.qtyAvailable > 0 ? item.totalAmount / item.unitQty : 0;
        return { ...item, unitQty: qty, totalAmount: parseFloat((unitCost * qty).toFixed(2)) };
      })
    );
  }, []);

  const reset = useCallback(() => {
    setSourceBranch('');
    setTargetBranch('');
    setLeadDate('');
    setRfidInput('');
    setScannedItems([]);
  }, []);

  const confirmTransfer = useCallback(() => {
    // Placeholder — wire real POST in future iteration
    console.log('Confirming transfer:', { sourceBranch, targetBranch, leadDate, scannedItems });
  }, [sourceBranch, targetBranch, leadDate, scannedItems]);

  // Derive orderNo and status from the first successfully matched scanned item
  const firstMatch = scannedItems.length > 0
    ? stockTransfers.find((t) => t.remarks?.toLowerCase() === scannedItems[0].rfid.toLowerCase() || t.order_no?.toLowerCase() === scannedItems[0].rfid.toLowerCase())
    : undefined;

  return {
    stockTransfers,
    branches,
    loading,
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
    reset,
    confirmTransfer,
    orderNo: firstMatch?.order_no ?? '',
    status: firstMatch?.status ?? '',
  };
}

export { getBranchLabel };
