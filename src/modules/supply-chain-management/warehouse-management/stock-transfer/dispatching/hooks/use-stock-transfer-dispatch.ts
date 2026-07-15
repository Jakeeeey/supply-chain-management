'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useStockTransferBase } from '../../shared/hooks/use-stock-transfer-base';
import { stockTransferLifecycleService } from '../../services/stock-transfer.lifecycle';
import { toast } from 'sonner';
import type { OrderGroup, OrderGroupItem, ProductRow, ScanLog, CurrentUser } from '../../types/stock-transfer.types';

const LOCAL_STORAGE_KEY = 'scm_dispatching_scans_v1';

/**
 * Hook for managing the "Stock Transfer Dispatch" phase (RFID Scanning at Source).
 */
export function useStockTransferDispatch({ currentUser }: { currentUser?: CurrentUser } = {}) {
  const base = useStockTransferBase({ 
    statuses: ['For Picking', 'Picking', 'Picked'] 
  });

  const storageKey = currentUser?.email 
    ? `${LOCAL_STORAGE_KEY}_user_${currentUser.email}`
    : LOCAL_STORAGE_KEY;

  const manualStorageKey = currentUser?.email
    ? `warehouse_dispatch_manual_scans_user_${currentUser.email}`
    : 'warehouse_dispatch_manual_scans';

  const [fetchingAvailable, setFetchingAvailable] = useState(false);
  const [scannedInventory, setScannedInventory] = useState<Record<number, number>>({});
  const [isThrottled, setIsThrottled] = useState(false);
  
  // Track recently processed tags to prevent spam (temporal lockout)
  const recentLocks = useRef<Map<string, number>>(new Map());

  // Track scanned RFIDs per order: { [orderNo]: ScanLog[] }
  const [scannedItemsState, setScannedItemsState] = useState<Record<string, ScanLog[]>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return {};
      
      const parsed = JSON.parse(saved);
      
      // Migration: If the format is the old one (Record<number, string[]>), clear it
      // or transform it. For simplicity and to avoid bugs, we'll start fresh if 
      // the structure looks like the old one.
      const firstEntry = Object.values(parsed)[0];
      if (firstEntry && !Array.isArray(firstEntry)) {
        return {};
      }
      
      return parsed;
    } catch {
      return {};
    }
  });

  // Sync scans to localStorage (Filtering out failed/error scans)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const successScansOnly: Record<string, ScanLog[]> = {};
      Object.entries(scannedItemsState).forEach(([orderNo, scans]) => {
        successScansOnly[orderNo] = scans.filter(s => s.status === 'SUCCESS');
      });
      localStorage.setItem(storageKey, JSON.stringify(successScansOnly));
    }
  }, [scannedItemsState, storageKey]);

  const [manualQtysState, setManualQtysState] = useState<Record<string, Record<number, number>>>(() => {
    try {
      if (typeof window === 'undefined') return {};
      const saved = localStorage.getItem(manualStorageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(manualStorageKey, JSON.stringify(manualQtysState));
    }
  }, [manualQtysState, manualStorageKey]);

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
  // Group logical items with scan data — distributes scans across line items by capacity
  const orderGroups = useMemo(() => {
    return base.baseOrderGroups.map((group: OrderGroup) => {
      const scanLogs = scannedItemsState[group.orderNo] || [];

      // Group successful scans by productId for proper distribution
      const scansByProduct = new Map<number, ScanLog[]>();
      for (const s of scanLogs) {
        if (s.status === 'SUCCESS' && s.productId != null) {
          const existing = scansByProduct.get(s.productId) || [];
          existing.push(s);
          scansByProduct.set(s.productId, existing);
        }
      }

      // Track how many scans have been distributed per product
      const distributedPerProduct = new Map<number, number>();

      const enrichedItems = group.items.map((st: OrderGroupItem) => {
        const product = st.product_id as ProductRow;
        const pid = (product?.product_id || st.product_id) as number;

        const uom = typeof product?.unit_of_measurement === 'object' ? product.unit_of_measurement : null;
        const unitName = (uom?.unit_name || '').toLowerCase();
        const unitId = Number(uom?.unit_id || 0);

        // Mark as loose pack if unit is pieces, tie, pcs, or loose (these don't need RFID scanning)
        const loosePack = unitName.includes('loose') || unitName.includes('pieces') || unitName.includes('pcs') || unitName.includes('tie') || unitId === 4;

        const rawAvailable = scannedInventory[pid] ?? (st as OrderGroupItem).qtyAvailable ?? 0;
        const manualQty = (manualQtysState[group.orderNo] || {})[pid] || 0;

        // Distribute scans across line items: assign up to allocated_quantity to each item
        const productScans = scansByProduct.get(pid) || [];
        const alreadyDistributed = distributedPerProduct.get(pid) || 0;
        const targetQty = Math.max(0, st.allocated_quantity ?? 0);
        const canAssign = Math.max(0, Math.min(targetQty, productScans.length - alreadyDistributed));
        const itemRfids = productScans.slice(alreadyDistributed, alreadyDistributed + canAssign).map(s => s.rfid);
        distributedPerProduct.set(pid, alreadyDistributed + itemRfids.length);

        return {
          ...st,
          scannedQty: loosePack ? manualQty : itemRfids.length,
          scannedRfids: itemRfids,
          qtyAvailable: Math.max(0, rawAvailable),
          isLoosePack: loosePack,
        };
      });

      return {
        ...group,
        items: enrichedItems
      };
    });
  }, [base.baseOrderGroups, scannedItemsState, scannedInventory, manualQtysState]);

  const selectedGroup = useMemo(() => {
    if (!base.selectedOrderNo) return null;
    return orderGroups.find((g: OrderGroup) => g.orderNo === base.selectedOrderNo) || null;
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
            // Handle both camelCase (productId) and snake_case (product_id) from Spring API
            const inventoryList = list.filter((inv: Record<string, string | number>) => 
               String(inv.productId ?? inv.product_id) === String(pid) && 
               String(inv.branchId ?? inv.branch_id) === String(sourceBranch)
            );
            
            const availableCount = inventoryList.reduce((acc: number, inv: Record<string, string | number>) => acc + Number(inv.runningInventory ?? inv.running_inventory ?? 0), 0);
            const unitCount = Number(product?.unit_of_measurement_count || 1) || 1;
            return { pid: pid as number, available: Math.max(0, Math.floor(availableCount / unitCount)) };
          }
          return { pid: pid as number, available: 0 };
        }));

        for (const result of results) {
          if (result.status === 'fulfilled') {
            newAvailable[result.value.pid] = result.value.available;
          }
        }
        
        if (results.some(r => r.status === 'fulfilled')) setScannedInventory(newAvailable);
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
      const scanLogs = (scannedItemsState[orderNo] || []).filter(s => s.status === 'SUCCESS');

      // Distribute RFIDs across line items by capacity to ensure correct per-BOX assignment
      const dispatchAssigned: Record<number, number> = {};
      const rfidsPayload = scanLogs.map(s => {
        const lineItem = group.items.find(i => {
          const p = i.product_id as ProductRow;
          const pid = p?.product_id || i.product_id;
          if (pid !== s.productId) return false;
          const targetQty = Math.max(0, i.allocated_quantity ?? 0);
          return (dispatchAssigned[i.id] || 0) < targetQty;
        });
        if (!lineItem) return null;
        dispatchAssigned[lineItem.id] = (dispatchAssigned[lineItem.id] || 0) + 1;
        return {
          stock_transfer_id: lineItem.id,
          rfid_tag: s.rfid,
          scan_type: 'DISPATCH' as const
        };
      }).filter((p): p is NonNullable<typeof p> => p !== null);

      const itemsPayload = group.items.map(i => ({
        id: i.id,
        status: 'For Loading',
        picked_quantity: i.scannedQty
      }));

      await stockTransferLifecycleService.submitStatusUpdate({ 
        items: itemsPayload, 
        status: 'For Loading',
        rfids: rfidsPayload,
        scanType: 'DISPATCH',
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

    const pushError = (msg: string, type: string = 'Error') => {
      playErrorSound();
      const newError: ScanLog = {
        rfid,
        timestamp: Date.now(),
        status: 'ERROR',
        errorType: type,
        productName: msg
      };
      setScannedItemsState(prev => ({
        ...prev,
        [base.selectedOrderNo!]: [newError, ...(prev[base.selectedOrderNo!] || [])]
      }));
    };

    // Basic validation: Ignore very short strings (accidental noise)
    if (rfid.length < 8) return;

    // Spam prevention: Ignore the same tag if processed within the last 10 seconds
    const now = Date.now();
    const lastTime = recentLocks.current.get(rfid) || 0;
    if (now - lastTime < 2000) {
      setIsThrottled(true);
      setTimeout(() => setIsThrottled(false), 2000);
      return;
    }
    recentLocks.current.set(rfid, now);

    try {
      const currentScans = scannedItemsState[base.selectedOrderNo!] || [];
      if (currentScans.some(s => s.status === 'SUCCESS' && s.rfid === rfid)) {
        pushError(`Already scanned in this order`, 'Duplicate');
        return;
      }

      const match = await stockTransferLifecycleService.lookupRfid(rfid, selectedGroup.sourceBranch!);
      const productId = match.productId;

      // Find all line items matching this product
      const matchingItems = selectedGroup.items.filter(i => {
        const itemProduct = i.product_id as ProductRow;
        const itemPid = itemProduct?.product_id || i.product_id;
        return itemPid === productId;
      });

      if (matchingItems.length === 0) {
        pushError(`Product is not part of this order!`, 'Mismatch');
        return;
      }

      // Pick the first line item that still has remaining capacity
      const itemInOrder = matchingItems.find(i => {
        const targetQty = Math.max(0, i.allocated_quantity ?? 0);
        return (i.scannedQty || 0) < targetQty;
      });

      if (!itemInOrder) {
        pushError(`Required quantity already reached for ${match.productName}`, 'Over-scan');
        return;
      }
      
      const newScan: ScanLog = {
        rfid,
        productId,
        productName: match.productName,
        timestamp: Date.now(),
        status: 'SUCCESS'
      };

      setScannedItemsState(prev => ({
        ...prev,
        [base.selectedOrderNo!]: [newScan, ...(prev[base.selectedOrderNo!] || [])]
      }));
      
      playSuccessSound();

      if (selectedGroup.status === 'For Picking') {
        await updateOrderStatus(base.selectedOrderNo!, 'Picking');
      }
      } catch {
        pushError('Tag not found in inventory', 'Not Found');
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
    recentScans: (base.selectedOrderNo ? scannedItemsState[base.selectedOrderNo] : []) || [],
    isThrottled,
    clearHistory: () => {
      if (base.selectedOrderNo) {
        setScannedItemsState(prev => ({ ...prev, [base.selectedOrderNo!]: [] }));
        setManualQtysState(prev => {
          const next = { ...prev };
          delete next[base.selectedOrderNo!];
          return next;
        });
      }
    },
    updateManualQty: (productId: number, qty: number) => {
      if (!base.selectedOrderNo) return;
      setManualQtysState(prev => ({
        ...prev,
        [base.selectedOrderNo!]: {
          ...(prev[base.selectedOrderNo!] || {}),
          [productId]: Math.max(0, qty)
        }
      }));
    }
  };
}
