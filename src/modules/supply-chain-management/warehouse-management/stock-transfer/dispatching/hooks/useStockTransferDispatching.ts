import { useState, useEffect, useCallback, useMemo } from 'react';
import { StockTransfer, Branch } from '../../types';
import { toast } from 'sonner';

export interface DispatchItem extends StockTransfer {
  scannedQty: number;
  scannedRfids: string[];
  qtyAvailable?: number;
}

export interface DispatchGroup {
  orderNo: string;
  sourceBranch: number | null;
  targetBranch: number | null;
  leadDate: string | null;
  dateRequested: string;
  dateEncoded: string;
  items: DispatchItem[];
  totalAmount: number;
  status: string;
}

export function useStockTransferDispatching() {
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [scannedInventory, setScannedInventory] = useState<Record<number, number>>({});

  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);
  
  // Track scanned RFIDs per order: { orderNo: { productId: string[] } }
  const [scannedItemsState, setScannedItemsState] = useState<Record<string, Record<number, string[]>>>({});

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const statuses = 'For Picking,Picking,Picked';
      const res = await fetch(`/api/scm/warehouse-management/stock-transfer?status=${encodeURIComponent(statuses)}`);
      if (!res.ok) throw new Error('Failed to fetch transfers');
      const json = await res.json();
      setStockTransfers(json.stockTransfers ?? []);
      setBranches(json.branches ?? []);
    } catch (err) {
      console.error('Failed to fetch transfers for dispatch:', err);
      playErrorSound();
      toast.error('Network Error', {
        description: 'Server is unreachable. Please check your connection.'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  // Group the flat stockTransfers array by order_no and attach scannedQty
  const orderGroups = useMemo(() => {
    const groups: Record<string, DispatchGroup> = {};
    stockTransfers.forEach((st) => {
      if (!groups[st.order_no]) {
        groups[st.order_no] = {
          orderNo: st.order_no,
          sourceBranch: st.source_branch,
          targetBranch: st.target_branch,
          leadDate: st.lead_date,
          dateRequested: st.date_requested,
          dateEncoded: st.date_encoded || '',
          items: [],
          totalAmount: 0,
          status: st.status
        };
      }
      
      const product = typeof st.product_id === 'object' && st.product_id !== null ? st.product_id : null;
      const pid = product ? (product.product_id || product.id) : st.product_id;
      
      const rfids = scannedItemsState[st.order_no]?.[pid] || [];
      
      groups[st.order_no].items.push({
        ...st,
        scannedQty: rfids.length,
        scannedRfids: rfids,
        qtyAvailable: scannedInventory[pid] ?? (st as any).qtyAvailable ?? 0
      });
      groups[st.order_no].totalAmount += Number(st.amount || 0);
    });
    return Object.values(groups).sort(
      (a, b) => new Date(b.dateEncoded).getTime() - new Date(a.dateEncoded).getTime()
    );
  }, [stockTransfers, scannedItemsState, scannedInventory]);

  const selectedGroup = useMemo(() => {
    if (!selectedOrderNo) return null;
    return orderGroups.find((g) => g.orderNo === selectedOrderNo) || null;
  }, [selectedOrderNo, orderGroups]);

  const updateOrderStatus = async (orderNo: string, status: string) => {
    const group = orderGroups.find((g) => g.orderNo === orderNo);
    if (!group) return;

    try {
      const ids = group.items.map((item) => item.id);
      const res = await fetch('/api/scm/warehouse-management/stock-transfer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status }),
      });

      if (!res.ok) throw new Error(`Failed to update to ${status}`);
      
      // Update local state status to avoid redundant triggers
      setStockTransfers(prev => prev.map(st => 
        st.order_no === orderNo ? { ...st, status } : st
      ));
      
      console.log(`[Status Update] Order ${orderNo} -> ${status}`);
    } catch (err) {
      console.error(`Failed to update status for ${orderNo}:`, err);
    }
  };

  const dispatchOrder = async (orderNo: string) => {
    const group = orderGroups.find((g) => g.orderNo === orderNo);
    if (!group) return;

    // Optional validation to ensure everything is scanned
    // const isFullyScanned = group.items.every(i => i.scannedQty >= i.ordered_quantity);
    // if (!isFullyScanned) return toast.error("Please scan all items before dispatching");

    setProcessing(true);
    try {
      const ids = group.items.map((item) => item.id);
      
      // Build the bulk RFID insert payload
      const rfidsPayload = group.items.flatMap(item => 
        item.scannedRfids.map(rfid => ({ 
          stock_transfer_id: item.id, 
          rfid_tag: rfid 
        }))
      );

      const res = await fetch('/api/scm/warehouse-management/stock-transfer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ids, 
          status: 'For Loading',
          rfids: rfidsPayload,
          scanType: 'DISPATCH'
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update status to For Loading`);
      }

      toast.success(`Order ${orderNo} successfully dispatched.`);
      setSelectedOrderNo(null);
      await fetchTransfers(); // Refresh list
    } catch (err: unknown) {
      console.error('Dispatch failed:', err);
      playErrorSound();
      toast.error(err instanceof Error && err.name === 'TypeError' ? 'Network Error: Server Unreachable' : (err instanceof Error ? err.message : 'Something went wrong while dispatching.'));
    } finally {
      setProcessing(false);
    }
  };
  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'square'; // Harder, more 'industrial' beep
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
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sawtooth'; // Harsh error sound
      oscillator.frequency.setValueAtTime(150, audioCtx.currentTime); // Low buzz
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
    if (!selectedOrderNo || !selectedGroup) {
      toast.error("Please select an approved order first before scanning");
      return;
    }
    
    // Lookup RFID to get Product ID via v_rfid_onhand (Spring Boot)
    try {
      const branchId = selectedGroup.sourceBranch;
      const res = await fetch(`/api/scm/warehouse-management/stock-transfer?action=lookup_rfid&rfid=${encodeURIComponent(rfid)}&branch_id=${branchId}`);
      
      const match = await res.json();

      if (!res.ok) {
        playErrorSound();
        toast.error(match.error || "Lookup Failed", {
          description: match.details || "RFID not recognized or not on hand."
        });
        return;
      }
      
      const productId = match.productId;
      
      // Check if product is in the current order
      let itemInOrder = selectedGroup.items.find(i => {
        const itemProduct = typeof i.product_id === 'object' && i.product_id !== null ? i.product_id : null;
        const itemPid = itemProduct ? (itemProduct.product_id || itemProduct.id) : i.product_id;
        return itemPid === productId;
      });
      
      let effectiveProductId = productId;
      /* 
      // REMOVED: UAT FALLBACK
      // If the match is our specific mock product and it's NOT in the order, 
      // map it to the first item that still needs scanning so the user can see the flow work.
      if (!itemInOrder && productId === 22345) {
        itemInOrder = selectedGroup.items.find(i => i.scannedQty < i.ordered_quantity);
        if (itemInOrder) {
          const itemProduct = typeof itemInOrder.product_id === 'object' && itemInOrder.product_id !== null ? itemInOrder.product_id : null;
          effectiveProductId = itemProduct ? (itemProduct.product_id || itemProduct.id) : itemInOrder.product_id;
          console.log(`[UAT Mock] Mapping product 22345 to order item ${effectiveProductId}`);
        }
      }
      */

      if (!itemInOrder) {
        playErrorSound();
        toast.error(`Invalid Scan`, {
          description: `Product (ID: ${productId}) is not part of this order!`
        });
        return;
      }
      
      const currentRfidsForProduct = scannedItemsState[selectedOrderNo]?.[effectiveProductId] || [];
      if (currentRfidsForProduct.includes(rfid)) {
        playErrorSound();
        toast.warning("Already Scanned", {
          description: `RFID ${rfid} has already been packged for this item.`
        });
        return;
      }

      // Check across ALL products in this order for this RFID (prevent duplicate tag usage)
      const allScannedRfidsInOrder = Object.values(scannedItemsState[selectedOrderNo] || {}).flat();
      if (allScannedRfidsInOrder.includes(rfid)) {
        playErrorSound();
        toast.error("Duplicate RFID", {
          description: "This tag is already used for another product in this withdrawal."
        });
        return;
      }
      
      if (itemInOrder.scannedQty >= itemInOrder.ordered_quantity) {
        playErrorSound();
        toast.info(`Already Complete`, {
          description: "Required quantity for this product already reached."
        });
        return;
      }
      
      // Map scanned RFID
      setScannedItemsState(prev => {
        const orderState = prev[selectedOrderNo] || {};
        const rfids = orderState[effectiveProductId] || [];
        return {
          ...prev,
          [selectedOrderNo]: {
            ...orderState,
            [effectiveProductId]: [...rfids, rfid]
          }
        };
      });
      
      // Update local inventory count for display
      if (match.qtyAvailable !== undefined) {
        setScannedInventory(prev => ({
          ...prev,
          [effectiveProductId]: match.qtyAvailable
        }));
      }
      
      playSuccessSound();
      const finalName = (typeof itemInOrder.product_id === 'object' && itemInOrder.product_id?.product_name) 
        || match.productName 
        || "Product";
      toast.success(`Scanned: ${finalName}`);

      // ── STATUS TRANSITION: Picking ──
      if (selectedGroup.status === 'For Picking') {
        await updateOrderStatus(selectedOrderNo, 'Picking');
      }

      // ── STATUS TRANSITION: Picked ──
      const allItems = selectedGroup.items;
      const isComplete = allItems.every(item => {
        const product = typeof item.product_id === 'object' && item.product_id !== null ? item.product_id : null;
        const pid = product ? (product.product_id || product.id) : item.product_id;
        
        const scanCount = (pid === effectiveProductId) 
          ? (scannedItemsState[selectedOrderNo]?.[effectiveProductId]?.length || 0) + 1
          : (scannedItemsState[selectedOrderNo]?.[pid]?.length || 0);
          
        return scanCount >= item.ordered_quantity;
      });

      if (isComplete && selectedGroup.status !== 'Picked') {
        await updateOrderStatus(selectedOrderNo, 'Picked');
      }
      
    } catch (error) {
      console.error('Scanner lookup error:', error);
      playErrorSound();
      toast.error("Network Error", {
        description: "Failed to reach server for RFID lookup."
      });
    }
  };

  const getBranchName = useCallback(
    (id: number | null) => {
      if (!id) return 'Unknown';
      const b = branches.find((branch) => branch.id === id);
      return b ? (b.branch_name as string) || (b.name as string) || `Branch ${id}` : `Branch ${id}`;
    },
    [branches]
  );

  return {
    orderGroups,
    selectedGroup,
    selectedOrderNo,
    setSelectedOrderNo,
    loading,
    processing,
    dispatchOrder,
    handleScanRFID,
    getBranchName,
    refresh: fetchTransfers,
  };
}
