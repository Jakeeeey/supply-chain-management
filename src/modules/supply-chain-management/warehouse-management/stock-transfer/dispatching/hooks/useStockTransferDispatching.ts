import { useState, useEffect, useCallback, useMemo } from 'react';
import { StockTransfer, Branch } from '../../types';
import { toast } from 'sonner';

export interface DispatchItem extends StockTransfer {
  scannedQty: number;
  scannedRfids: string[];
}

export interface DispatchGroup {
  orderNo: string;
  sourceBranch: number | null;
  targetBranch: number | null;
  leadDate: string | null;
  dateRequested: string;
  items: DispatchItem[];
  totalAmount: number;
}

export function useStockTransferDispatching() {
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);
  
  // Track scanned RFIDs per order: { orderNo: { productId: string[] } }
  const [scannedItemsState, setScannedItemsState] = useState<Record<string, Record<number, string[]>>>({});

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scm/warehouse-management/stock-transfer?status=For Picking');
      if (!res.ok) throw new Error('Failed to fetch For Picking transfers');
      const json = await res.json();
      setStockTransfers(json.stockTransfers ?? []);
      setBranches(json.branches ?? []);
    } catch (err) {
      console.error('Failed to fetch transfers for dispatch:', err);
      toast.error('Failed to fetch approved stock transfers');
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
          items: [],
          totalAmount: 0,
        };
      }
      
      const rfids = scannedItemsState[st.order_no]?.[st.product_id] || [];
      
      groups[st.order_no].items.push({
        ...st,
        scannedQty: rfids.length,
        scannedRfids: rfids
      });
      groups[st.order_no].totalAmount += Number(st.amount || 0);
    });
    return Object.values(groups).sort(
      (a, b) => new Date(b.dateRequested).getTime() - new Date(a.dateRequested).getTime()
    );
  }, [stockTransfers, scannedItemsState]);

  const selectedGroup = useMemo(() => {
    if (!selectedOrderNo) return null;
    return orderGroups.find((g) => g.orderNo === selectedOrderNo) || null;
  }, [selectedOrderNo, orderGroups]);

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
    } catch (err: any) {
      console.error('Dispatch failed:', err);
      toast.error(err.message || 'Something went wrong while dispatching.');
    } finally {
      setProcessing(false);
    }
  };

  const handleScanRFID = async (rfid: string) => {
    if (!selectedOrderNo || !selectedGroup) {
      toast.error("Please select an approved order first before scanning");
      return;
    }
    
    // Lookup RFID to get Product ID
    try {
      const res = await fetch(`/api/scm/warehouse-management/stock-transfer?action=lookup_rfid&rfid=${encodeURIComponent(rfid)}`);
      
      if (!res.ok) {
        toast.error("RFID not recognized or not associated with any product");
        return;
      }
      
      const match = await res.json();
      const productId = match.productId;
      
      // Check if product is in the current order
      const itemInOrder = selectedGroup.items.find(i => i.product_id === productId);
      
      if (!itemInOrder) {
        toast.error(`Scanned product (ID: ${productId}) is not part of this order!`);
        return;
      }
      
      if (itemInOrder.scannedQty >= itemInOrder.ordered_quantity) {
        toast.success(`All ordered quantities for this product are already scanned.`, {
          description: "No need to scan more of this item."
        });
        return;
      }
      
      // Check for duplicate scan mapping
      const currentRfids = scannedItemsState[selectedOrderNo]?.[productId] || [];
      if (currentRfids.includes(rfid)) {
        toast.error("RFID Tag already scanned for this order item");
        return;
      }
      
      // Map scanned RFID
      setScannedItemsState(prev => {
        const orderState = prev[selectedOrderNo] || {};
        const rfids = orderState[productId] || [];
        return {
          ...prev,
          [selectedOrderNo]: {
            ...orderState,
            [productId]: [...rfids, rfid]
          }
        };
      });
      
      toast.success(`Scanned ${match.productName}`);
      
    } catch(e: any) {
      toast.error("Failed to process RFID scan");
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
