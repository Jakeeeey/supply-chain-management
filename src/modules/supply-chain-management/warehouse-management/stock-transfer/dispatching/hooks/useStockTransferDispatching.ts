import { useState, useEffect, useCallback, useMemo } from 'react';
import { StockTransfer, Branch } from '../../types';
import { toast } from 'sonner';

export interface DispatchItem extends StockTransfer {
  scannedQty: number;
  scannedRfids: string[];
  qtyAvailable?: number;
  isLoosePack?: boolean;
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

const LOCAL_STORAGE_KEY = 'scm_dispatching_scans_v1';

export function useStockTransferDispatching() {
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [scannedInventory, setScannedInventory] = useState<Record<number, number>>({});

  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);
  
  // Track scanned RFIDs per order: { orderNo: { productId: string[] } }
  // Initialize lazily from localStorage to prevent data loss
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

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const statuses = 'For Picking,Picking,Picked';
      const res = await fetch(`/api/scm/warehouse-management/stock-transfer?status=${encodeURIComponent(statuses)}`);
      if (!res.ok) {
        setFetchError('Unable to reach the server. Please check your connection and try again.');
        return;
      }
      const json = await res.json();
      setStockTransfers(json.stockTransfers ?? []);
      setBranches(json.branches ?? []);
    } catch (err) {
      console.error('Failed to fetch transfers for dispatch:', err);
      setFetchError('Unable to reach the server. Please check your connection and try again.');
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
        qtyAvailable: scannedInventory[pid] ?? (st as any).qtyAvailable ?? 0,
        // Mark as loose pack if unit is not RFID-tracked (e.g. Unit ID 4 or name contains 'Loose')
        isLoosePack: product?.unit_of_measurement?.unit_name?.toLowerCase().includes('loose') || product?.unit_of_measurement?.unit_id === 4 
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

  useEffect(() => {
    if (!selectedOrderNo) return;
    // Get raw items from stockTransfers to prevent infinite loop from scannedInventory dep
    const itemsForOrder = stockTransfers.filter(st => st.order_no === selectedOrderNo);
    if (itemsForOrder.length === 0) return;

    const fetchInitialInventory = async () => {
      try {
        const newAvailable: Record<number, number> = { ...scannedInventory };
        let hasChanges = false;
        const sourceBranch = itemsForOrder[0].source_branch;
        const sourceBranchName = getBranchName(sourceBranch);

        for (const item of itemsForOrder) {
          const product = typeof item.product_id === 'object' && item.product_id !== null ? item.product_id : null;
          const pid = product ? (product.product_id || product.id) : item.product_id;
          
          if (!pid || scannedInventory[pid] !== undefined) continue;

          // Helper to extract nested junction values safely
          const extractFirst = (val: any) => Array.isArray(val) ? val[0] : val;
          const rawCategory = extractFirst(product?.product_category);
          const category = rawCategory?.category_name || rawCategory?.name || (typeof rawCategory === 'string' ? rawCategory : '');
          const rawSupplierInfo = extractFirst(product?.product_per_supplier);
          const supplier = rawSupplierInfo?.supplier_id?.supplier_shortcut || rawSupplierInfo?.supplier_shortcut || '';
          const rawBrand = extractFirst(product?.product_brand);
          const brand = rawBrand?.brand_name || rawBrand?.name || (typeof rawBrand === 'string' ? rawBrand : '');

          const params = new URLSearchParams({
            branchName: sourceBranchName,
            branchId: String(sourceBranch),
            productId: String(pid),
            current: '0'
          });

          const proxyUrl = `/api/scm/warehouse-management/inventory-proxy?${params.toString()}`;
          
          const res = await fetch(proxyUrl);
          if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.data || []);
            const inventoryList = list.filter((inv: any) => 
               String(inv.productId) === String(pid) && 
               String(inv.branchId) === String(sourceBranch)
            );
            const availableCount = inventoryList.reduce((acc: number, inv: any) => acc + Number(inv.runningInventory || 0), 0);
            const unitCount = Number(product?.unit_of_measurement_count || 1) || 1;
            const finalAvailable = Math.floor(availableCount / unitCount);

            newAvailable[pid] = finalAvailable;
            hasChanges = true;
          } else {
            newAvailable[pid] = 0;
            hasChanges = true;
          }
        }
        
        if (hasChanges) {
          setScannedInventory(newAvailable);
        }
      } catch (err) {
        console.error('Failed to fetch initial available quantities:', err);
      }
    };

    fetchInitialInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrderNo]);

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
      
      // Clear persistence for this specific order now that it's complete
      setScannedItemsState(prev => {
        const nextState = { ...prev };
        delete nextState[orderNo];
        return nextState;
      });

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
        toast.error(`Scan Failed: ${match.error || "Lookup Failed"}`);
        console.warn(`[Scan Error] ${match.error || "Lookup Failed"}: ${match.details || ""}`);
        return;
      }
      
      const productId = match.productId;
      
      // Check if product is in the current order
      const itemInOrder = selectedGroup.items.find(i => {
        const itemProduct = typeof i.product_id === 'object' && i.product_id !== null ? i.product_id : null;
        const itemPid = itemProduct ? (itemProduct.product_id || itemProduct.id) : i.product_id;
        return itemPid === productId;
      });
      
      const effectiveProductId = productId;
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
        toast.error(`Product is not part of this order!`);
        console.warn(`[Scan Error] Product (ID: ${productId}) is not part of this order!`);
        return;
      }
      
      const currentRfidsForProduct = scannedItemsState[selectedOrderNo]?.[effectiveProductId] || [];
      if (currentRfidsForProduct.includes(rfid)) {
        playErrorSound();
        toast.error(`RFID already scanned for this item.`);
        console.warn(`[Scan Warning] RFID ${rfid} already scanned for this item.`);
        return;
      }

      // Check across ALL products in this order for this RFID (prevent duplicate tag usage)
      const allScannedRfidsInOrder = Object.values(scannedItemsState[selectedOrderNo] || {}).flat();
      if (allScannedRfidsInOrder.includes(rfid)) {
        playErrorSound();
        toast.error(`Duplicate RFID ${rfid} in order.`);
        console.warn(`[Scan Error] Duplicate RFID ${rfid} in order.`);
        return;
      }
      
      const targetQty = (itemInOrder as any).allocated_quantity || itemInOrder.ordered_quantity;
      
      if (itemInOrder.scannedQty >= targetQty) {
        playErrorSound();
        toast.error(`Required quantity already reached.`);
        console.warn(`[Scan Info] Required quantity already reached.`);
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
          
        const targetQty = (item as any).allocated_quantity || item.ordered_quantity;
        return scanCount >= targetQty;
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
    fetchError,
    refresh: fetchTransfers,
    updateLoosePackQty: (productId: number, qty: number) => {
      if (!selectedOrderNo) return;
      setScannedItemsState(prev => {
        const orderState = prev[selectedOrderNo] || {};
        // Use pseudo RFIDs for loose packs
        const pseudoRfids = Array.from({ length: qty }, (_, i) => `LOOSE-${productId}-${i}-${Date.now()}`);
        return {
          ...prev,
          [selectedOrderNo]: {
            ...orderState,
            [productId]: pseudoRfids
          }
        };
      });
    }
  };
}
