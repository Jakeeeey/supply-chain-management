import { useState, useEffect, useCallback, useMemo } from 'react';
import { StockTransfer, Branch } from '../../types';
import { toast } from 'sonner';

export interface OrderGroup {
  orderNo: string;
  sourceBranch: number | null;
  targetBranch: number | null;
  leadDate: string | null;
  dateRequested: string;
  dateEncoded: string;
  items: StockTransfer[];
  totalAmount: number;
  status: string;
}

export function useStockTransferApproval() {
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

  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);
  const [allocatedQtys, setAllocatedQtys] = useState<Record<number, number>>({});
  const [availableQtys, setAvailableQtys] = useState<Record<number, number>>({});
  const [fetchingAvailable, setFetchingAvailable] = useState(false);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/scm/warehouse-management/stock-transfer?status=Requested&t=${Date.now()}`, {
        next: { revalidate: 0 },
        cache: 'no-store'
      });
      if (!res.ok) {
        setFetchError('Unable to reach the server. Please check your connection and try again.');
        return;
      }
      const json = await res.json();
      setStockTransfers(json.stockTransfers ?? []);
      setBranches(json.branches ?? []);
    } catch (err) {
      console.error('Failed to fetch transfers for approval:', err);
      setFetchError('Unable to reach the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const getBranchName = useCallback(
    (id: number | null) => {
      if (!id) return 'Unknown';
      const b = branches.find((branch) => branch.id === id);
      return b ? (b.branch_name as string) || (b.name as string) || `Branch ${id}` : `Branch ${id}`;
    },
    [branches]
  );

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
          dateEncoded: st.date_encoded || '',
          items: [],
          totalAmount: 0,
          status: st.status,
        };
      }
      groups[st.order_no].items.push(st);
      groups[st.order_no].totalAmount += Number(st.amount || 0);
    });
    // Convert to array and sort by date encoded descending (absolute newest first)
    return Object.values(groups).sort(
      (a, b) => new Date(b.dateEncoded).getTime() - new Date(a.dateEncoded).getTime()
    );
  }, [stockTransfers]);

  const selectedGroup = useMemo(() => {
    if (!selectedOrderNo) return null;
    return orderGroups.find((g) => g.orderNo === selectedOrderNo) || null;
  }, [selectedOrderNo, orderGroups]);

  // Fetch available quantities when a group is selected
  useEffect(() => {
    if (!selectedGroup) return;

    const fetchAvailable = async () => {
      setFetchingAvailable(true);
      try {
        const sourceBranchName = getBranchName(selectedGroup.sourceBranch);
        
        const newAvailable: Record<number, number> = {};
        const newAllocated: Record<number, number> = {};

        for (const item of selectedGroup.items) {
          const product = item.product_id;
          
          // Directus might expose category and supplier differently, but if they are arrays (junctions), pick the first
          console.log('[DEBUG] product_category:', product?.product_category);
          console.log('[DEBUG] product_per_supplier:', product?.product_per_supplier);
          
          // Helper to extract nested junction values safely
          const extractFirst = (val: any) => Array.isArray(val) ? val[0] : val;
          
          const rawCategory = extractFirst(product?.product_category);
          const category = rawCategory?.category_name || rawCategory?.name || (typeof rawCategory === 'string' ? rawCategory : '');

          const rawSupplierInfo = extractFirst(product?.product_per_supplier);
          const supplier = rawSupplierInfo?.supplier_id?.supplier_shortcut || rawSupplierInfo?.supplier_shortcut || '';

          const rawBrand = extractFirst(product?.product_brand);
          const brand = rawBrand?.brand_name || rawBrand?.name || (typeof rawBrand === 'string' ? rawBrand : '');

          const rawUnit = extractFirst(product?.unit_of_measurement);
          const unit = rawUnit?.unit_name || rawUnit?.name || (typeof rawUnit === 'string' ? rawUnit : '');

          const pid = product?.product_id || product?.id;

          // We need the aggregate inventory from the 8087 API.
          // Do NOT pass unitName because the database stores running inventory in the base unit (e.g. Pieces).
          // Also, only pass filter params if they are truthy to prevent strict mismatching (e.g. Empty supplier vs "MP").
          // 8087 /filter API uses "branchName" rather than "branch"
          const params = new URLSearchParams({
            branchName: sourceBranchName,
            branchId: String(selectedGroup.sourceBranch),
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
               String(inv.branchId) === String(selectedGroup.sourceBranch)
            );
            // Sum up running_inventory from all unit permutations of this product to avoid picking the "0" row
            const availableCount = inventoryList.reduce((acc: number, inv: any) => acc + Number(inv.runningInventory || 0), 0);
            const unitCount = Number(product?.unit_of_measurement_count || 1) || 1;
            const finalAvailable = Math.floor(availableCount / unitCount);

            newAvailable[item.id] = finalAvailable;
            // Default allocated to ordered quantity, but cap at available
            newAllocated[item.id] = Math.min(item.ordered_quantity || 0, finalAvailable);
          } else {
            newAvailable[item.id] = 0;
            newAllocated[item.id] = 0;
          }
        }

        setAvailableQtys(newAvailable);
        setAllocatedQtys(newAllocated);
      } catch (err) {
        console.error('Failed to fetch available quantities:', err);
      } finally {
        setFetchingAvailable(false);
      }
    };

    fetchAvailable();
  }, [selectedGroup, getBranchName]);

  const updateAllocatedQty = (itemId: number, qty: number) => {
    setAllocatedQtys(prev => ({ ...prev, [itemId]: qty }));
  };

  const updateStatus = async (orderNo: string, status: 'approved' | 'rejected') => {
    const group = orderGroups.find((g) => g.orderNo === orderNo);
    if (!group) return;

    setProcessing(true);
    try {
      const finalStatus = status === 'approved' ? 'For Picking' : status;
      
      // If approved, validate allocated quantities
      if (status === 'approved') {
        for (const item of group.items) {
          const allocated = allocatedQtys[item.id] || 0;
          const available = availableQtys[item.id] || 0;
          if (allocated > available) {
            toast.error(`Invalid Allocation`, {
              description: `Allocated quantity for ${item.product_id?.product_name || 'item'} exceeds available stock.`
            });
            setProcessing(false);
            return;
          }
        }
      }

      const itemsPayload = group.items.map((item) => ({
        id: item.id,
        allocated_quantity: allocatedQtys[item.id] || item.ordered_quantity,
        status: finalStatus
      }));

      const res = await fetch('/api/scm/warehouse-management/stock-transfer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsPayload, status: finalStatus }),
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
    } catch (err: unknown) {
      console.error('Status update failed:', err);
      playErrorSound();
      toast.error(err instanceof Error && err.name === 'TypeError' ? 'Network Error: Server Unreachable' : (err instanceof Error ? err.message : 'Something went wrong while updating status.'));
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
    fetchError,
    updateStatus,
    getBranchName,
    stockTransfers,
    refresh: fetchTransfers,
    allocatedQtys,
    availableQtys,
    fetchingAvailable,
    updateAllocatedQty,
  };
}
