'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Calendar,
  FileText,
  Truck,
  User as UserIcon
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getJoinedDispatchData } from './providers/fetchProviders';
import { DispatchRow } from './types';
import ClearanceModal from './components/ClearanceModal';

const DispatchClearanceManualModule = () => {
  const [data, setData] = useState<DispatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const [selectedDispatch, setSelectedDispatch] = useState<DispatchRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  const getDateRange = useCallback((filter: string) => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    switch (filter) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'tomorrow':
        start.setDate(now.getDate() + 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() + 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        const day = now.getDay(); // 0 is Sunday
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        end.setDate(diff + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(now.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'year':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(11, 31);
        end.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        return customRange.start && customRange.end ? { start: customRange.start, end: customRange.end } : null;
      default:
        return null;
    }

    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }, [customRange]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const range = getDateRange(dateFilter);
        const { data: joinedData, total } = await getJoinedDispatchData(
          currentPage,
          itemsPerPage,
          debouncedSearch,
          range?.start,
          range?.end
        );
        setData(joinedData);
        setTotalItems(total);

        // 🟢 Update selectedDispatch if currently selected and modal is open
        // This ensures props stay fresh when background refreshes happen (like after pre-save)
        setSelectedDispatch(prev => {
          if (!prev) return null;
          const fresh = joinedData.find(d => d.id === prev.id);
          return fresh || prev;
        });
      } catch (err) {
        console.error('Failed to load dispatch data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentPage, debouncedSearch, refreshKey, dateFilter, getDateRange]);

  const handleOpenClearance = (dispatch: DispatchRow) => {
    setSelectedDispatch(dispatch);
    setIsModalOpen(true);
  };

  const filterButtons = [
    { label: 'All Time', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'Tomorrow', value: 'tomorrow' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Year', value: 'year' },
    { label: 'Custom', value: 'custom' },
  ];

  return (
    <div className="p-6 space-y-6 bg-muted/30 min-h-screen">
      {/* Page Title & Subtitle */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <span>✅</span> Dispatch Clearance
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage and reconcile fulfilled dispatch plans.
        </p>
      </div>

      {/* Header & Filters */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-card p-5 rounded-2xl shadow-sm border border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-foreground uppercase tracking-wider">Date Schedule:</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-muted/30 rounded-xl border border-border/50">
            {filterButtons.map((btn) => (
              <Button
                key={btn.value}
                variant={dateFilter === btn.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDateFilter(btn.value as typeof dateFilter)}
                className={`h-8 rounded-lg text-xs font-bold transition-all px-4 ${
                  dateFilter === btn.value 
                    ? 'shadow-md shadow-primary/20 bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted font-medium'
                }`}
              >
                {btn.label}
              </Button>
            ))}
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
              <Input
                type="date"
                className="h-9 w-36 bg-muted/50 border-border text-xs font-medium rounded-lg"
                value={customRange.start}
                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
              />
              <span className="text-xs text-muted-foreground font-bold">-</span>
              <Input
                type="date"
                className="h-9 w-36 bg-muted/50 border-border text-xs font-medium rounded-lg"
                value={customRange.end}
                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          )}
        </div>

        <div className="relative w-full sm:w-80 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search dispatch, driver, vehicle..."
            className="pl-11 h-10 bg-muted/50 border-border focus:ring-2 focus:ring-primary/20 rounded-xl transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table */}
      <Card className="border-border shadow-sm overflow-hidden rounded-xl bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/80">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-semibold text-muted-foreground">Dispatch No.</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Driver & Vehicle</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Schedule (ETOD / ETOA)</TableHead>
                <TableHead className="font-semibold text-muted-foreground text-right">Trip Value</TableHead>
                <TableHead className="font-semibold text-muted-foreground text-right">Budget</TableHead>
                <TableHead className="font-semibold text-muted-foreground text-center">Status</TableHead>
                <TableHead className="font-semibold text-muted-foreground text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span>Loading dispatch records...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                    No dispatch records found.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row: DispatchRow) => (
                  <TableRow key={row.id} className="hover:bg-muted/40 transition-colors group border-border">
                    <TableCell className="font-bold text-primary py-4">
                      {row.dispatchNo}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-medium text-foreground">
                          <UserIcon className="w-3 h-3 text-muted-foreground" />
                          {row.driverName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Truck className="w-3 h-3" />
                          {row.vehiclePlate}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-muted-foreground font-bold w-7">DEP:</span>
                          <span className="text-foreground tracking-tight">{new Date(row.etod).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-muted-foreground font-bold w-7">ARR:</span>
                          <span className="text-foreground tracking-tight">{new Date(row.etoa).toLocaleString()}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-foreground text-right tabular-nums">
                      ₱{row.tripValue.toLocaleString()}
                    </TableCell>
                    <TableCell className="font-semibold text-emerald-500 text-right tabular-nums">
                      ₱{row.budget.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 font-medium hover:bg-primary/20 transition-colors">
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-border text-foreground hover:bg-muted hover:text-primary shadow-sm"
                        onClick={() => handleOpenClearance(row)}
                      >
                        <FileText className="w-4 h-4" />
                        Clearance
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Footer */}
      <div className="flex justify-between items-center px-2">
        <p className="text-sm text-muted-foreground">
          Showing {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
        </p>
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1 || loading}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="rounded-lg border-border"
          >
            Previous
          </Button>

          <div className="flex items-center gap-2 px-4 h-8 bg-card border border-border rounded-lg shadow-sm">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Page</span>
            <span className="text-sm font-black text-primary">{currentPage}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">of</span>
            <span className="text-sm font-black text-foreground">{Math.ceil(totalItems / itemsPerPage) || 1}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= Math.ceil(totalItems / itemsPerPage) || loading}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="rounded-lg border-border"
          >
            Next
          </Button>
        </div>
      </div>

      {selectedDispatch && (
        <ClearanceModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => setRefreshKey(prev => prev + 1)}
          dispatch={selectedDispatch}
        />
      )}
    </div>
  );
};

export default DispatchClearanceManualModule;
