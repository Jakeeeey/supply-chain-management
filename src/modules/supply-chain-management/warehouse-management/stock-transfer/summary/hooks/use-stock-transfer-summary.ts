import { useState, useMemo, useEffect, useCallback } from 'react';
import { useStockTransferBase } from '../../hooks/use-stock-transfer-base';
import type { OrderGroup, OrderGroupItem, ProductRow, StockTransferRow } from '../../types/stock-transfer.types';
import { getSummaryUsers, getSummaryUnits, UnitRow } from '../actions';

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc' | null;
}

export type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface UserRow {
  user_id: number;
  user_fname: string;
  user_mname?: string;
  user_lname: string;
}

/** 
 * Local version of StockTransferRow that includes audit trail fields.
 * We define this here to avoid modifying the shared global types.
 */
export interface SummaryStockTransferRow extends StockTransferRow {
  date_approved?: string | null;
  date_dispatched?: string | null;
  approver_id?: number | null;
  dispatcher_id?: number | null;
}

/** Extended OrderGroup for Summary specifically, including audit trail. */
export interface SummaryOrderGroup extends OrderGroup {
  dateApproved?: string | null;
  dateDispatched?: string | null;
  dateReceived?: string | null;
  encoderId?: number | null;
  approverId?: number | null;
  dispatcherId?: number | null;
  receiverId?: number | null;
}

export interface SummaryFilters {
  status: string;
  sourceBranch: string;
  targetBranch: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  datePreset: DatePreset;
  sort: SortConfig;
}

