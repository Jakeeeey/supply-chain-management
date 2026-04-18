import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useStockTransferBase } from '../../shared/hooks/use-stock-transfer-base';
import { stockTransferLifecycleService } from '../../services/stock-transfer.lifecycle';
import type { OrderGroup, OrderGroupItem, ProductRow } from '../../types/stock-transfer.types';

const APPROVAL_STATUSES = ['Requested'];

/**
 * Hook for managing the "Stock Transfer Approval" phase.
 */
export function useStockTransferApproval() {
  const base = useStockTransferBase({ statuses: APPROVAL_STATUSES });
  
  const [allocatedQtys, setAllocatedQtys] = useState<Record<number, number>>({});
  const [availableQtys, setAvailableQtys] = useState<Record<number, number>>({});
  const [fetchingAvailable, setFetchingAvailable] = useState(false);

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
    } catch (e) {
      console.warn('Error audio failed:', e);
    }
  };

  // Fetch available quantities when a group is selected
  useEffect(() => {
    if (!base.selectedGroup) return;

    const fetchAvailable = async () => {
      setFetchingAvailable(true);
      try {
        const sourceBranchName = base.getBranchName(base.selectedGroup!.sourceBranch);
        
        const newAvailable: Record<number, number> = {};
        const newAllocated: Record<number, number> = {};

        // Fetch all product inventories in parallel (eliminates serial N+1 waterfall)
        const group = base.selectedGroup!;
        await Promise.all(group.items.map(async (item: OrderGroupItem) => {
          const product = item.product_id as ProductRow;
          const pid = product?.product_id;

          const params = new URLSearchParams({
            branchName: sourceBranchName,
            branchId: String(group.sourceBranch),
            productId: String(pid),
            current: '0'
          });

          const proxyUrl = `/api/scm/warehouse-management/stock-transfer/inventory-proxy?${params.toString()}`;
          
          try {
            const res = await fetch(proxyUrl);
            if (res.ok) {
              const data = await res.json();
              const list = Array.isArray(data) ? data : (data.data || []);
              const inventoryList = list.filter((inv: { productId: string | number; branchId: string | number; runningInventory: number }) => 
                 String(inv.productId) === String(pid) && 
                 String(inv.branchId) === String(group.sourceBranch)
              );
              
              const availableCount = inventoryList.reduce((acc: number, inv: { runningInventory: number }) => acc + Number(inv.runningInventory || 0), 0);
              const unitCount = Number(product?.unit_of_measurement_count || 1) || 1;
              const finalAvailable = Math.max(0, Math.floor(availableCount / unitCount));

              newAvailable[item.id] = finalAvailable;
              newAllocated[item.id] = Math.min(item.ordered_quantity || 0, finalAvailable);
            } else {
              newAvailable[item.id] = 0;
              newAllocated[item.id] = 0;
            }
          } catch {
            newAvailable[item.id] = 0;
            newAllocated[item.id] = 0;
          }
        }));

        setAvailableQtys(newAvailable);
        setAllocatedQtys(newAllocated);
      } catch (err) {
        console.error('Failed to fetch available quantities:', err);
      } finally {
        setFetchingAvailable(false);
      }
    };

    fetchAvailable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.selectedGroup?.orderNo]); // Use specific scalar property to prevent infinite object ref loops

  const updateAllocatedQty = (itemId: number, qty: number, maxAllowed: number) => {
    const boundedQty = Math.max(0, Math.min(isNaN(qty) ? 0 : qty, maxAllowed));
    setAllocatedQtys(prev => ({ ...prev, [itemId]: boundedQty }));
  };

  const updateStatus = async (orderNo: string, status: 'approved' | 'rejected') => {
    const group = base.baseOrderGroups.find((g: OrderGroup) => g.orderNo === orderNo);
    if (!group) return;

    base.setProcessing(true);
    try {
      const finalStatus = status === 'approved' ? 'For Picking' : 'Rejected';
      
      if (status === 'approved') {
        let totalAllocated = 0;
        for (const item of group.items) {
          const allocated = allocatedQtys[item.id] ?? item.ordered_quantity ?? 0;
          const available = availableQtys[item.id] || 0;
          const maxAllowed = Math.min(item.ordered_quantity || 0, available);
          totalAllocated += allocated;

          if (allocated > maxAllowed) {
            toast.error(`Invalid Allocation`, {
              description: `Allocated quantity for ${(item.product_id as ProductRow)?.product_name || 'item'} exceeds ordered quantity or available stock.`
            });
            base.setProcessing(false);
            return;
          }
        }

        if (totalAllocated === 0) {
          toast.error(`Approval Blocked`, {
            description: `You cannot approve a transfer with zero total allocated quantity.`
          });
          base.setProcessing(false);
          return;
        }
      }

      const itemsPayload = group.items.map((item: OrderGroupItem) => {
        const payload: { id: number; status: string; allocated_quantity?: number } = {
          id: item.id,
          status: finalStatus
        };
        if (status === 'approved') {
          payload.allocated_quantity = allocatedQtys[item.id] ?? item.ordered_quantity ?? 0;
        }
        return payload;
      });

      await stockTransferLifecycleService.submitStatusUpdate({ 
        items: itemsPayload, 
        status: finalStatus 
      });

      toast.success(`Order ${orderNo} successfully ${status}.`);
      base.setSelectedOrderNo(null);
      await base.refresh(); 
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong while updating status.';
      console.error('Status update failed:', err);
      playErrorSound();
      toast.error(message);
    } finally {
      base.setProcessing(false);
    }
  };

  return {
    ...base,
    orderGroups: base.baseOrderGroups,
    updateStatus,
    allocatedQtys,
    availableQtys,
    fetchingAvailable,
    updateAllocatedQty,
  };
}
