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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const updateReceivedQty = useCallback((id: number, qty: number, maxQty: number) => {
    setReceivedQtys(prev => {
      const validQty = Math.max(0, Math.min(qty, maxQty));
      return { ...prev, [id]: validQty };
    });
  }, []);

  const addSelectedFiles = useCallback((files: File[]) => {
    setSelectedFiles(prev => {
      const combined = [...prev, ...files];
      if (combined.length > 20) {
        toast.error('Limit exceeded', {
          description: 'You can upload a maximum of 20 attachments.'
        });
        return combined.slice(0, 20);
      }
      return combined;
    });
  }, []);

  const removeSelectedFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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

    if (selectedFiles.length === 0) {
      toast.error('Attachment is required.', {
        description: 'Please upload at least one file to finalize this manual deposit.'
      });
      return;
    }

    base.setProcessing(true);
    setIsUploading(true);

    try {
      // 1. Upload files concurrently
      const uploadPromises = selectedFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/scm/warehouse-management/stock-transfer/receive-manual/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to upload "${file.name}".`);
        }

        const result = await res.json();
        const directusFileId = result.data?.id;

        if (!directusFileId) {
          throw new Error(`Upload succeeded for "${file.name}" but no file ID was returned.`);
        }

        return directusFileId as string;
      });

      const directusFileIds = await Promise.all(uploadPromises);

      // 2. Submit status update using directusFileIds
      await stockTransferLifecycleService.submitStatusUpdate({
        items: group.items.map((i: OrderGroupItem) => ({
          id: i.id,
          status: 'Received',
          received_quantity: receivedQtys[i.id] ?? Math.max(0, i.scanned_quantity ?? i.picked_quantity ?? i.allocated_quantity ?? 0)
        })),
        status: 'Received',
        attachments: directusFileIds
      });

      toast.success(`Order ${orderNo} successfully received manually.`);
      setSelectedFiles([]);
      base.setSelectedOrderNo(null);
      await base.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong while receiving.';
      toast.error(msg);
    } finally {
      base.setProcessing(false);
      setIsUploading(false);
    }
  };

  return {
    ...base,
    orderGroups,
    selectedGroup,
    receiveOrder,
    receivedQtys,
    updateReceivedQty,
    selectedFiles,
    isUploading,
    addSelectedFiles,
    removeSelectedFile,
  };
}
