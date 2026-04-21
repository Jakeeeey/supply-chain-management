'use client';

import { useState, useCallback, useMemo } from 'react';
import { useStockTransferBase } from '../../shared/hooks/use-stock-transfer-base';
import { stockTransferLifecycleService } from '../../services/stock-transfer.lifecycle';
import { toast } from 'sonner';
import type { OrderGroup, OrderGroupItem } from '../../types/stock-transfer.types';

/**
 * Hook for managing the "Stock Transfer Receive" phase (Manual Entry).
 */
export function useStockTransferReceiveManual() {
  const base = useStockTransferBase({ 
    statuses: ['For Loading', 'In Transit'] 
  });

  const [receivedQtys, setReceivedQtys] = useState<Record<number, number>>({});

  const updateReceivedQty = useCallback((id: number, qty: number, maxQty: number) => {
    setReceivedQtys(prev => {
      const validQty = Math.max(0, Math.min(qty, maxQty));
      return { ...prev, [id]: validQty };
    });
  }, []);

  const orderGroups = useMemo(() => {
    return base.baseOrderGroups.map((group: OrderGroup) => {
      const enrichedItems = group.items.map((st: OrderGroupItem) => {
        return {
          ...st,
          receivedQty: receivedQtys[st.id] ?? 0, 
        };
      });

      return {
        ...group,
        items: enrichedItems
      };
    });
  }, [base.baseOrderGroups, receivedQtys]);

  const selectedGroup = useMemo(() => {
    if (!base.selectedOrderNo) return null;
    return orderGroups.find((g: OrderGroup) => g.orderNo === base.selectedOrderNo) || null;
  }, [base.selectedOrderNo, orderGroups]);

  const receiveOrder = async (orderNo: string) => {
    const group = orderGroups.find((g: OrderGroup) => g.orderNo === orderNo);
    if (!group) return;

    base.setProcessing(true);
    try {
      await stockTransferLifecycleService.submitManualReceive(
        group.items.map((i: OrderGroupItem) => i.id),
        'Received'
      );

      toast.success(`Order ${orderNo} successfully received manually.`);
      base.setSelectedOrderNo(null);
      await base.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong while receiving.';
      toast.error(msg);
    } finally {
      base.setProcessing(false);
    }
  };

  return {
    ...base,
    orderGroups,
    selectedGroup,
    receiveOrder,
    receivedQtys,
    updateReceivedQty,
  };
}
