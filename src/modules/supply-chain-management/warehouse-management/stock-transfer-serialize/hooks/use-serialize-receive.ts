'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSerializeBase } from './use-serialize-base';
import { serializeLifecycleService } from '../services/api-serialize';
import { toast } from 'sonner';
import type { OrderGroup, OrderGroupItem, ProductRow } from '../../stock-transfer/types/stock-transfer.types';
import type { SerialScanLog, SerialOrderGroupItem } from '../types/serialize.types';

const LOCAL_STORAGE_KEY = 'scm_serialize_receive_scans_v1';

export function useSerializeReceive() {
  const base = useSerializeBase({ 
    statuses: ['For Loading'] 
  });

  const [receivedSerialsState, setReceivedSerialsState] = useState<Record<string, SerialScanLog[]>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [manualQuantitiesState, setManualQuantitiesState] = useState<Record<string, Record<number, number>>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_manual');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(receivedSerialsState));
      localStorage.setItem(LOCAL_STORAGE_KEY + '_manual', JSON.stringify(manualQuantitiesState));
    }
  }, [receivedSerialsState, manualQuantitiesState]);

  const orderGroups = useMemo(() => {
    return base.baseOrderGroups.map((group: OrderGroup) => {
      const enrichedItems = group.items.map((st: OrderGroupItem) => {
        const product = st.product_id as ProductRow;
        const pid = (typeof st.product_id === 'object' ? st.product_id.product_id : st.product_id) as number;
        const isSerialized = product?.is_serialized === 1;
        
        if (isSerialized) {
          const scanLogs = receivedSerialsState[group.orderNo] || [];
          const itemSerials = scanLogs
            .filter(s => s.status === 'SUCCESS' && s.productId === pid)
            .map(s => s.serialNumber);

          return {
            ...st,
            receivedQty: itemSerials.length,
            receivedSerialQty: itemSerials.length,
            receivedSerials: itemSerials,
          } as SerialOrderGroupItem;
        } else {
          const manualQty = manualQuantitiesState[group.orderNo]?.[pid] || 0;
          return {
            ...st,
            receivedQty: manualQty,
          } as SerialOrderGroupItem;
        }
      });

      return { ...group, items: enrichedItems };
    });
  }, [base.baseOrderGroups, receivedSerialsState, manualQuantitiesState]);

  const selectedGroup = useMemo(() => {
    if (!base.selectedOrderNo) return null;
    return orderGroups.find((g) => g.orderNo === base.selectedOrderNo) || null;
  }, [base.selectedOrderNo, orderGroups]);

  const updateManualQty = (productId: number, delta: number) => {
    if (!base.selectedOrderNo) return;
    
    setManualQuantitiesState(prev => {
      const orderNo = base.selectedOrderNo!;
      const currentOrderManual = prev[orderNo] || {};
      const currentQty = currentOrderManual[productId] || 0;
      
      const item = selectedGroup?.items.find(i => {
        const pid = (typeof i.product_id === 'object' ? i.product_id.product_id : i.product_id) as number;
        return pid === productId;
      });
      
      if (!item) return prev;
      
      const targetQty = item.allocated_quantity || 0;
      const newQty = Math.max(0, Math.min(targetQty, currentQty + delta));
      
      return {
        ...prev,
        [orderNo]: {
          ...currentOrderManual,
          [productId]: newQty
        }
      };
    });
  };

  const handleSerialInput = async (serial: string) => {
// ... existing handleSerialInput ...
    if (!base.selectedOrderNo || !selectedGroup) {
      toast.error("Please select an order first.");
      return;
    }

    const serialTrimmed = serial.trim();
    if (serialTrimmed.length < 3) return;

    try {
      const currentScans = receivedSerialsState[base.selectedOrderNo!] || [];
      if (currentScans.some(s => s.status === 'SUCCESS' && s.serialNumber === serialTrimmed)) {
        toast.warning("Serial already scanned.");
        return;
      }

      // In the Receive phase, we match against the Dispatched serials.
      // We'll perform a lookup to see which product this serial belongs to.
      const match = await serializeLifecycleService.lookupSerial(serialTrimmed);
      
      const itemInOrder = selectedGroup.items.find(i => {
        const pid = (typeof i.product_id === 'object' ? i.product_id.product_id : i.product_id) as number;
        return pid === match.productId;
      });

      if (!itemInOrder) {
        throw new Error(`Product ${match.productName} is not in this order.`);
      }

      if ((itemInOrder.product_id as ProductRow)?.is_serialized === 0) {
        throw new Error(`Product ${match.productName} is not serialized. Use manual input.`);
      }

      const targetQty = itemInOrder.allocated_quantity || 0;
      if ((itemInOrder as SerialOrderGroupItem).receivedSerialQty! >= targetQty) {
        throw new Error(`Quantity limit reached for ${match.productName}.`);
      }

      const newScan: SerialScanLog = {
        serialNumber: serialTrimmed,
        productId: match.productId,
        productName: match.productName,
        timestamp: Date.now(),
        status: 'SUCCESS'
      };

      setReceivedSerialsState(prev => ({
        ...prev,
        [base.selectedOrderNo!]: [newScan, ...(prev[base.selectedOrderNo!] || [])]
      }));

      toast.success(`Serial ${serialTrimmed} verified.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const receiveOrder = async (orderNo: string) => {
    const group = orderGroups.find((g) => g.orderNo === orderNo);
    if (!group) return;

    base.setProcessing(true);
    try {
      const scanLogs = (receivedSerialsState[orderNo] || []).filter(s => s.status === 'SUCCESS');
      
      const serialsPayload = scanLogs.map(s => ({
        stock_transfer_id: group.items.find(i => {
          const pid = (typeof i.product_id === 'object' ? i.product_id.product_id : i.product_id) as number;
          return pid === s.productId;
        })?.id || 0,
        serial_number: s.serialNumber
      })).filter(p => p.stock_transfer_id > 0);

      await serializeLifecycleService.submitStatusUpdate({
        items: group.items.map(i => ({ 
          id: i.id, 
          status: 'Received',
          received_quantity: (i as SerialOrderGroupItem).receivedQty || 0
        })),
        status: 'Received',
        serials: serialsPayload,
        scanType: 'RECEIVE'
      });

      toast.success(`Order ${orderNo} received.`);
      base.setSelectedOrderNo(null);
      setReceivedSerialsState(prev => {
        const next = { ...prev };
        delete next[orderNo];
        return next;
      });
      setManualQuantitiesState(prev => {
        const next = { ...prev };
        delete next[orderNo];
        return next;
      });
      await base.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      base.setProcessing(false);
    }
  };

  return {
    ...base,
    orderGroups,
    selectedGroup,
    handleSerialInput,
    updateManualQty,
    receiveOrder,
    recentScans: (base.selectedOrderNo ? receivedSerialsState[base.selectedOrderNo] : []) || [],
  };
}
