"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { DateRange } from "../types"

interface LogisticsFilterProps {
    searchTerm: string
    setSearchTerm: (val: string) => void
    dateRange: DateRange
    setDateRange: (val: DateRange) => void
    customDateFrom: string
    setCustomDateFrom: (val: string) => void
    customDateTo: string
    setCustomDateTo: (val: string) => void
    setCurrentPage: (val: number) => void
}

export function LogisticsFilter({
    searchTerm,
    setSearchTerm,
    dateRange,
    setDateRange,
    customDateFrom,
    setCustomDateFrom,
    customDateTo,
    setCustomDateTo,
    setCurrentPage
}: LogisticsFilterProps) {
    const handleRangeChange = (range: DateRange) => {
        setDateRange(range)
        setCurrentPage(1)
    }

    return (
        <div className="bg-card text-card-foreground border rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Search</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Search Truck Plate..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="pl-9"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Quick Range</Label>
                    <div className="flex gap-2 flex-wrap">
                        {(['yesterday', 'today', 'tomorrow', 'this-week', 'this-month', 'this-year', 'custom'] as DateRange[]).map((range) => (
                            <Button
                                key={range}
                                variant={dateRange === range ? "default" : "secondary"}
                                size="sm"
                                onClick={() => handleRangeChange(range)}
                                className="capitalize"
                            >
                                {range.replace('-', ' ')}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            {dateRange === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">From Date</Label>
                        <Input
                            type="date"
                            value={customDateFrom}
                            onChange={(e) => { setCustomDateFrom(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">To Date</Label>
                        <Input
                            type="date"
                            value={customDateTo}
                            onChange={(e) => { setCustomDateTo(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
