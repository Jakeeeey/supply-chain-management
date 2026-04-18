import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStockTransferBase } from './use-stock-transfer-base';
import { stockTransferLifecycleService } from '../services/stock-transfer.lifecycle';
import { toast } from 'sonner';

/**
 * Hook for managing the "Stock Transfer Dispatch" phase (Manual Entry).
 */
export function useStockTransferDispatchManual() {
  const base = useStockTransferBase({ 
    statuses: ['For Picking', 'Picking', 'Picked'] 
  });

  const [fetchingAvailable, setFetchingAvailable] = useState(false);
  const [scannedInventory, setScannedInventory] = useState<Record<number, number>>({});
  const [scannedQtys, setScannedQtys] = useState<Record<number, number>>({});

  const updateScannedQty = useCallback((id: number, qty: number, maxQty: number) => {
    setScannedQtys(prev => {
      const validQty = Math.max(0, Math.min(qty, maxQty));
      return { ...prev, [id]: validQty };
    });
  }, []);

  const orderGroups = useMemo(() => {
    return base.baseOrderGroups.map(group => {
      const enrichedItems = group.items.map(st => {
        const product = st.product_id as unknown as Record<string, unknown>;
        const pid = (product?.product_id as number) || (product?.id as number) || st.product_id;
        
        const uom = product?.unit_of_measurement as Record<string, unknown> | undefined;
        const unitName = (uom?.unit_name as string || '').toLowerCase();
        const unitId = Number(uom?.unit_id || 0);
        const loosePack = unitName.includes('loose') || unitName.includes('pieces') || unitName.includes('pcs') || unitName.includes('tie') || unitId === 4;
        
        const rawAvailable = scannedInventory[pid as number] ?? (st as unknown as Record<string, unknown>).qtyAvailable ?? 0;

        return {
          ...st,
          scannedQty: scannedQtys[st.id] ?? 0, 
          qtyAvailable: Math.max(0, rawAvailable),
          isLoosePack: loosePack,
        };
      });

      return {
        ...group,
        items: enrichedItems
      };
    });
  }, [base.baseOrderGroups, scannedQtys, scannedInventory]);

  const selectedGroup = useMemo(() => {
    if (!base.selectedOrderNo) return null;
    return orderGroups.find((g) => g.orderNo === base.selectedOrderNo) || null;
  }, [base.selectedOrderNo, orderGroups]);

  // Fetch initial inventory for selected order
  useEffect(() => {
    if (!base.selectedOrderNo || !selectedGroup) return;

    const fetchInitialInventory = async () => {
      setFetchingAvailable(true);
      try {
        const newAvailable: Record<number, number> = { ...scannedInventory };
        let hasChanges = false;
        const sourceBranch = selectedGroup.sourceBranch!;
        const sourceBranchName = base.getBranchName(sourceBranch);

        for (const item of selectedGroup.items) {
          const product = item.product_id as unknown as Record<string, unknown>;
          const pid = (product?.product_id as number) || (product?.id as number) || item.product_id;
          
          if (!pid || scannedInventory[pid as number] !== undefined) continue;

          const params = new URLSearchParams({
            branchName: sourceBranchName,
            branchId: String(sourceBranch),
            productId: String(pid),
            current: '0'
          });

          const proxyUrl = `/api/scm/warehouse-management/stock-transfer/inventory-proxy?${params.toString()}`;
          const res = await fetch(proxyUrl);
          if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.data || []);
            const inventoryList = list.filter((inv: Record<string, unknown>) => 
               String(inv.productId) === String(pid) && 
               String(inv.branchId) === String(sourceBranch)
            );
            const availableCount = inventoryList.reduce((acc: number, inv: Record<string, unknown>) => acc + Number(inv.runningInventory || 0), 0);
            const unitCount = Number(product?.unit_of_measurement_count || 1) || 1;
            const finalAvailable = Math.max(0, Math.floor(availableCount / unitCount));

            newAvailable[pid as number] = finalAvailable;
            hasChanges = true;
          } else {
            newAvailable[pid as number] = 0;
            hasChanges = true;
          }
        }
        
        if (hasChanges) setScannedInventory(newAvailable);
      } catch (err) {
        console.error('Failed to fetch initial available quantities:', err);
      } finally {
        setFetchingAvailable(false);
      }
    };

    fetchInitialInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.selectedOrderNo]);

  const dispatchOrder = async (orderNo: string) => {
    const group = orderGroups.find((g) => g.orderNo === orderNo);
    if (!group) return;

    base.setProcessing(true);
    try {
      await stockTransferLifecycleService.submitManualDispatch(
        group.items.map(i => i.id),
        'For Loading'
      );

      toast.success(`Order ${orderNo} successfully dispatched manually.`);
      base.setSelectedOrderNo(null);
      await base.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong while dispatching.';
      toast.error(msg);
    } finally {
      base.setProcessing(false);
    }
  };

  const markAsPicked = async (orderNo: string) => {
    base.setProcessing(true);
    try {
      const group = orderGroups.find(g => g.orderNo === orderNo);
      if (group) {
        await stockTransferLifecycleService.submitStatusUpdate({
          items: group.items.map(i => ({ id: i.id, status: 'Picked' })),
          status: 'Picked'
        });
        toast.success(`Successfully marked as Done Picking.`);
        await base.refresh();
      }
    } catch {
      toast.error('Failed to update status to Picked');
    } finally {
      base.setProcessing(false);
    }
  };

  return {
    ...base,
    orderGroups,
    selectedGroup,
    dispatchOrder,
    fetchingAvailable,
    scannedQtys,
    updateScannedQty,
    markAsPicked,
  };
}
