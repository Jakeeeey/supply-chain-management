'use client';

import { useState, useCallback, useEffect } from 'react';
import { stockTransferLifecycleService } from '../../services/stock-transfer.lifecycle';
import type { 
  StockTransferRow, 
  BranchRow, 
  ScannedItem,
  EnrichedProduct
} from '../../types/stock-transfer.types';
import { toast } from 'sonner';

interface UseStockTransferRequestReturn {
  stockTransfers: StockTransferRow[];
  branches: BranchRow[];
  loading: boolean;
  confirming: boolean;
  sourceBranch: string;
  setSourceBranch: (v: string) => void;
  targetBranch: string;
  setTargetBranch: (v: string) => void;
  leadDate: string;
  setLeadDate: (v: string) => void;
  scannedItems: ScannedItem[];
  handleAddProduct: (product: EnrichedProduct) => void;
  updateQty: (rfid: string, qty: number) => void;
  removeItem: (rfid: string) => void;
  reset: () => void;
  confirmTransfer: () => Promise<void>;
  isTransferConfirmed: boolean;
  orderNo: string;
  status: string;
}

/**
 * Hook for managing the "Stock Transfer Request" phase (Creation).
 */
export function useStockTransferRequest(): UseStockTransferRequestReturn {
  const [stockTransfers, setStockTransfers] = useState<StockTransferRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [sourceBranch, setSourceBranch] = useState('');
  const [targetBranch, setTargetBranch] = useState('');
  const [leadDate, setLeadDate] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isTransferConfirmed, setIsTransferConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [transferStatus, setTransferStatus] = useState('');
  const [orderNo, setOrderNo] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await stockTransferLifecycleService.fetchTransfers();
      setStockTransfers(res.stockTransfers ?? []);
      setBranches(res.branches ?? []);
    } catch (err) {
      console.error('useStockTransferRequest fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateQty = useCallback((rfid: string, qty: number) => {
    setScannedItems((prev) =>
      prev.map((item) => {
        if (item.rfid !== rfid) return item;
        const total = parseFloat((item.unitPrice * qty).toFixed(2));
        return { ...item, unitQty: qty, totalAmount: total };
      })
    );
  }, []);

  const handleAddProduct = useCallback((product: EnrichedProduct) => {
    const productId = product.product_id;
    
    // If product already in list, just increment quantity
    const existing = scannedItems.find((item) => item.productId === productId);
    if (existing) {
      updateQty(existing.rfid, (existing.unitQty || 1) + 1);
      return;
    }

    // Generate a pseudo-RFID for manually added items
    const rfid = `MNL-${productId}-${Date.now().toString().slice(-4)}`;
    
    let extractedUnit = 'unit';
    let unitId = 0;
    if (typeof product.unit_of_measurement === 'object' && product.unit_of_measurement !== null) {
      extractedUnit = product.unit_of_measurement.unit_name || 'unit';
      unitId = product.unit_of_measurement.unit_id || 0;
    } else if (product.unit_of_measurement) {
      unitId = Number(product.unit_of_measurement);
    }

    const price = product.price_per_unit || product.cost_per_unit || 0;

    let extractedBrand = 'N/A';
    if (typeof product.product_brand === 'object' && product.product_brand !== null) {
      extractedBrand = product.product_brand.brand_name || 'N/A';
    }

    const newItem: ScannedItem = {
      rfid,
      productId,
      productName: product.product_name,
      description: product.barcode || 'Manual Entry',
      brandName: extractedBrand,
      unit: extractedUnit,
      unitId,
      qtyAvailable: Number(product.qtyAvailable || 0), 
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
      const res = await stockTransferLifecycleService.submitTransferRequest({ 
        sourceBranch, 
        targetBranch, 
        leadDate, 
        scannedItems 
      });

      setIsTransferConfirmed(true);
      if (res.orderNo) {
        setOrderNo(res.orderNo);
        setTransferStatus(`For Approval (Order: ${res.orderNo})`);
      } else {
        setTransferStatus('For Approval');
      }
      toast.success('Transfer request submitted successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      console.error('confirmTransfer error:', err);
      toast.error('Submission failed', { description: message });
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
    orderNo,
    status: transferStatus,
  };
}
