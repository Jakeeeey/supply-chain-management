'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useStockTransferBase } from '../../shared/hooks/use-stock-transfer-base';
import { stockTransferLifecycleService } from '../../services/stock-transfer.lifecycle';
import { toast } from 'sonner';
import type { OrderGroup, OrderGroupItem, ProductRow, ScanLog } from '../../types/stock-transfer.types';

const LOCAL_STORAGE_KEY_RECEIVE = 'scm_receive_scans_v1';

/**
 * Hook for managing the "Stock Transfer Receive" phase (RFID Verification at Target).
 */
export function useStockTransferReceive() {
  const base = useStockTransferBase({ 
    statuses: ['For Loading'] 
  });

  const [receivedItemsState, setReceivedItemsState] = useState<Record<string, ScanLog[]>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_RECEIVE);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [manualQtysState, setManualQtysState] = useState<Record<string, Record<number, number>>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('scm_receive_manual_v1');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [isThrottled, setIsThrottled] = useState(false);
  const recentLocks = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY_RECEIVE, JSON.stringify(receivedItemsState));
    }
  }, [receivedItemsState]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('scm_receive_manual_v1', JSON.stringify(manualQtysState));
    }
  }, [manualQtysState]);

  // Garbage-collect orphaned localStorage entries for canceled/rejected orders
  useEffect(() => {
    if (!base.baseOrderGroups || base.baseOrderGroups.length === 0) return;

    const validOrderNumbers = new Set(base.baseOrderGroups.map(g => g.orderNo));

    setReceivedItemsState(prevState => {
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

    setManualQtysState(prevState => {
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

  const orderGroups = useMemo(() => {
    return base.baseOrderGroups.map((group: OrderGroup) => {
      const enrichedItems = group.items.map((st: OrderGroupItem) => {
        const product = st.product_id as ProductRow;
        const pid = product?.product_id || st.product_id;
        
        const scanLogs = receivedItemsState[group.orderNo] || [];
        const itemScans = scanLogs.filter(s => s.status === 'SUCCESS' && s.productId === pid);
        const rfids = itemScans.map(s => s.rfid);

        const uom = typeof product?.unit_of_measurement === 'object' ? product.unit_of_measurement : null;
        const unitName = (uom?.unit_name || '').toLowerCase();
        const unitId = Number(uom?.unit_id || 0);

        // Mark as loose pack if unit is pieces, tie, pcs, or loose (these don't need RFID scanning)
        const isLoosePack = unitName.includes('loose') || unitName.includes('pieces') || unitName.includes('pcs') || unitName.includes('tie') || unitId === 4;
        
        const manualQty = (manualQtysState[group.orderNo] || {})[pid as number] || 0;
        
        return {
          ...st,
          receivedQty: isLoosePack ? manualQty : rfids.length,
          receivedRfids: rfids,
          dispatched_rfids: (st as OrderGroupItem).dispatched_rfids || [],
          isLoosePack
        };
      });

      return {
        ...group,
        items: enrichedItems
      };
    });
  }, [base.baseOrderGroups, receivedItemsState, manualQtysState]);

  const selectedGroup = useMemo(() => {
    if (!base.selectedOrderNo) return null;
    return orderGroups.find((g: OrderGroup) => g.orderNo === base.selectedOrderNo) || null;
  }, [base.selectedOrderNo, orderGroups]);

  const receiveOrder = async (orderNo: string) => {
    const group = orderGroups.find((g: OrderGroup) => g.orderNo === orderNo);
    if (!group) return;

    base.setProcessing(true);
    try {
      const rfidsPayload = group.items.flatMap((item: OrderGroupItem) => 
        item.receivedRfids.map((rfid: string) => ({ 
          stock_transfer_id: item.id, 
          rfid_tag: rfid,
          scan_type: 'RECEIVE'
        }))
      );

      const itemsPayload = group.items.map((i: OrderGroupItem) => ({
        id: i.id,
        status: 'Received',
        received_quantity: i.receivedQty || 0
      }));

      await stockTransferLifecycleService.submitStatusUpdate({ 
        items: itemsPayload, 
        status: 'Received',
        rfids: rfidsPayload,
      });

      toast.success(`Order ${orderNo} successfully received!`);
      base.setSelectedOrderNo(null);
      setReceivedItemsState(prev => {
        const next = { ...prev };
        delete next[orderNo];
        return next;
      });
      setManualQtysState(prev => {
        const next = { ...prev };
        delete next[orderNo];
        return next;
      });
      await base.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong while receiving.';
      console.error('Receive failed:', err);
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
    } catch (e) { console.warn('Audio feedback failed:', e); }
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
    } catch (e) { console.warn('Error audio failed:', e); }
  };

  const handleScanRFID = async (rfid: string) => {
    if (!base.selectedOrderNo || !selectedGroup) {
      toast.error("Please select a dispatched order first before scanning");
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
      setReceivedItemsState(prev => ({
        ...prev,
        [base.selectedOrderNo!]: [newError, ...(prev[base.selectedOrderNo!] || [])]
      }));
    };

    // Basic validation: Ignore very short strings (accidental noise)
    if (rfid.length < 8) return;

    // Spam prevention: Ignore the same tag if processed within the last 10 seconds
    const now = Date.now();
    const lastTime = recentLocks.current.get(rfid) || 0;
    if (now - lastTime < 10000) {
      setIsThrottled(true);
      setTimeout(() => setIsThrottled(false), 2000);
      return;
    }
    recentLocks.current.set(rfid, now);
    
    try {
      const match = await stockTransferLifecycleService.lookupRfid(rfid);
      const productId = match.productId;
      
      const itemInOrder = selectedGroup.items.find(i => {
        const itemProduct = i.product_id as ProductRow;
        const itemPid = Number(itemProduct?.product_id || i.product_id);
        return itemPid === productId;
      });

      if (!itemInOrder) {
        pushError(`Product is not part of this order!`, 'Mismatch');
        return;
      }

      const dispatchedTags = itemInOrder.dispatched_rfids || [];
      if (dispatchedTags.length > 0 && !dispatchedTags.map(t => String(t).trim()).includes(String(rfid).trim())) {
        pushError("Tag was not part of original dispatch.", "Mismatch");
        return;
      }

      const currentScans = receivedItemsState[base.selectedOrderNo!] || [];
      if (currentScans.some(s => s.status === 'SUCCESS' && s.rfid === rfid)) {
        pushError("Already Scanned", "Duplicate");
        return;
      }
      
      const targetQty = itemInOrder.ordered_quantity || 0;
      if (itemInOrder.receivedQty >= targetQty) {
        pushError(`Already Complete for ${match.productName}`, "Over-scan");
        return;
      }
      
      const newScan: ScanLog = {
        rfid,
        productId,
        productName: match.productName,
        timestamp: Date.now(),
        status: 'SUCCESS'
      };

      setReceivedItemsState(prev => ({
        ...prev,
        [base.selectedOrderNo!]: [newScan, ...(prev[base.selectedOrderNo!] || [])]
      }));
      
      playSuccessSound();
    } catch (error: unknown) {
      pushError('Tag not found in inventory', 'Not Found');
    }
  };

  const verifyAll = useCallback(() => {
    if (!base.selectedOrderNo || !selectedGroup) return;
    
    setReceivedItemsState(prev => {
      const dispatchLogs: ScanLog[] = selectedGroup.items.flatMap(item => {
        const product = item.product_id as ProductRow;
        const itemPid = Number(product?.product_id || item.product_id);
        return (item.dispatched_rfids || []).map(rfid => ({
          rfid,
          productId: itemPid,
          productName: product?.product_name || `Item ${itemPid}`,
          timestamp: Date.now(),
          status: 'SUCCESS' as const,
        }));
      });
      return { ...prev, [base.selectedOrderNo!]: dispatchLogs };
    });
    
    toast.success("All items verified as received.");
  }, [base.selectedOrderNo, selectedGroup]);

  const updateManualQty = (productId: number, qty: number) => {
    if (!base.selectedOrderNo) return;
    setManualQtysState(prev => {
      const orderManual = prev[base.selectedOrderNo!] || {};
      return {
        ...prev,
        [base.selectedOrderNo!]: {
          ...orderManual,
          [productId]: qty
        }
      };
    });
  };

  return {
    ...base,
    orderGroups,
    selectedGroup,
    receiveOrder,
    handleScanRFID,
    verifyAll,
    updateManualQty,
    recentScans: (base.selectedOrderNo ? receivedItemsState[base.selectedOrderNo] : []) || [],
    isThrottled,
    clearHistory: () => {
      if (base.selectedOrderNo) {
        setReceivedItemsState(prev => ({ ...prev, [base.selectedOrderNo!]: [] }));
      }
    }
  };
}
