'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  MoreHorizontal,
  CheckCircle2,
  Clock,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getJoinedDispatchData } from './providers/fetchProviders';
import { DispatchRow } from './types';
import ClearanceModal from './components/ClearanceModal';

const DispatchClearanceModule = () => {
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
        const { data: joinedData, total } = await getJoinedDispatchData(
          currentPage,
          itemsPerPage,
          debouncedSearch
        );
        setData(joinedData);
        setTotalItems(total);
      } catch (err) {
        console.error('Failed to load dispatch data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentPage, debouncedSearch, refreshKey]);

  const handleOpenClearance = (dispatch: DispatchRow) => {
    setSelectedDispatch(dispatch);
    setIsModalOpen(true);
  };

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-4 rounded-xl shadow-sm border border-border">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Date:</span>
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px] bg-muted/50 border-border">
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search dispatch, driver..."
            className="pl-10 bg-muted/50 border-border focus:ring-primary/50"
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

export default DispatchClearanceModule;
