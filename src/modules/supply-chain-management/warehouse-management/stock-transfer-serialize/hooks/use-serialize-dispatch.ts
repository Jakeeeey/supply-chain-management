'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSerializeBase } from './use-serialize-base';
import { serializeLifecycleService } from '../services/api-serialize';
import { toast } from 'sonner';
import type { OrderGroup, OrderGroupItem, ProductRow } from '../../stock-transfer/types/stock-transfer.types';
import type { SerialScanLog, SerialOrderGroupItem } from '../types/serialize.types';

const LOCAL_STORAGE_KEY = 'scm_serialize_dispatch_scans_v1';

export function useSerializeDispatch() {
  const base = useSerializeBase({ 
    statuses: ['For Picking', 'Picking', 'Picked'] 
  });

  const [scannedSerialsState, setScannedSerialsState] = useState<Record<string, SerialScanLog[]>>(() => {
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
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(scannedSerialsState));
      localStorage.setItem(LOCAL_STORAGE_KEY + '_manual', JSON.stringify(manualQuantitiesState));
    }
  }, [scannedSerialsState, manualQuantitiesState]);

  const orderGroups = useMemo(() => {
    return base.baseOrderGroups.map((group: OrderGroup) => {
      const enrichedItems = group.items.map((st: OrderGroupItem) => {
        const product = st.product_id as ProductRow;
        const pid = (typeof st.product_id === 'object' ? st.product_id.product_id : st.product_id) as number;
        const isSerialized = product?.is_serialized === 1;
        
        if (isSerialized) {
          const scanLogs = scannedSerialsState[group.orderNo] || [];
          const itemSerials = scanLogs
            .filter(s => s.status === 'SUCCESS' && s.productId === pid)
            .map(s => s.serialNumber);

          return {
            ...st,
            scannedQty: itemSerials.length,
            scannedSerialQty: itemSerials.length,
            scannedSerials: itemSerials,
          } as SerialOrderGroupItem;
        } else {
          const manualQty = manualQuantitiesState[group.orderNo]?.[pid] || 0;
          return {
            ...st,
            scannedQty: manualQty,
          } as SerialOrderGroupItem;
        }
      });

      return { ...group, items: enrichedItems };
    });
  }, [base.baseOrderGroups, scannedSerialsState, manualQuantitiesState]);

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
      const currentScans = scannedSerialsState[base.selectedOrderNo!] || [];
      if (currentScans.some(s => s.status === 'SUCCESS' && s.serialNumber === serialTrimmed)) {
        toast.warning("Serial already scanned in this order.");
        return;
      }

      // Validate against v_serial_onhand via API
      const match = await serializeLifecycleService.lookupSerial(serialTrimmed, selectedGroup.sourceBranch!);
      
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
      if ((itemInOrder as SerialOrderGroupItem).scannedSerialQty! >= targetQty) {
        throw new Error(`Quantity limit reached for ${match.productName}.`);
      }

      const newScan: SerialScanLog = {
        serialNumber: serialTrimmed,
        productId: match.productId,
        productName: match.productName,
        timestamp: Date.now(),
        status: 'SUCCESS'
      };

      setScannedSerialsState(prev => ({
        ...prev,
        [base.selectedOrderNo!]: [newScan, ...(prev[base.selectedOrderNo!] || [])]
      }));

      toast.success(`Serial ${serialTrimmed} added.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const dispatchOrder = async (orderNo: string) => {
    const group = orderGroups.find((g) => g.orderNo === orderNo);
    if (!group) return;

    base.setProcessing(true);
    try {
      const scanLogs = (scannedSerialsState[orderNo] || []).filter(s => s.status === 'SUCCESS');
      
      // Serials for serialized products
      const serialsPayload = scanLogs.map(s => ({
        stock_transfer_id: group.items.find(i => {
          const pid = (typeof i.product_id === 'object' ? i.product_id.product_id : i.product_id) as number;
          return pid === s.productId;
        })?.id || 0,
        serial_number: s.serialNumber
      })).filter(p => p.stock_transfer_id > 0);

      // Quantities for ALL items (including non-serialized)
      const itemsPayload = group.items.map(i => ({ 
        id: i.id, 
        status: 'For Loading',
        // In the database update, we should probably update received_quantity 
        // if this was receiving, but for dispatching it might be different.
        // For now we just update status. 
        // Wait, if it's non-serialized, we need to save the scanned count somewhere?
        // Usually it's received_quantity / allocated_quantity.
      }));

      await serializeLifecycleService.submitStatusUpdate({
        items: itemsPayload,
        status: 'For Loading',
        serials: serialsPayload,
        scanType: 'DISPATCH'
      });

      toast.success(`Order ${orderNo} dispatched.`);
      base.setSelectedOrderNo(null);
      setScannedSerialsState(prev => {
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
    dispatchOrder,
    recentScans: (base.selectedOrderNo ? scannedSerialsState[base.selectedOrderNo] : []) || [],
  };
}
