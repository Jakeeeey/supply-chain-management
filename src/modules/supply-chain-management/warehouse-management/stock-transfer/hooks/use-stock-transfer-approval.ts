import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useStockTransferBase } from './use-stock-transfer-base';
import { stockTransferLifecycleService } from '../services/stock-transfer.lifecycle';

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

        for (const item of base.selectedGroup!.items) {
          const product = item.product_id as any;
          const pid = product?.product_id || product?.id;

          // Call the inventory-proxy through the Next.js API
          const params = new URLSearchParams({
            branchName: sourceBranchName,
            branchId: String(base.selectedGroup!.sourceBranch),
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
               String(inv.branchId) === String(base.selectedGroup!.sourceBranch)
            );
            
            const availableCount = inventoryList.reduce((acc: number, inv: any) => acc + Number(inv.runningInventory || 0), 0);
            const unitCount = Number(product?.unit_of_measurement_count || 1) || 1;
            let finalAvailable = Math.floor(availableCount / unitCount);
            
            finalAvailable = Math.max(0, finalAvailable);

            newAvailable[item.id] = finalAvailable;
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
  }, [base.selectedGroup, base.getBranchName]);

  const updateAllocatedQty = (itemId: number, qty: number, maxAllowed: number) => {
    const boundedQty = Math.max(0, Math.min(isNaN(qty) ? 0 : qty, maxAllowed));
    setAllocatedQtys(prev => ({ ...prev, [itemId]: boundedQty }));
  };

  const updateStatus = async (orderNo: string, status: 'approved' | 'rejected') => {
    const group = base.baseOrderGroups.find((g: any) => g.orderNo === orderNo);
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
              description: `Allocated quantity for ${(item.product_id as any)?.product_name || 'item'} exceeds ordered quantity or available stock.`
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

      const itemsPayload = group.items.map((item: any) => {
        const payload: any = {
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
    } catch (err: any) {
      console.error('Status update failed:', err);
      playErrorSound();
      toast.error(err.message || 'Something went wrong while updating status.');
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
