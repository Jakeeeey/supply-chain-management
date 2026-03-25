import { useState, useEffect, useCallback, useMemo } from 'react';
import { StockTransfer, Branch } from '../../types';
import { toast } from 'sonner';

export interface OrderGroup {
  orderNo: string;
  sourceBranch: number | null;
  targetBranch: number | null;
  leadDate: string | null;
  dateRequested: string;
  items: StockTransfer[];
  totalAmount: number;
}

export function useStockTransferApproval() {
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scm/warehouse-management/stock-transfer?status=requested');
      if (!res.ok) throw new Error('Failed to fetch requested transfers');
      const json = await res.json();
      setStockTransfers(json.stockTransfers ?? []);
      setBranches(json.branches ?? []);
    } catch (err) {
      console.error('Failed to fetch transfers for approval:', err);
      toast.error('Failed to fetch requested stock transfers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  // Group the flat stockTransfers array by order_no
  const orderGroups = useMemo(() => {
    const groups: Record<string, OrderGroup> = {};
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
      groups[st.order_no].items.push(st);
      groups[st.order_no].totalAmount += Number(st.amount || 0);
    });
    // Convert to array and sort by date requested descending
    return Object.values(groups).sort(
      (a, b) => new Date(b.dateRequested).getTime() - new Date(a.dateRequested).getTime()
    );
  }, [stockTransfers]);

  const selectedGroup = useMemo(() => {
    if (!selectedOrderNo) return null;
    return orderGroups.find((g) => g.orderNo === selectedOrderNo) || null;
  }, [selectedOrderNo, orderGroups]);

  const updateStatus = async (orderNo: string, status: 'approved' | 'rejected') => {
    const group = orderGroups.find((g) => g.orderNo === orderNo);
    if (!group) return;

    setProcessing(true);
    try {
      const finalStatus = status === 'approved' ? 'For Picking' : status;
      const ids = group.items.map((item) => item.id);
      const res = await fetch('/api/scm/warehouse-management/stock-transfer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status: finalStatus }),
      });

      if (!res.ok) {
        let backendErr = '';
        try {
          const jsonErr = await res.json();
          backendErr = jsonErr.error ? ` - ${jsonErr.error}` : '';
        } catch {
          // ignore parsing error
        }
        throw new Error(`Failed to update status to ${status}${backendErr}`);
      }

      toast.success(`Order ${orderNo} successfully ${status}.`);
      setSelectedOrderNo(null);
      await fetchTransfers(); // Refresh list
    } catch (err: any) {
      console.error('Status update failed:', err);
      toast.error(err.message || 'Something went wrong while updating status.');
    } finally {
      setProcessing(false);
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
    updateStatus,
    getBranchName,
    refresh: fetchTransfers,
  };
}
