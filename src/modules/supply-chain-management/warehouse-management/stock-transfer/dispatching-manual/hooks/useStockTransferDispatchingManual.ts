import { useState, useEffect, useCallback, useMemo } from 'react';
import { StockTransfer, Branch } from '../../types';
import { toast } from 'sonner';

export interface DispatchItem extends StockTransfer {
  scannedQty: number;
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

export function useStockTransferDispatchingManual() {
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchingAvailable, setFetchingAvailable] = useState(false);
  const [scannedInventory, setScannedInventory] = useState<Record<number, number>>({});
  const [scannedQtys, setScannedQtys] = useState<Record<number, number>>({});
  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);

  const updateScannedQty = useCallback((id: number, qty: number, maxQty: number) => {
    setScannedQtys(prev => {
      const validQty = Math.max(0, Math.min(qty, maxQty));
      return { ...prev, [id]: validQty };
    });
  }, []);

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
      console.error('Failed to fetch transfers for manual dispatch:', err);
      setFetchError('Unable to reach the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

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
      
      const product = typeof st.product_id === 'object' && st.product_id !== null ? (st.product_id as any) : null;
      const pid = product ? (product.product_id || product.id) : st.product_id;
      const qty = st.allocated_quantity ?? st.ordered_quantity ?? 0;
      const unitPrice = st.ordered_quantity > 0 ? (Number(st.amount || 0) / st.ordered_quantity) : 0;
      
      const unitName = (product?.unit_of_measurement?.unit_name || '').toLowerCase();
      const unitId = Number(product?.unit_of_measurement?.unit_id || 0);
      // Mark as loose pack if unit is pieces, tie, pcs, or loose (these don't need RFID scanning)
      const loosePack = unitName.includes('loose') || unitName.includes('pieces') || unitName.includes('pcs') || unitName.includes('tie') || unitId === 4;
      const rawAvailable = scannedInventory[pid] ?? (st as any).qtyAvailable ?? 0;

      groups[st.order_no].items.push({
        ...st,
        scannedQty: scannedQtys[st.id] ?? 0, 
        qtyAvailable: Math.max(0, rawAvailable),
        isLoosePack: loosePack,
      });
      groups[st.order_no].totalAmount += Number((qty * unitPrice).toFixed(2));
    });
    return Object.values(groups).sort(
      (a, b) => new Date(b.dateEncoded).getTime() - new Date(a.dateEncoded).getTime()
    );
  }, [stockTransfers, scannedInventory]);

  const selectedGroup = useMemo(() => {
    if (!selectedOrderNo) return null;
    return orderGroups.find((g) => g.orderNo === selectedOrderNo) || null;
  }, [selectedOrderNo, orderGroups]);

  // Fetch available quantities when an order is selected
  useEffect(() => {
    if (!selectedOrderNo) return;
    const itemsForOrder = stockTransfers.filter(st => st.order_no === selectedOrderNo);
    if (itemsForOrder.length === 0) return;

    const fetchInitialInventory = async () => {
      setFetchingAvailable(true);
      try {
        const newAvailable: Record<number, number> = { ...scannedInventory };
        let hasChanges = false;
        const sourceBranch = itemsForOrder[0].source_branch;
        const sourceBranchName = getBranchName(sourceBranch);

        for (const item of itemsForOrder) {
          const product = typeof item.product_id === 'object' && item.product_id !== null ? (item.product_id as any) : null;
          const pid = product ? (product.product_id || product.id) : item.product_id;
          
          if (!pid || scannedInventory[pid] !== undefined) continue;

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
            const finalAvailable = Math.max(0, Math.floor(availableCount / unitCount));

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
      } finally {
        setFetchingAvailable(false);
      }
    };

    fetchInitialInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrderNo]);

  const getBranchName = useCallback(
    (id: number | null) => {
      if (!id) return 'Unknown';
      const b = branches.find((branch) => branch.id === id);
      return b ? (b.branch_name as string) || (b.name as string) || `Branch ${id}` : `Branch ${id}`;
    },
    [branches]
  );

  const updateOrderStatus = async (orderNo: string, status: string) => {
    const group = orderGroups.find((g) => g.orderNo === orderNo);
    if (!group) return;

    try {
      const ids = group.items.map((item) => item.id);
      const res = await fetch(`/api/scm/warehouse-management/stock-transfer/dispatching-manual`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status }),
      });

      if (!res.ok) throw new Error(`Failed to update to ${status}`);
      
      setStockTransfers(prev => prev.map(st => 
        st.order_no === orderNo ? { ...st, status } : st
      ));
    } catch (err) {
      console.error(`Failed to update status for ${orderNo}:`, err);
    }
  };

  const dispatchOrder = async (orderNo: string) => {
    const group = orderGroups.find((g) => g.orderNo === orderNo);
    if (!group) return;

    setProcessing(true);
    try {
      const ids = group.items.map((item) => item.id);
      
      const res = await fetch('/api/scm/warehouse-management/stock-transfer/dispatching-manual', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ids, 
          status: 'For Loading',
          scanType: 'MANUAL_DISPATCH'
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update status to For Loading`);
      }

      toast.success(`Order ${orderNo} successfully dispatched manually.`);
      setSelectedOrderNo(null);
      await fetchTransfers();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong while dispatching.');
    } finally {
      setProcessing(false);
    }
  };

  const markAsPicked = async (orderNo: string) => {
    if (!orderGroups.find((g) => g.orderNo === orderNo)) return;
    setProcessing(true);
    try {
      await updateOrderStatus(orderNo, 'Picked');
      toast.success(`Successfully marked as Done Picking.`);
    } catch (err) {
      toast.error('Failed to update status to Picked');
    } finally {
      setProcessing(false);
    }
  };

  return {
    orderGroups,
    selectedGroup,
    selectedOrderNo,
    setSelectedOrderNo,
    loading,
    processing,
    dispatchOrder,
    getBranchName,
    fetchError,
    fetchingAvailable,
    scannedQtys,
    updateScannedQty,
    refresh: fetchTransfers,
    markAsPicked,
  };
}
