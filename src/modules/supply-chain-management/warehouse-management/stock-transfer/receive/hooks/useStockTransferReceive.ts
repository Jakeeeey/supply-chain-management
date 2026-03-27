import { useState, useEffect, useCallback, useMemo } from 'react';
import { StockTransfer, Branch } from '../../types';
import { toast } from 'sonner';

export interface ReceiveItem extends StockTransfer {
  receivedQty: number;
  receivedRfids: string[];
  dispatched_rfids?: string[];
}

export interface ReceiveGroup {
  orderNo: string;
  sourceBranch: number | null;
  targetBranch: number | null;
  leadDate: string | null;
  dateRequested: string;
  dateEncoded: string;
  items: ReceiveItem[];
  totalAmount: number;
}

const LOCAL_STORAGE_KEY_RECEIVE = 'scm_receive_scans_v1';

export function useStockTransferReceive() {
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);
  
  // Track scanned items per order for receiving — persisted across page refreshes
  const [receivedItemsState, setReceivedItemsState] = useState<Record<string, Record<number, string[]>>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_RECEIVE);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Sync to localStorage whenever scans change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY_RECEIVE, JSON.stringify(receivedItemsState));
    }
  }, [receivedItemsState]);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/scm/warehouse-management/stock-transfer?status=${encodeURIComponent('For Loading')}`);
      if (!res.ok) throw new Error('Failed to fetch For Loading transfers');
      const json = await res.json();
      setStockTransfers(json.stockTransfers ?? []);
      setBranches(json.branches ?? []);
    } catch (err) {
      console.error('Failed to fetch transfers for receive:', err);
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

  // Group the flat stockTransfers array by order_no and attach receivedQty
  const orderGroups = useMemo(() => {
    const groups: Record<string, ReceiveGroup> = {};
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
        };
      }
      
      const product = typeof st.product_id === 'object' && st.product_id !== null ? st.product_id : null;
      const pid = product ? (product.product_id || product.id) : st.product_id;
      
      const rfids = receivedItemsState[st.order_no]?.[pid] || [];
      
      groups[st.order_no].items.push({
        ...st,
        receivedQty: rfids.length,
        receivedRfids: rfids,
        dispatched_rfids: (st as any).dispatched_rfids || []
      });
      groups[st.order_no].totalAmount += Number(st.amount || 0);
    });
    return Object.values(groups).sort(
      (a, b) => new Date(b.dateEncoded).getTime() - new Date(a.dateEncoded).getTime()
    );
  }, [stockTransfers, receivedItemsState]);

  const selectedGroup = useMemo(() => {
    if (!selectedOrderNo) return null;
    return orderGroups.find((g) => g.orderNo === selectedOrderNo) || null;
  }, [selectedOrderNo, orderGroups]);

  const receiveOrder = async (orderNo: string) => {
    const group = orderGroups.find((g) => g.orderNo === orderNo);
    if (!group) return;

    setProcessing(true);
    try {
      const ids = group.items.map((item) => item.id);
      
      // Build the bulk RFID insert payload
      const rfidsPayload = group.items.flatMap(item => 
        item.receivedRfids.map(rfid => ({ 
          stock_transfer_id: item.id, 
          rfid_tag: rfid 
        }))
      );

      const res = await fetch('/api/scm/warehouse-management/stock-transfer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ids, 
          status: 'Received',
          rfids: rfidsPayload,
          scanType: 'RECEIVE'
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update status to received`);
      }

      toast.success(`Order ${orderNo} successfully received!`);
      setSelectedOrderNo(null);
      // Clear this order's persisted scans
      setReceivedItemsState(prev => {
        const next = { ...prev };
        delete next[orderNo];
        return next;
      });
      await fetchTransfers(); // Refresh list
    } catch (err: unknown) {
      console.error('Receive failed:', err);
      playErrorSound();
      toast.error(err instanceof Error && err.name === 'TypeError' ? 'Network Error: Server Unreachable' : (err instanceof Error ? err.message : 'Something went wrong while receiving.'));
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
      toast.error("Please select a dispatched order first before scanning");
      return;
    }
    
    // Lookup RFID to get Product ID
    try {
      const res = await fetch(`/api/scm/warehouse-management/stock-transfer?action=lookup_rfid&rfid=${encodeURIComponent(rfid)}`);
      
      if (!res.ok) {
        playErrorSound();
        toast.error("RFID not recognized or not associated with any product");
        return;
      }
      
      const match = await res.json();
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
      // map it to the first item that still needs receiving so the user can see the flow work.
      if (!itemInOrder && productId === 22345) {
        itemInOrder = selectedGroup.items.find(i => i.receivedQty < i.ordered_quantity);
        if (itemInOrder) {
          const itemProduct = typeof itemInOrder.product_id === 'object' && itemInOrder.product_id !== null ? itemInOrder.product_id : null;
          effectiveProductId = itemProduct ? (itemProduct.product_id || itemProduct.id) : itemInOrder.product_id;
          console.log(`[UAT Mock Receive] Mapping product 22345 to order item ${effectiveProductId}`);
        }
      }
      */

      if (!itemInOrder) {
        playErrorSound();
        toast.error(`Invalid Scan`, {
          description: `Product (ID: ${productId}) is not part of this dispatched order!`
        });
        return;
      }

      // ── NEW: DISPATCHED RFID VALIDATION ──
      const dispatchedTags = itemInOrder.dispatched_rfids || [];
      if (dispatchedTags.length > 0 && !dispatchedTags.map(t => String(t).trim()).includes(String(rfid).trim())) {
        playErrorSound();
        toast.error("Invalid RFID Tag", {
          description: "This tag was not part of the original dispatch for this product. Please scan only the units that were sent."
        });
        return;
      }

      const currentRfidsForProduct = receivedItemsState[selectedOrderNo]?.[effectiveProductId] || [];
      if (currentRfidsForProduct.includes(rfid)) {
        playErrorSound();
        toast.warning("Already Scanned", {
          description: `RFID ${rfid} has already been received for this item.`
        });
        return;
      }

      // Check across ALL products in this order for this RFID (prevent duplicate tag usage)
      const allScannedRfidsInOrder = Object.values(receivedItemsState[selectedOrderNo] || {}).flat();
      if (allScannedRfidsInOrder.includes(rfid)) {
        playErrorSound();
        toast.error("Duplicate RFID", {
          description: "This tag is already used for another received product in this order."
        });
        return;
      }
      
      if (itemInOrder.receivedQty >= itemInOrder.ordered_quantity) {
        playErrorSound();
        toast.info(`Already Complete`, {
          description: "Required quantity for this product already received."
        });
        return;
      }
      
      // Map scanned RFID
      setReceivedItemsState(prev => {
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
      
      playSuccessSound();
      const finalName = (typeof itemInOrder.product_id === 'object' && itemInOrder.product_id?.product_name) 
        || match.productName 
        || "Product";
      toast.success(`Received & Verified: ${finalName}`);
      
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
    receiveOrder,
    handleScanRFID,
    getBranchName,
    refresh: fetchTransfers,
  };
}
