"use client"

import * as React from "react"
import { ArrowUpDown } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { FlattenedLogisticsRow, SortKey, SortDirection } from "../types"
import { formatCurrency } from "../utils"

interface LogisticsTableProps {
    data: FlattenedLogisticsRow[]
    loading: boolean
    error: string
    sortConfig: { key: SortKey; direction: SortDirection } | null
    onSort: (key: SortKey) => void
}

export function LogisticsTable({
    data,
    loading,
    error,
    sortConfig,
    onSort
}: LogisticsTableProps) {

    const SortIcon = ({ columnKey }: { columnKey: SortKey }) => (
        <div className={`inline-block ml-2 ${sortConfig?.key === columnKey ? 'text-blue-600' : 'text-gray-300'}`}>
            <ArrowUpDown className="w-3 h-3" />
        </div>
    )

    const ThSortable = ({ label, columnKey, align = 'left', className = '' }: { label: string, columnKey: SortKey, align?: 'left' | 'right', className?: string }) => (
        <TableHead
            className={`text-${align} text-xs font-bold text-muted-foreground uppercase cursor-pointer hover:bg-muted select-none ${className}`}
            onClick={() => onSort(columnKey)}
        >
            <div className={`flex items-center ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
                {label}
                <SortIcon columnKey={columnKey} />
            </div>
        </TableHead>
    )

    return (
        <div className="bg-card text-card-foreground border rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
                <Table className="min-w-[1200px]">
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <ThSortable label="Truck Plate" columnKey="truckPlate" className="min-w-[150px]" />
                            <ThSortable label="Driver" columnKey="driver" className="min-w-[200px]" />
                            <ThSortable label="Cluster" columnKey="clusterName" className="min-w-[180px]" />
                            <ThSortable label="Customer Name" columnKey="customerName" className="min-w-[250px]" />
                            <ThSortable label="Fulfilled" columnKey="fulfilled" align="right" className="min-w-[120px]" />
                            <ThSortable label="Not Fulfilled" columnKey="notFulfilled" align="right" className="min-w-[120px]" />
                            <ThSortable label="W/ Returns" columnKey="fulfilledWithReturns" align="right" className="min-w-[120px]" />
                            <ThSortable label="W/ Concerns" columnKey="fulfilledWithConcerns" align="right" className="min-w-[120px]" />
                            <ThSortable label="Total" columnKey="total" align="right" className="min-w-[120px]" />
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, idx) => (
                                <TableRow key={idx} className="animate-pulse">
                                    {Array.from({ length: 9 }).map((__, tdIdx) => (
                                        <TableCell key={tdIdx} className="px-6 py-4">
                                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={9} className="px-6 py-12 text-center text-destructive">{error}</TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="px-6 py-12 text-center text-gray-500">No records found.</TableCell>
                            </TableRow>
                        ) : (
                            data.map((row, index) => {
                                // --- ROW SPAN CALCULATIONS ---
                                const isFirstRowOfTruck = index === 0 || row.truckPlate !== data[index - 1].truckPlate;
                                let truckRowSpan = 0;
                                if (isFirstRowOfTruck) {
                                    for (let j = index; j < data.length; j++) {
                                        if (data[j].truckPlate === row.truckPlate) truckRowSpan++;
                                        else break;
                                    }
                                }

                                const isPrevTruckSame = index > 0 && data[index - 1].truckPlate === row.truckPlate;
                                const isFirstRowOfDriver = index === 0 || !isPrevTruckSame || row.driver !== data[index - 1].driver;
                                let driverRowSpan = 0;
                                if (isFirstRowOfDriver) {
                                    for (let j = index; j < data.length; j++) {
                                        if (data[j].truckPlate === row.truckPlate && data[j].driver === row.driver) driverRowSpan++;
                                        else break;
                                    }
                                }

                                const isPrevDriverSame = index > 0 && data[index - 1].driver === row.driver;
                                const isFirstRowOfCluster = index === 0 || !isPrevTruckSame || !isPrevDriverSame || row.clusterName !== data[index - 1].clusterName;
                                let clusterRowSpan = 0;
                                if (isFirstRowOfCluster) {
                                    for (let j = index; j < data.length; j++) {
                                        if (data[j].truckPlate === row.truckPlate &&
                                            data[j].driver === row.driver &&
                                            data[j].clusterName === row.clusterName) clusterRowSpan++;
                                        else break;
                                    }
                                }

                                return (
                                    <TableRow key={`${row.truckPlate}-${index}`} className="hover:bg-muted/50">
                                        {isFirstRowOfTruck && (
                                            <TableCell rowSpan={truckRowSpan} className="align-top bg-card font-medium border-r">
                                                {row.truckPlate}
                                            </TableCell>
                                        )}
                                        {isFirstRowOfDriver && (
                                            <TableCell rowSpan={driverRowSpan} className="align-top bg-card border-r">
                                                {row.driver}
                                            </TableCell>
                                        )}
                                        {isFirstRowOfCluster && (
                                            <TableCell rowSpan={clusterRowSpan} className="align-top bg-card font-medium text-muted-foreground border-r">
                                                {row.clusterName}
                                            </TableCell>
                                        )}
                                        <TableCell className="border-r whitespace-nowrap">{row.customerName}</TableCell>
                                        <TableCell className="text-right text-emerald-500 border-r whitespace-nowrap">
                                            {row.fulfilled > 0 ? formatCurrency(row.fulfilled) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right text-destructive border-r whitespace-nowrap">
                                            {row.notFulfilled > 0 ? formatCurrency(row.notFulfilled) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right text-orange-500 border-r whitespace-nowrap">
                                            {row.fulfilledWithReturns > 0 ? formatCurrency(row.fulfilledWithReturns) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right text-yellow-500 border-r whitespace-nowrap">
                                            {row.fulfilledWithConcerns > 0 ? formatCurrency(row.fulfilledWithConcerns) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-foreground whitespace-nowrap">
                                            {formatCurrency(row.rowTotal)}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
