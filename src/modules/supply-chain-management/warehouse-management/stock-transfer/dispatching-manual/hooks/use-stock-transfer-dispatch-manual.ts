'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStockTransferBase } from '../../shared/hooks/use-stock-transfer-base';
import { stockTransferLifecycleService } from '../../services/stock-transfer.lifecycle';
import { toast } from 'sonner';
import type { OrderGroup, OrderGroupItem, ProductRow, CurrentUser } from '../../types/stock-transfer.types';

/**
 * Hook for managing the "Stock Transfer Dispatch" phase (Manual Entry).
 */
const LOCAL_STORAGE_KEY = 'scm_dispatch_manual_qtys_v1';

export function useStockTransferDispatchManual(currentUser?: CurrentUser) {
  const base = useStockTransferBase({ 
    statuses: ['For Picking', 'Picking', 'Picked'] 
  });

  const storageKey = currentUser?.email
    ? `${LOCAL_STORAGE_KEY}_user_${currentUser.email}`
    : LOCAL_STORAGE_KEY;

  const [fetchingAvailable, setFetchingAvailable] = useState(false);
  const [scannedInventory, setScannedInventory] = useState<Record<number, number>>({});
  const [scannedQtys, setScannedQtys] = useState<Record<number, number>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persist manually entered picked quantities so navigating away/back does not lose them.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(scannedQtys));
    }
  }, [scannedQtys, storageKey]);

  // Rehydrate picked quantities already saved on the transfer rows (e.g. after "Mark as Done Picking").
  useEffect(() => {
    setScannedQtys(prev => {
      let changed = false;
      const next = { ...prev };
      for (const group of base.baseOrderGroups) {
        for (const item of group.items) {
          if (next[item.id] === undefined && typeof item.picked_quantity === 'number' && item.picked_quantity > 0) {
            next[item.id] = item.picked_quantity;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [base.baseOrderGroups]);

  const updateScannedQty = useCallback((id: number, qty: number, maxQty: number) => {
    setScannedQtys(prev => {
      const validQty = Math.max(0, Math.min(qty, maxQty));
      return { ...prev, [id]: validQty };
    });
  }, []);

  const orderGroups = useMemo(() => {
    return base.baseOrderGroups.map((group: OrderGroup) => {
      const enrichedItems = group.items.map((st: OrderGroupItem) => {
        const product = st.product_id as ProductRow;
        const pid = product?.product_id || st.product_id;
        
        const uom = typeof product?.unit_of_measurement === 'object' ? product.unit_of_measurement : null;
        const unitName = (uom?.unit_name || '').toLowerCase();
        const unitId = Number(uom?.unit_id || 0);
        const loosePack = unitName.includes('loose') || unitName.includes('pieces') || unitName.includes('pcs') || unitName.includes('tie') || unitId === 4;
        
        const rawAvailable = scannedInventory[pid as number] ?? (st as OrderGroupItem).qtyAvailable ?? 0;

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
    return orderGroups.find((g: OrderGroup) => g.orderNo === base.selectedOrderNo) || null;
  }, [base.selectedOrderNo, orderGroups]);

  // Fetch initial inventory for selected order
  useEffect(() => {
    if (!base.selectedOrderNo || !selectedGroup) return;

    const fetchInitialInventory = async () => {
      setFetchingAvailable(true);
      try {
        const newAvailable: Record<number, number> = { ...scannedInventory };
        const sourceBranch = selectedGroup.sourceBranch!;
        const sourceBranchName = base.getBranchName(sourceBranch);

        // Fetch all uncached product inventories in a single request
        const itemsToFetch = selectedGroup.items.filter((item: OrderGroupItem) => {
          const product = item.product_id as ProductRow;
          const pid = product?.product_id || item.product_id;
          return pid && scannedInventory[pid as number] === undefined;
        });

        if (itemsToFetch.length > 0) {
          const params = new URLSearchParams({
            branchName: sourceBranchName,
            branchId: String(sourceBranch),
            current: '0'
          });

          const proxyUrl = `/api/scm/warehouse-management/stock-transfer/inventory-proxy?${params.toString()}`;
          const res = await fetch(proxyUrl);
          
          if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.data || []);
            
            itemsToFetch.forEach((item: OrderGroupItem) => {
              const product = item.product_id as ProductRow;
              const pid = product?.product_id || item.product_id;
              
              const inventoryList = list.filter((inv: Record<string, string | number>) => 
                 String(inv.productId ?? inv.product_id) === String(pid) && 
                 String(inv.branchId ?? inv.branch_id) === String(sourceBranch)
              );
              
              const availableCount = inventoryList.reduce((acc: number, inv: Record<string, string | number>) => acc + Number(inv.runningInventory ?? inv.running_inventory ?? 0), 0);
              const unitCount = Number(product?.unit_of_measurement_count || 1) || 1;
              newAvailable[pid as number] = Math.max(0, Math.floor(availableCount / unitCount));
            });
            
            setScannedInventory(newAvailable);
          }
        }
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
    const group = orderGroups.find((g: OrderGroup) => g.orderNo === orderNo);
    if (!group) return;

    base.setProcessing(true);
    try {
      await stockTransferLifecycleService.submitManualDispatch(
        group.items.map((i: OrderGroupItem) => i.id),
        'For Loading'
      );

      toast.success(`Order ${orderNo} successfully dispatched manually.`);
      setScannedQtys(prev => {
        const next = { ...prev };
        group.items.forEach((i: OrderGroupItem) => { delete next[i.id]; });
        return next;
      });
      base.setSelectedOrderNo(null);
      await base.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong while dispatching.';
      if (msg.includes('Unauthorized') || msg.includes('401')) {
        toast.error('Session Expired', { description: 'Please log in again to continue.' });
      } else {
        toast.error(msg);
      }
    } finally {
      base.setProcessing(false);
    }
  };

  const markAsPicked = async (orderNo: string) => {
    base.setProcessing(true);
    try {
      const group = orderGroups.find((g: OrderGroup) => g.orderNo === orderNo);
      if (group) {
        await stockTransferLifecycleService.submitStatusUpdate({
          items: group.items.map((i: OrderGroupItem) => ({ 
            id: i.id, 
            status: 'Picked',
            picked_quantity: scannedQtys[i.id] ?? i.picked_quantity ?? 0 
          })),
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
