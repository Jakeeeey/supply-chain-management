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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(scannedSerialsState));
    }
  }, [scannedSerialsState]);

  const orderGroups = useMemo(() => {
    return base.baseOrderGroups.map((group: OrderGroup) => {
      const enrichedItems = group.items.map((st: OrderGroupItem) => {
        const product = st.product_id as ProductRow;
        const pid = product?.product_id || st.product_id;
        
        const scanLogs = scannedSerialsState[group.orderNo] || [];
        const itemSerials = scanLogs
          .filter(s => s.status === 'SUCCESS' && s.productId === pid)
          .map(s => s.serialNumber);

        return {
          ...st,
          scannedSerialQty: itemSerials.length,
          scannedSerials: itemSerials,
        } as SerialOrderGroupItem;
      });

      return { ...group, items: enrichedItems };
    });
  }, [base.baseOrderGroups, scannedSerialsState]);

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
      const currentScans = scannedSerialsState[base.selectedOrderNo!] || [];
      if (currentScans.some(s => s.status === 'SUCCESS' && s.serialNumber === serialTrimmed)) {
        toast.warning("Serial already scanned in this order.");
        return;
      }

      // Validate against v_serial_onhand via API
      const match = await serializeLifecycleService.lookupSerial(serialTrimmed, selectedGroup.sourceBranch!);
      
      const itemInOrder = selectedGroup.items.find(i => {
        const pid = (i.product_id as ProductRow)?.product_id || i.product_id;
        return pid === match.productId;
      });

      if (!itemInOrder) {
        throw new Error(`Product ${match.productName} is not in this order.`);
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
      
      const serialsPayload = scanLogs.map(s => ({
        stock_transfer_id: group.items.find(i => {
          const pid = (i.product_id as ProductRow)?.product_id || i.product_id;
          return pid === s.productId;
        })?.id || 0,
        serial_number: s.serialNumber
      })).filter(p => p.stock_transfer_id > 0);

      await serializeLifecycleService.submitStatusUpdate({
        items: group.items.map(i => ({ id: i.id, status: 'For Loading' })),
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
    dispatchOrder,
    recentScans: (base.selectedOrderNo ? scannedSerialsState[base.selectedOrderNo] : []) || [],
  };
}
