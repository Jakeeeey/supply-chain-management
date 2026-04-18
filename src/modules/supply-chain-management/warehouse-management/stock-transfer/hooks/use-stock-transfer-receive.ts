import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStockTransferBase } from './use-stock-transfer-base';
import { stockTransferLifecycleService } from '../services/stock-transfer.lifecycle';
import { toast } from 'sonner';

const LOCAL_STORAGE_KEY_RECEIVE = 'scm_receive_scans_v1';

/**
 * Hook for managing the "Stock Transfer Receive" phase (RFID Verification at Target).
 */
export function useStockTransferReceive() {
  const base = useStockTransferBase({ 
    statuses: ['For Loading', 'Picked'] 
  });

  const [receivedItemsState, setReceivedItemsState] = useState<Record<string, Record<number, string[]>>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_RECEIVE);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY_RECEIVE, JSON.stringify(receivedItemsState));
    }
  }, [receivedItemsState]);

  const orderGroups = useMemo(() => {
    return base.baseOrderGroups.map(group => {
      const enrichedItems = group.items.map(st => {
        const product = st.product_id as any;
        const pid = Number(product?.product_id || product?.id || st.product_id);
        const rfids = receivedItemsState[group.orderNo]?.[pid] || [];
        
        return {
          ...st,
          receivedQty: rfids.length,
          receivedRfids: rfids,
          dispatched_rfids: (st as any).dispatched_rfids || []
        };
      });

      return {
        ...group,
        items: enrichedItems
      };
    });
  }, [base.baseOrderGroups, receivedItemsState]);

  const selectedGroup = useMemo(() => {
    if (!base.selectedOrderNo) return null;
    return orderGroups.find((g) => g.orderNo === base.selectedOrderNo) || null;
  }, [base.selectedOrderNo, orderGroups]);

  const receiveOrder = async (orderNo: string) => {
    const group = orderGroups.find((g) => g.orderNo === orderNo);
    if (!group) return;

    base.setProcessing(true);
    try {
      const rfidsPayload = group.items.flatMap(item => 
        item.receivedRfids.map(rfid => ({ 
          stock_transfer_id: item.id, 
          rfid_tag: rfid,
          scan_type: 'RECEIVE'
        }))
      );

      const itemsPayload = group.items.map(i => ({
        id: i.id,
        status: 'Received'
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
      await base.refresh();
    } catch (err: any) {
      console.error('Receive failed:', err);
      playErrorSound();
      toast.error(err.message || 'Something went wrong while receiving.');
    } finally {
      base.setProcessing(false);
    }
  };

  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    
    try {
      const match = await stockTransferLifecycleService.lookupRfid(rfid);
      const productId = match.productId;
      
      const itemInOrder = selectedGroup.items.find(i => {
        const itemProduct = i.product_id as any;
        const itemPid = Number(itemProduct?.product_id || itemProduct?.id || i.product_id);
        return itemPid === productId;
      });

      if (!itemInOrder) {
        playErrorSound();
        toast.error(`Invalid Scan`, { description: `Product is not part of this order!` });
        return;
      }

      const dispatchedTags = itemInOrder.dispatched_rfids || [];
      if (dispatchedTags.length > 0 && !dispatchedTags.map(t => String(t).trim()).includes(String(rfid).trim())) {
        playErrorSound();
        toast.error("Invalid RFID Tag", { description: "Tag was not part of original dispatch." });
        return;
      }

      const currentRfids = receivedItemsState[base.selectedOrderNo!]?.[productId] || [];
      if (currentRfids.includes(rfid)) {
        playErrorSound();
        toast.warning("Already Scanned");
        return;
      }

      const allScannedInOrder = Object.values(receivedItemsState[base.selectedOrderNo!] || {}).flat();
      if (allScannedInOrder.includes(rfid)) {
        playErrorSound();
        toast.error("Duplicate RFID in order.");
        return;
      }
      
      const targetQty = itemInOrder.ordered_quantity || 0;
      if (itemInOrder.receivedQty >= targetQty) {
        playErrorSound();
        toast.info(`Already Complete`);
        return;
      }
      
      setReceivedItemsState(prev => {
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
      toast.success(`Received & Verified: ${match.productName}`);
    } catch (error: any) {
      console.error('Scanner lookup error:', error);
      playErrorSound();
      toast.error("RFID lookup failed", { description: error.message });
    }
  };

  const verifyAll = useCallback(() => {
    if (!base.selectedOrderNo || !selectedGroup) return;
    
    setReceivedItemsState(prev => {
      const orderState = { ...(prev[base.selectedOrderNo!] || {}) };
      selectedGroup.items.forEach(item => {
        const itemPid = Number((item.product_id as any)?.product_id || (item.product_id as any)?.id || item.product_id);
        orderState[itemPid] = [...(item.dispatched_rfids || [])];
      });
      return { ...prev, [base.selectedOrderNo!]: orderState };
    });
    
    toast.success("All items verified as received.");
  }, [base.selectedOrderNo, selectedGroup]);

  return {
    ...base,
    orderGroups,
    selectedGroup,
    receiveOrder,
    handleScanRFID,
    verifyAll,
  };
}