export function useStockTransferSummary() {
  const base = useStockTransferBase({ statuses: [], autoFetch: true });
  
  const [users, setUsers] = useState<UserRow[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  
  // Fetch data via Server Actions
  useEffect(() => {
    getSummaryUsers().then(setUsers);
    getSummaryUnits().then(setUnits);
  }, []);

  const getUserName = useCallback((id: number | null | undefined) => {
    if (!id) return 'System';
    const user = users.find(u => String(u.user_id) === String(id));
    if (!user) return `User #${id}`;
    return `${user.user_fname} ${user.user_lname}`;
  }, [users]);

  const getUnitName = useCallback((id: unknown) => {
    if (!id) return 'PCS';
    // If id is an object (already resolved)
    if (typeof id === 'object' && id !== null && 'unit_name' in id) {
      return (id as { unit_name: string }).unit_name;
    }
    
    const unit = units.find(u => String(u.unit_id) === String(id));
    return unit ? unit.unit_name : 'PCS';
  }, [units]);

  const [filters, setFilters] = useState<SummaryFilters>({
    status: 'all',
    sourceBranch: 'all',
    targetBranch: 'all',
    search: '',
    dateFrom: '',
    dateTo: '',
    datePreset: 'custom',
    sort: { key: 'dateRequested', direction: 'desc' },
  });

  const [selectedGroup, setSelectedGroup] = useState<SummaryOrderGroup | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const applyDatePreset = (preset: DatePreset) => {
    const now = new Date();
    const formatDateLocal = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let from = '';
    let to = formatDateLocal(now);

    switch (preset) {
      case 'today':
        from = to;
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        from = formatDateLocal(yesterday);
        to = from;
        break;
      case 'week':
        const lastWeek = new Date(now);
        lastWeek.setDate(now.getDate() - 7);
        from = formatDateLocal(lastWeek);
        break;
      case 'month':
        const lastMonth = new Date(now);
        lastMonth.setMonth(now.getMonth() - 1);
        from = formatDateLocal(lastMonth);
        break;
      case 'custom':
        return;
    }

    setFilters(prev => ({
      ...prev,
      datePreset: preset,
      dateFrom: from,
      dateTo: to
    }));
  };

  const updateFilter = (key: keyof SummaryFilters, value: unknown) => {
    if (key === 'datePreset') {
      applyDatePreset(value as DatePreset);
    } else {
      setFilters((prev) => ({ 
        ...prev, 
        [key]: value,
        // If manually changing dates, set preset to custom
        ...( (key === 'dateFrom' || key === 'dateTo') ? { datePreset: 'custom' } : {} )
      }));
    }
  };
  const filteredGroups = useMemo(() => {
    // 1. Group transfers locally to capture audit trail fields (since shared helper doesn't)
    const localGroups: Record<string, SummaryOrderGroup> = {};
    
    base.stockTransfers.forEach((st: SummaryStockTransferRow) => {
      if (!localGroups[st.order_no]) {
        localGroups[st.order_no] = {
          orderNo: st.order_no,
          sourceBranch: st.source_branch,
          targetBranch: st.target_branch,
          leadDate: st.lead_date,
          dateRequested: st.date_requested,
          dateEncoded: st.date_encoded || "",
          // Enrichment fields
          dateApproved: st.date_approved,
          dateDispatched: st.date_dispatched,
          dateReceived: st.date_received,
          encoderId: st.encoder_id,
          approverId: st.approver_id,
          dispatcherId: st.dispatcher_id,
          receiverId: st.receiver_id,
          items: [],
          totalAmount: 0,
          status: st.status,
        };
      }
      
      const item: OrderGroupItem = {
        ...st,
        scannedQty: 0,
        receivedQty: 0,
        scannedRfids: [],
        receivedRfids: [],
        qtyAvailable: 0,
        isLoosePack: false,
      };
      
      localGroups[st.order_no].items.push(item);
      const qty = st.allocated_quantity ?? st.ordered_quantity ?? 0;
      const unitPrice = st.ordered_quantity > 0 ? Number(st.amount || 0) / st.ordered_quantity : 0;
      localGroups[st.order_no].totalAmount += Number((qty * unitPrice).toFixed(2));
    });

    const groupsArray = Object.values(localGroups);

    // 2. Apply Filters
    let result = groupsArray.filter((group) => {
      // Status Filter
      if (filters.status !== 'all' && group.status !== filters.status) return false;

      // Source Branch Filter
      if (filters.sourceBranch !== 'all' && String(group.sourceBranch) !== filters.sourceBranch) return false;

      // Target Branch Filter
      if (filters.targetBranch !== 'all' && String(group.targetBranch) !== filters.targetBranch) return false;

      // Date Range Filter
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        const reqDate = new Date(group.dateRequested);
        if (reqDate < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        const reqDate = new Date(group.dateRequested);
        if (reqDate > to) return false;
      }

      // Search Filter (Reference No or Product Name/Barcode)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesRef = group.orderNo.toLowerCase().includes(searchLower);
        const matchesProduct = group.items.some((item: OrderGroupItem) => {
          const product = typeof item.product_id === 'object' ? (item.product_id as ProductRow) : null;
          return (
            product?.product_name.toLowerCase().includes(searchLower) ||
            product?.barcode?.toLowerCase().includes(searchLower) ||
            product?.product_code?.toLowerCase().includes(searchLower)
          );
        });
        if (!matchesRef && !matchesProduct) return false;
      }

      return true;
    });

    // 3. Apply Sorting
    if (filters.sort.key && filters.sort.direction) {
      const { key, direction } = filters.sort;
      result = [...result].sort((a, b) => {
        let valA: string | number | null = null;
        let valB: string | number | null = null;

        switch (key) {
          case 'orderNo':
            valA = a.orderNo;
            valB = b.orderNo;
            break;
          case 'sourceBranch':
            valA = base.getBranchName(a.sourceBranch);
            valB = base.getBranchName(b.sourceBranch);
            break;
          case 'targetBranch':
            valA = base.getBranchName(a.targetBranch);
            valB = base.getBranchName(b.targetBranch);
            break;
          case 'items':
            valA = a.items.length;
            valB = b.items.length;
            break;
          case 'totalAmount':
            valA = a.totalAmount;
            valB = b.totalAmount;
            break;
          case 'dateRequested':
            valA = new Date(a.dateRequested).getTime();
            valB = new Date(b.dateRequested).getTime();
            break;
          case 'status':
            valA = a.status;
            valB = b.status;
            break;
          default:
            return 0;
        }

        if (valA === null || valB === null) return 0;
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [base, filters]); // Include 'base' as dependency

  const toggleSort = (key: string) => {
    setFilters((prev) => {
      const isCurrent = prev.sort.key === key;
      const nextDirection = isCurrent 
        ? (prev.sort.direction === 'asc' ? 'desc' : 'asc') 
        : 'asc';
      
      return {
        ...prev,
        sort: { key, direction: nextDirection }
      };
    });
  };

  const handleViewDetails = (group: SummaryOrderGroup) => {
    setSelectedGroup(group);
    setIsModalOpen(true);
  };

  const resetFilters = () => {
    setFilters({
      status: 'all',
      sourceBranch: 'all',
      targetBranch: 'all',
      search: '',
      dateFrom: '',
      dateTo: '',
      datePreset: 'custom',
      sort: { key: 'dateRequested', direction: 'desc' },
    });
  };

  // Get unique statuses from the data for the filter dropdown
  const availableStatuses = useMemo(() => {
    const statuses = new Set<string>();
    base.stockTransfers.forEach(g => {
      if (g.status) statuses.add(g.status);
    });
    return Array.from(statuses).sort();
  }, [base.stockTransfers]);

  return {
    ...base,
    filters,
    updateFilter,
    resetFilters,
    filteredGroups,
    availableStatuses,
    selectedGroup,
    setSelectedGroup,
    isModalOpen,
    setIsModalOpen,
    handleViewDetails,
    toggleSort,
    getUserName,
    getUnitName,
  };
}
