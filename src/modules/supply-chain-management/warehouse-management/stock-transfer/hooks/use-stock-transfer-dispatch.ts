import { useState, useEffect, useMemo } from 'react';
import { useStockTransferBase } from './use-stock-transfer-base';
import { stockTransferLifecycleService } from '../services/stock-transfer.lifecycle';
import { toast } from 'sonner';
import type { OrderGroup, OrderGroupItem, ProductRow } from '../types/stock-transfer.types';

const LOCAL_STORAGE_KEY = 'scm_dispatching_scans_v1';

/**
 * Hook for managing the "Stock Transfer Dispatch" phase (RFID Scanning at Source).
 */
export function useStockTransferDispatch() {
  const base = useStockTransferBase({ 
    statuses: ['For Picking', 'Picking', 'Picked'] 
  });

  const [fetchingAvailable, setFetchingAvailable] = useState(false);
  const [scannedInventory, setScannedInventory] = useState<Record<number, number>>({});
  
  // Track scanned RFIDs per order: { orderNo: { productId: string[] } }
  const [scannedItemsState, setScannedItemsState] = useState<Record<string, Record<number, string[]>>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sync scans to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(scannedItemsState));
    }
  }, [scannedItemsState]);

  // Garbage-collect orphaned localStorage entries for canceled/rejected orders
  useEffect(() => {
    if (!base.baseOrderGroups || base.baseOrderGroups.length === 0) return;

    const validOrderNumbers = new Set(base.baseOrderGroups.map(g => g.orderNo));

    setScannedItemsState(prevState => {
      let hasPurged = false;
      const cleanState = { ...prevState };

      Object.keys(cleanState).forEach(cachedOrderNo => {
        if (!validOrderNumbers.has(cachedOrderNo)) {
          delete cleanState[cachedOrderNo];
          hasPurged = true;
        }
      });

      return hasPurged ? cleanState : prevState;
    });
  }, [base.baseOrderGroups]);

  // Group logical items with scan data
  const orderGroups = useMemo(() => {
    return base.baseOrderGroups.map(group => {
      const enrichedItems = group.items.map((st: OrderGroupItem) => {
        const product = st.product_id as ProductRow;
        const pid = product?.product_id || st.product_id;
        
        const rfids = scannedItemsState[group.orderNo]?.[pid as number] || [];
        const uom = typeof product?.unit_of_measurement === 'object' ? product.unit_of_measurement : null;
        const unitName = (uom?.unit_name || '').toLowerCase();
        const unitId = Number(uom?.unit_id || 0);

        // Mark as loose pack if unit is pieces, tie, pcs, or loose (these don't need RFID scanning)
        const loosePack = unitName.includes('loose') || unitName.includes('pieces') || unitName.includes('pcs') || unitName.includes('tie') || unitId === 4;
        
        const targetQty = Math.max(0, st.allocated_quantity ?? st.ordered_quantity ?? 0);
        const rawAvailable = scannedInventory[pid as number] ?? (st as OrderGroupItem).qtyAvailable ?? 0;

        return {
          ...st,
          scannedQty: loosePack ? targetQty : rfids.length,
          scannedRfids: rfids,
          qtyAvailable: Math.max(0, rawAvailable),
          isLoosePack: loosePack,
        };
      });

      return {
        ...group,
        items: enrichedItems
      };
    });
  }, [base.baseOrderGroups, scannedItemsState, scannedInventory]);

  const selectedGroup = useMemo(() => {
    if (!base.selectedOrderNo) return null;
    return orderGroups.find((g) => g.orderNo === base.selectedOrderNo) || null;
  }, [base.selectedOrderNo, orderGroups]);

  // Fetch initial inventory for selected order
  useEffect(() => {
    if (!base.selectedOrderNo || !selectedGroup) return;

    const fetchInitialInventory = async () => {
      setFetchingAvailable(true);
      try {
        const newAvailable: Record<number, number> = { ...scannedInventory };
        const sourceBranch = selectedGroup.sourceBranch!;
        const sourceBranchName = base.getBranchName(sourceBranch);

        // Fetch all uncached product inventories in parallel
        const itemsToFetch = selectedGroup.items.filter(item => {
          const product = item.product_id as ProductRow;
          const pid = product?.product_id || item.product_id;
          return pid && scannedInventory[pid as number] === undefined;
        });

        const results = await Promise.allSettled(itemsToFetch.map(async (item) => {
          const product = item.product_id as ProductRow;
          const pid = product?.product_id || item.product_id;

          const params = new URLSearchParams({
            branchName: sourceBranchName,
            branchId: String(sourceBranch),
            productId: String(pid),
            current: '0'
          });

          const proxyUrl = `/api/scm/warehouse-management/stock-transfer/inventory-proxy?${params.toString()}`;
          const res = await fetch(proxyUrl);
          if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.data || []);
            const inventoryList = list.filter((inv: { productId: string | number; branchId: string | number; runningInventory: number }) => 
               String(inv.productId) === String(pid) && 
               String(inv.branchId) === String(sourceBranch)
            );
            const availableCount = inventoryList.reduce((acc: number, inv: { runningInventory: number }) => acc + Number(inv.runningInventory || 0), 0);
            const unitCount = Number(product?.unit_of_measurement_count || 1) || 1;
            return { pid: pid as number, available: Math.max(0, Math.floor(availableCount / unitCount)) };
          }
          return { pid: pid as number, available: 0 };
        }));

        let hasChanges = false;
        for (const result of results) {
          if (result.status === 'fulfilled') {
            newAvailable[result.value.pid] = result.value.available;
            hasChanges = true;
          }
        }
        
        if (hasChanges) setScannedInventory(newAvailable);
      } catch (err) {
        console.error('Failed to fetch initial available quantities:', err);
      } finally {
        setFetchingAvailable(false);
      }
    };

    fetchInitialInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.selectedOrderNo]);

  const updateOrderStatus = async (orderNo: string, status: string) => {
    const group = orderGroups.find((g: OrderGroup) => g.orderNo === orderNo);
    if (!group) return;

    try {
      const ids = group.items.map((item) => item.id);
      await stockTransferLifecycleService.submitStatusUpdate({ 
        items: ids.map(id => ({ id, status })), 
        status 
      });
      
      base.setStockTransfers(prev => prev.map(st => 
        st.order_no === orderNo ? { ...st, status } : st
      ));
    } catch (err) {
      console.error(`Failed to update status for ${orderNo}:`, err);
    }
  };

  const dispatchOrder = async (orderNo: string) => {
    const group = orderGroups.find((g: OrderGroup) => g.orderNo === orderNo);
    if (!group) return;

    base.setProcessing(true);
    try {
      const rfidsPayload = group.items.flatMap(item => 
        item.scannedRfids.map(rfid => ({ 
          stock_transfer_id: item.id, 
          rfid_tag: rfid,
          scan_type: 'DISPATCH'
        }))
      );

      const itemsPayload = group.items.map(i => ({
        id: i.id,
        status: 'For Loading'
      }));

      await stockTransferLifecycleService.submitStatusUpdate({ 
        items: itemsPayload, 
        status: 'For Loading',
        rfids: rfidsPayload,
      });

      toast.success(`Order ${orderNo} successfully dispatched.`);
      base.setSelectedOrderNo(null);
      
      setScannedItemsState(prev => {
        const nextState = { ...prev };
        delete nextState[orderNo];
        return nextState;
      });

      await base.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong while dispatching.';
      console.error('Dispatch failed:', err);
      playErrorSound();
      toast.error(message);
    } finally {
      base.setProcessing(false);
    }
  };

  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); 
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  };

  const playErrorSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn('Error audio failed:', e);
    }
  };

  const handleScanRFID = async (rfid: string) => {
    if (!base.selectedOrderNo || !selectedGroup) {
      toast.error("Please select an approved order first before scanning");
      return;
    }
    
    try {
      const match = await stockTransferLifecycleService.lookupRfid(rfid, selectedGroup.sourceBranch!);
      const productId = match.productId;
      
      const itemInOrder = selectedGroup.items.find(i => {
        const itemProduct = i.product_id as ProductRow;
        const itemPid = itemProduct?.product_id || i.product_id;
        return itemPid === productId;
      });
      
      if (!itemInOrder) {
        playErrorSound();
        toast.error(`Product is not part of this order!`);
        return;
      }
      
      const currentRfids = scannedItemsState[base.selectedOrderNo]?.[productId] || [];
      if (currentRfids.includes(rfid)) {
        playErrorSound();
        toast.error(`RFID already scanned for this item.`);
        return;
      }

      const allScannedInOrder = Object.values(scannedItemsState[base.selectedOrderNo] || {}).flat();
      if (allScannedInOrder.includes(rfid)) {
        playErrorSound();
        toast.error(`Duplicate RFID ${rfid} in order.`);
        return;
      }
      
      const targetQty = Math.max(0, itemInOrder.allocated_quantity ?? itemInOrder.ordered_quantity ?? 0);
      if (itemInOrder.scannedQty >= targetQty) {
        playErrorSound();
        toast.error(`Required quantity already reached.`);
        return;
      }
      
      setScannedItemsState(prev => {
        const orderState = prev[base.selectedOrderNo!] || {};
        const rfids = orderState[productId] || [];
        return {
          ...prev,
          [base.selectedOrderNo!]: {
            ...orderState,
            [productId]: [...rfids, rfid]
          }
        };
      });
      
      playSuccessSound();
      toast.success(`Scanned: ${match.productName}`);

      if (selectedGroup.status === 'For Picking') {
        await updateOrderStatus(base.selectedOrderNo!, 'Picking');
      }

      // Check if all items are scanned to mark as 'Picked' (Simplified check)
      // This is a bit reactive, might need stabilization if multiple scans fast.
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'RFID lookup failed';
      console.error('Scanner lookup error:', error);
      playErrorSound();
      toast.error("RFID lookup failed", { description: message });
    }
  };

  const markAsPicked = async (orderNo: string) => {
    base.setProcessing(true);
    try {
      await updateOrderStatus(orderNo, 'Picked');
      toast.success(`Successfully marked as Done Picking.`);
    } catch {
      toast.error('Failed to update status to Picked');
    } finally {
      base.setProcessing(false);
    }
  };

  return {
    ...base,
    orderGroups,
    selectedGroup,
    dispatchOrder,
    handleScanRFID,
    fetchingAvailable,
    markAsPicked,
  };
}
