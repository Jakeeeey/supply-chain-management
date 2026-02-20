"use client"

import * as React from "react"
import { Printer, X, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { PrintFilters, PrintStatus, PrintDateRange, FilterOptions } from "../types"

interface PrintModalProps {
    isOpen: boolean
    onClose: () => void
    onPrint: () => void
    filters: PrintFilters
    setFilters: React.Dispatch<React.SetStateAction<PrintFilters>>
    filterOptions: FilterOptions
    isPrinting: boolean
}

export function PrintModal({
    isOpen,
    onClose,
    onPrint,
    filters,
    setFilters,
    filterOptions,
    isPrinting
}: PrintModalProps) {
    const handleRangeChange = (range: PrintDateRange) => {
        setFilters(prev => ({ ...prev, dateRange: range }))
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>What needs to be printed?</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Cluster</Label>
                            <Select
                                value={filters.cluster}
                                onValueChange={(val) => setFilters(prev => ({ ...prev, cluster: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Clusters" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All Clusters">All Clusters</SelectItem>
                                    {filterOptions.clusters.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Customer</Label>
                            <Select
                                value={filters.customer}
                                onValueChange={(val) => setFilters(prev => ({ ...prev, customer: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Customers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All Customers">All Customers</SelectItem>
                                    {filterOptions.customers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase">Driver</Label>
                        <Select
                            value={filters.driver}
                            onValueChange={(val) => setFilters(prev => ({ ...prev, driver: val }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Drivers" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All Drivers">All Drivers</SelectItem>
                                {filterOptions.drivers.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase">Status</Label>
                        <Select
                            value={filters.status}
                            onValueChange={(val) => setFilters(prev => ({ ...prev, status: val as PrintStatus }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses (Full Matrix)</SelectItem>
                                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                                <SelectItem value="notFulfilled">Not Fulfilled</SelectItem>
                                <SelectItem value="returns">With Returns</SelectItem>
                                <SelectItem value="concerns">With Concerns</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">If a specific status is selected, only that column will be printed.</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase">Date Range</Label>
                        <div className="flex gap-1 flex-wrap">
                            {(['yesterday', 'today', 'tomorrow', 'this-week', 'this-month', 'this-year', 'custom'] as PrintDateRange[]).map((range) => (
                                <Button
                                    key={range}
                                    variant={filters.dateRange === range ? "default" : "outline"}
                                    size="sm"
                                    className="h-8 text-[11px] px-2"
                                    onClick={() => handleRangeChange(range)}
                                >
                                    {range.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {filters.dateRange === 'custom' && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">From</Label>
                                <Input
                                    type="date"
                                    value={filters.customFrom}
                                    onChange={(e) => setFilters(prev => ({ ...prev, customFrom: e.target.value }))}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">To</Label>
                                <Input
                                    type="date"
                                    value={filters.customTo}
                                    onChange={(e) => setFilters(prev => ({ ...prev, customTo: e.target.value }))}
                                    className="h-8 text-sm"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={isPrinting}>Cancel</Button>
                    <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                        onClick={onPrint}
                        disabled={isPrinting}
                    >
                        {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        {isPrinting ? 'Preparing...' : 'Print Report'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
