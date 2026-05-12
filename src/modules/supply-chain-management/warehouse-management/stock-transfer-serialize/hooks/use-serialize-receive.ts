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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(receivedSerialsState));
    }
  }, [receivedSerialsState]);

  const orderGroups = useMemo(() => {
    return base.baseOrderGroups.map((group: OrderGroup) => {
      const enrichedItems = group.items.map((st: OrderGroupItem) => {
        const product = st.product_id as ProductRow;
        const pid = product?.product_id || st.product_id;
        
        const scanLogs = receivedSerialsState[group.orderNo] || [];
        const itemSerials = scanLogs
          .filter(s => s.status === 'SUCCESS' && s.productId === pid)
          .map(s => s.serialNumber);

        return {
          ...st,
          receivedSerialQty: itemSerials.length,
          receivedSerials: itemSerials,
        } as SerialOrderGroupItem;
      });

      return { ...group, items: enrichedItems };
    });
  }, [base.baseOrderGroups, receivedSerialsState]);

  const selectedGroup = useMemo(() => {
    if (!base.selectedOrderNo) return null;
    return orderGroups.find((g) => g.orderNo === base.selectedOrderNo) || null;
  }, [base.selectedOrderNo, orderGroups]);

  const handleSerialInput = async (serial: string) => {
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
        const pid = (i.product_id as ProductRow)?.product_id || i.product_id;
        return pid === match.productId;
      });

      if (!itemInOrder) {
        throw new Error(`Product ${match.productName} is not in this order.`);
      }

      // Check if serial was actually dispatched for this order item
      // (This requires the serials to be fetched or passed from the dispatch phase)
      // For now, we'll assume validation against the product existence in the order.
      
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
          const pid = (i.product_id as ProductRow)?.product_id || i.product_id;
          return pid === s.productId;
        })?.id || 0,
        serial_number: s.serialNumber
      })).filter(p => p.stock_transfer_id > 0);

      await serializeLifecycleService.submitStatusUpdate({
        items: group.items.map(i => ({ 
          id: i.id, 
          status: 'Received',
          received_quantity: (i as SerialOrderGroupItem).receivedSerialQty || 0
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
    receiveOrder,
    recentScans: (base.selectedOrderNo ? receivedSerialsState[base.selectedOrderNo] : []) || [],
  };
}
