import { useState, useEffect, useCallback, useMemo } from 'react';
import { StockTransfer, Branch } from '../../types';
import { toast } from 'sonner';

export interface ReceiveItem extends StockTransfer {
  receivedQty: number;
  receivedRfids: string[];
}

export interface ReceiveGroup {
  orderNo: string;
  sourceBranch: number | null;
  targetBranch: number | null;
  leadDate: string | null;
  dateRequested: string;
  items: ReceiveItem[];
  totalAmount: number;
}

export function useStockTransferReceive() {
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);
  
  // Track scanned items per order for receiving: { orderNo: { productId: string[] } }
  const [receivedItemsState, setReceivedItemsState] = useState<Record<string, Record<number, string[]>>>({});

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scm/warehouse-management/stock-transfer?status=For Loading');
      if (!res.ok) throw new Error('Failed to fetch For Loading transfers');
      const json = await res.json();
      setStockTransfers(json.stockTransfers ?? []);
      setBranches(json.branches ?? []);
    } catch (err) {
      console.error('Failed to fetch transfers for receive:', err);
      toast.error('Failed to fetch dispatched stock transfers');
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
          items: [],
          totalAmount: 0,
        };
      }
      
      const rfids = receivedItemsState[st.order_no]?.[st.product_id] || [];
      
      groups[st.order_no].items.push({
        ...st,
        receivedQty: rfids.length,
        receivedRfids: rfids
      });
      groups[st.order_no].totalAmount += Number(st.amount || 0);
    });
    return Object.values(groups).sort(
      (a, b) => new Date(b.dateRequested).getTime() - new Date(a.dateRequested).getTime()
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
      await fetchTransfers(); // Refresh list
    } catch (err: any) {
      console.error('Receive failed:', err);
      toast.error(err.message || 'Something went wrong while receiving.');
    } finally {
      setProcessing(false);
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
        toast.error("RFID not recognized or not associated with any product");
        return;
      }
      
      const match = await res.json();
      const productId = match.productId;
      
      // Check if product is in the current order
      const itemInOrder = selectedGroup.items.find(i => i.product_id === productId);
      
      if (!itemInOrder) {
        toast.error(`Scanned product (ID: ${productId}) is not part of this dispatched order!`);
        return;
      }
      
      if (itemInOrder.receivedQty >= itemInOrder.ordered_quantity) {
        toast.success(`All dispatched quantities for this product are already received.`, {
          description: "No need to scan more of this item."
        });
        return;
      }
      
      // Check for duplicate scan mapping
      const currentRfids = receivedItemsState[selectedOrderNo]?.[productId] || [];
      if (currentRfids.includes(rfid)) {
        toast.error("RFID Tag already scanned for receiving");
        return;
      }
      
      // Map scanned RFID
      setReceivedItemsState(prev => {
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
      
      toast.success(`Received ${match.productName}`);
      
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
    receiveOrder,
    handleScanRFID,
    getBranchName,
    refresh: fetchTransfers,
  };
}
