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
  scannedItems: ScannedItem[];
  handleAddProduct: (product: any) => void;
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

  const handleAddProduct = useCallback((product: any) => {
    // Generate a pseudo-RFID for manually added items
    const rfid = `MNL-${product.product_id || product.id || Date.now()}-${Date.now().toString().slice(-4)}`;
    
    // Prevent duplicate manual adds if they share the exact pseudo-rfid
    if (scannedItems.find((i) => i.rfid === rfid)) return;

    let extractedUnit = 'unit';
    if (typeof product.unit_of_measurement === 'object' && product.unit_of_measurement !== null) {
      extractedUnit = String(product.unit_of_measurement.unit_name || product.unit_of_measurement.name || 'unit');
    } else if (product.unit_of_measurement) {
      extractedUnit = String(product.unit_of_measurement);
    }

    const price = parseFloat(product.price_per_unit || product.cost_per_unit || product.estimated_unit_cost || 0);

    const newItem: ScannedItem = {
      rfid,
      productId: product.product_id || product.id,
      productName: product.product_name,
      description: product.barcode || 'Manual Entry',
      unit: extractedUnit,
      qtyAvailable: 999, // Placeholder for manually added
      unitQty: 1, 
      unitPrice: price,
      totalAmount: price,
    };
    
    setScannedItems((prev) => [newItem, ...prev]);
  }, [scannedItems]);

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
    scannedItems,
    handleAddProduct,
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
