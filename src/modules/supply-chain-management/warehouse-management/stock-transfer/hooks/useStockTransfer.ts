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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAddProduct = useCallback((product: any) => {
    const productId = product.product_id || product.id;
    
    // If product already in list, just increment quantity
    const existing = scannedItems.find((item) => item.productId === productId);
    if (existing) {
      updateQty(existing.rfid, (existing.unitQty || 1) + 1);
      return;
    }

    // Generate a pseudo-RFID for manually added items
    const rfid = `MNL-${productId}-${Date.now().toString().slice(-4)}`;
    
    let extractedUnit = 'unit';
    if (typeof product.unit_of_measurement === 'object' && product.unit_of_measurement !== null) {
      extractedUnit = String(product.unit_of_measurement.unit_name || product.unit_of_measurement.name || 'unit');
    } else if (product.unit_of_measurement) {
      extractedUnit = String(product.unit_of_measurement);
    }

    const price = parseFloat(product.cost_per_unit || product.price_per_unit || product.estimated_unit_cost || 0);

    let extractedBrand = 'N/A';
    if (typeof product.product_brand === 'object' && product.product_brand !== null) {
      extractedBrand = String(product.product_brand.brand_name || 'N/A');
    } else if (product.product_brand) {
      extractedBrand = String(product.product_brand);
    }

    const newItem: ScannedItem = {
      rfid,
      productId,
      productName: product.product_name,
      description: product.barcode || 'Manual Entry',
      brandName: extractedBrand,
      unit: extractedUnit,
      qtyAvailable: 999, // Placeholder for manually added
      unitQty: 1, 
      unitPrice: price,
      totalAmount: price,
    };
    
    setScannedItems((prev) => [newItem, ...prev]);
  }, [scannedItems, updateQty]);

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
      setTransferStatus('For Approval');
      // Capture the generated order number
      if (json.orderNo) {
        setOrderNo(json.orderNo);
        setTransferStatus(`For Approval (Order: ${json.orderNo})`);
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
