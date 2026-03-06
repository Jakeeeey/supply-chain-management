"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from 'react'
import { Printer, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { Button } from "@/components/ui/button"
import {
    LogisticsRecord,
    DateRange,
    SortDirection,
    SortKey,
    FlattenedLogisticsRow,
    PrintStatus,
    PrintDateRange,
    PrintFilters,
    FilterOptions
} from "./types"
import { calculateDateRange, parseCurrency, formatCurrency, formatCurrencyPdf } from "./utils"
import { fetchLogisticsSummary } from "./providers/fetchProvider"
import { LogisticsFilter } from "./components/LogisticsFilter"
import { LogisticsTable } from "./components/LogisticsTable"
import { PrintModal } from "./components/PrintModal"

const ITEMS_PER_PAGE = 50

export default function LogisticsSummaryModule() {
    const [data, setData] = useState<LogisticsRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // --- Main View Filters ---
    const [searchTerm, setSearchTerm] = useState('')
    const [dateRange, setDateRange] = useState<DateRange>('this-month')
    const [customDateFrom, setCustomDateFrom] = useState('')
    const [customDateTo, setCustomDateTo] = useState('')

    // --- Sorting ---
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'truckPlate', direction: 'asc' })

    // --- Pagination ---
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    // --- Print Modal State ---
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
    const [isPrinting, setIsPrinting] = useState(false)
    const [printFilters, setPrintFilters] = useState<PrintFilters>({
        cluster: 'All Clusters',
        customer: 'All Customers',
        driver: 'All Drivers',
        status: 'all',
        dateRange: 'this-month',
        customFrom: '',
        customTo: ''
    })

    // State to hold ALL unique options for filters
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        clusters: [],
        customers: [],
        drivers: []
    })

    // --- API Fetching (Main View) ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                setError('')

                const dateFilter = calculateDateRange(dateRange, customDateFrom, customDateTo)
                const result = await fetchLogisticsSummary({
                    page: currentPage,
                    search: searchTerm,
                    dateFilter: dateFilter
                })

                setData(result.data || [])

                if (result.meta?.filter_count) {
                    setTotalPages(Math.ceil(result.meta.filter_count / ITEMS_PER_PAGE))
                } else {
                    setTotalPages(result.data.length > 0 ? 1 : 0)
                }

            } catch (err: any) {
                console.error("Error fetching data:", err)
                setError(err.message || 'An error occurred')
                setData([])
            } finally {
                setLoading(false)
            }
        }

        const timer = setTimeout(() => {
            fetchData()
        }, 300)

        return () => clearTimeout(timer)
    }, [currentPage, searchTerm, dateRange, customDateFrom, customDateTo])


    // --- Fetch ALL Filter Options ---
    useEffect(() => {
        const fetchAllFilterOptions = async () => {
            try {
                const dateFilter = calculateDateRange(dateRange, customDateFrom, customDateTo)
                const result = await fetchLogisticsSummary({
                    page: 1,
                    dateFilter: dateFilter,
                    limit: 10000
                })

                const allRecords: LogisticsRecord[] = result.data || []

                const clusters = new Set<string>()
                const customers = new Set<string>()
                const drivers = new Set<string>()

                allRecords.forEach(record => {
                    drivers.add(record.driver)
                    record.deliveries.forEach(d => {
                        clusters.add(d.clusterName)
                        customers.add(d.customerName)
                    })
                })

                setFilterOptions({
                    clusters: Array.from(clusters).sort(),
                    customers: Array.from(customers).sort(),
                    drivers: Array.from(drivers).sort()
                })

            } catch (error) {
                console.error("Failed to fetch filter options", error)
            }
        }

        const timer = setTimeout(() => {
            fetchAllFilterOptions()
        }, 500)

        return () => clearTimeout(timer)
    }, [dateRange, customDateFrom, customDateTo])


    // --- Table Data Preparation (Flattening & Sorting) ---
    const flattenedData = useMemo(() => {
        const rows = data.flatMap(record =>
            record.deliveries.map(delivery => {
                const f = parseCurrency(delivery.fulfilled)
                const nf = parseCurrency(delivery.notFulfilled)
                const wr = parseCurrency(delivery.fulfilledWithReturns)
                const wc = parseCurrency(delivery.fulfilledWithConcerns)

                return {
                    ...delivery,
                    fulfilled: f,
                    notFulfilled: nf,
                    fulfilledWithReturns: wr,
                    fulfilledWithConcerns: wc,
                    truckPlate: record.truckPlate,
                    driver: record.driver,
                    rowTotal: f + nf + wr + wc
                } as FlattenedLogisticsRow
            })
        )

        if (!sortConfig) return rows

        const { key, direction } = sortConfig
        const modifier = direction === 'asc' ? 1 : -1

        rows.sort((a, b) => {
            let comparison = 0
            if (key === 'clusterName') comparison = a.clusterName.localeCompare(b.clusterName) * modifier
            else if (key === 'customerName') comparison = a.customerName.localeCompare(b.customerName) * modifier
            else if (key === 'driver') comparison = a.driver.localeCompare(b.driver) * modifier
            else if (key === 'truckPlate') comparison = a.truckPlate.localeCompare(b.truckPlate) * modifier
            else if (key === 'total') comparison = (a.rowTotal - b.rowTotal) * modifier
            else if (key === 'fulfilled') comparison = (a.fulfilled - b.fulfilled) * modifier
            else if (key === 'notFulfilled') comparison = (a.notFulfilled - b.notFulfilled) * modifier
            else if (key === 'fulfilledWithReturns') comparison = (a.fulfilledWithReturns - b.fulfilledWithReturns) * modifier
            else if (key === 'fulfilledWithConcerns') comparison = (a.fulfilledWithConcerns - b.fulfilledWithConcerns) * modifier

            if (comparison !== 0) return comparison

            if (a.truckPlate !== b.truckPlate) return a.truckPlate.localeCompare(b.truckPlate)
            if (a.driver !== b.driver) return a.driver.localeCompare(b.driver)
            if (a.clusterName !== b.clusterName) return a.clusterName.localeCompare(b.clusterName)
            return a.customerName.localeCompare(b.customerName)
        })

        return rows
    }, [data, sortConfig])

    const handleSort = (key: SortKey) => {
        let direction: SortDirection = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    // --- Generate PDF Logic ---
    const generatePDF = async () => {
        setIsPrinting(true)

        try {
            const dateFilter = calculateDateRange(printFilters.dateRange, printFilters.customFrom, printFilters.customTo)

            const PAGE_SIZE = 50
            const firstResult = await fetchLogisticsSummary({
                page: 1,
                search: searchTerm,
                dateFilter: dateFilter,
                limit: PAGE_SIZE
            })

            let allRecords: LogisticsRecord[] = firstResult.data || []
            const totalItems = firstResult.meta?.filter_count || 0
            const totalPagesNeeded = Math.ceil(totalItems / PAGE_SIZE)

            if (totalPagesNeeded > 1) {
                const promises = []
                for (let i = 2; i <= totalPagesNeeded; i++) {
                    promises.push(fetchLogisticsSummary({
                        page: i,
                        search: searchTerm,
                        dateFilter: dateFilter,
                        limit: PAGE_SIZE
                    }))
                }

                const results = await Promise.all(promises)
                results.forEach(res => {
                    if (res.data) {
                        allRecords = [...allRecords, ...res.data]
                    }
                })
            }

            const allDeliveries = allRecords.flatMap(record =>
                record.deliveries.map(d => {
                    const fulfilled = parseCurrency(d.fulfilled)
                    const notFulfilled = parseCurrency(d.notFulfilled)
                    const returns = parseCurrency(d.fulfilledWithReturns)
                    const concerns = parseCurrency(d.fulfilledWithConcerns)

                    return {
                        ...d,
                        fulfilled,
                        notFulfilled,
                        fulfilledWithReturns: returns,
                        fulfilledWithConcerns: concerns,
                        driver: record.driver,
                        truckPlate: record.truckPlate,
                        rowTotal: fulfilled + notFulfilled + returns + concerns
                    }
                })
            )

            const filteredRows = allDeliveries.filter(row => {
                if (printFilters.cluster !== 'All Clusters' && row.clusterName !== printFilters.cluster) return false
                if (printFilters.customer !== 'All Customers' && row.customerName !== printFilters.customer) return false
                if (printFilters.driver !== 'All Drivers' && row.driver !== printFilters.driver) return false

                if (printFilters.status === 'all') return row.rowTotal > 0
                if (printFilters.status === 'fulfilled') return row.fulfilled > 0
                if (printFilters.status === 'notFulfilled') return row.notFulfilled > 0
                if (printFilters.status === 'returns') return row.fulfilledWithReturns > 0
                if (printFilters.status === 'concerns') return row.fulfilledWithConcerns > 0

                return false
            })

            filteredRows.sort((a, b) => {
                if (a.truckPlate !== b.truckPlate) return a.truckPlate.localeCompare(b.truckPlate)
                if (a.driver !== b.driver) return a.driver.localeCompare(b.driver)
                if (a.clusterName !== b.clusterName) return a.clusterName.localeCompare(b.clusterName)
                return a.customerName.localeCompare(b.customerName)
            })

            const doc = new jsPDF('l', 'mm', 'a4')
            const today = new Date()
            const todayStr = today.toLocaleDateString()

            const formatPrintPeriodLabel = () => {
                const now = new Date()
                const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"]
                if (printFilters.dateRange === 'this-month') return `${monthNames[now.getMonth()]} ${now.getFullYear()}`
                if (printFilters.dateRange === 'today') return `${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`
                if (printFilters.dateRange === 'custom') return `${printFilters.customFrom || '...'} TO ${printFilters.customTo || '...'}`
                return printFilters.dateRange.replace('-', ' ').toUpperCase()
            }

            let grandTotalAmount = 0
            const activeClusters = new Set<string>()
            const clusterSummary: Record<string, number> = {}

            filteredRows.forEach(row => {
                let valToSum = 0
                if (printFilters.status === 'all') valToSum = row.rowTotal
                else if (printFilters.status === 'fulfilled') valToSum = row.fulfilled
                else if (printFilters.status === 'notFulfilled') valToSum = row.notFulfilled
                else if (printFilters.status === 'returns') valToSum = row.fulfilledWithReturns
                else if (printFilters.status === 'concerns') valToSum = row.fulfilledWithConcerns

                grandTotalAmount += valToSum
                activeClusters.add(row.clusterName)

                if (!clusterSummary[row.clusterName]) clusterSummary[row.clusterName] = 0
                clusterSummary[row.clusterName] += valToSum
            })

            doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.text("Logistics Summary Report", 14, 15)
            doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(`Period: ${formatPrintPeriodLabel()}`, 14, 22); doc.text(`Generated: ${todayStr}`, 14, 27)

            const drawCard = (label: string, value: string, x: number) => {
                doc.setDrawColor(220, 220, 220); doc.roundedRect(x, 10, 50, 20, 2, 2, 'S')
                doc.setFontSize(8); doc.setTextColor(100); doc.text(label, x + 4, 15)
                doc.setFontSize(12); doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.text(value, x + 4, 24)
                doc.setFont("helvetica", "normal")
            }
            drawCard("Active Clusters", activeClusters.size.toString(), 120)
            drawCard("Total Rows", filteredRows.length.toString(), 175)
            drawCard("Total Amount", formatCurrencyPdf(grandTotalAmount), 230)

            const baseColumns = ["Truck Plate", "Driver", "Cluster", "Customer"]
            let statusColumns: string[] = []

            if (printFilters.status === 'all') {
                statusColumns = ["Fulfilled", "Not Fulfilled", "Returns", "Concerns", "Total"]
            } else if (printFilters.status === 'fulfilled') {
                statusColumns = ["Fulfilled"]
            } else if (printFilters.status === 'notFulfilled') {
                statusColumns = ["Not Fulfilled"]
            } else if (printFilters.status === 'returns') {
                statusColumns = ["Returns"]
            } else if (printFilters.status === 'concerns') {
                statusColumns = ["Concerns"]
            }

            const tableColumn = [...baseColumns, ...statusColumns]

            const tableRows = filteredRows.map(row => {
                const baseData = [row.truckPlate, row.driver, row.clusterName, row.customerName]
                let statusData: string[] = []

                if (printFilters.status === 'all') {
                    statusData = [
                        row.fulfilled > 0 ? formatCurrencyPdf(row.fulfilled) : '-',
                        row.notFulfilled > 0 ? formatCurrencyPdf(row.notFulfilled) : '-',
                        row.fulfilledWithReturns > 0 ? formatCurrencyPdf(row.fulfilledWithReturns) : '-',
                        row.fulfilledWithConcerns > 0 ? formatCurrencyPdf(row.fulfilledWithConcerns) : '-',
                        formatCurrencyPdf(row.rowTotal)
                    ]
                } else if (printFilters.status === 'fulfilled') {
                    statusData = [row.fulfilled > 0 ? formatCurrencyPdf(row.fulfilled) : '-']
                } else if (printFilters.status === 'notFulfilled') {
                    statusData = [row.notFulfilled > 0 ? formatCurrencyPdf(row.notFulfilled) : '-']
                } else if (printFilters.status === 'returns') {
                    statusData = [row.fulfilledWithReturns > 0 ? formatCurrencyPdf(row.fulfilledWithReturns) : '-']
                } else if (printFilters.status === 'concerns') {
                    statusData = [row.fulfilledWithConcerns > 0 ? formatCurrencyPdf(row.fulfilledWithConcerns) : '-']
                }

                return [...baseData, ...statusData]
            })

            const numericStartIdx = 4
            const numericEndIdx = tableColumn.length - 1
            const colStyles: any = {}
            for (let i = numericStartIdx; i <= numericEndIdx; i++) { colStyles[i] = { halign: 'right' } }

            if (printFilters.status === 'all') {
                colStyles[tableColumn.length - 1] = { halign: 'right', fontStyle: 'bold' }
            }

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 35,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [245, 247, 250], textColor: [80, 80, 80], fontStyle: 'bold', lineWidth: 0.1, lineColor: [200, 200, 200] },
                columnStyles: colStyles
            })

            const summaryRows = Object.entries(clusterSummary)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([cluster, total]) => [cluster, formatCurrencyPdf(total)])

            const summaryTotal = Object.values(clusterSummary).reduce((acc, curr) => acc + curr, 0)
            summaryRows.push(["GRAND TOTAL", formatCurrencyPdf(summaryTotal)])

            let statusLabel = "Total Amount"
            if (printFilters.status === 'fulfilled') statusLabel = "Total Fulfilled"
            else if (printFilters.status === 'notFulfilled') statusLabel = "Total Not Fulfilled"
            else if (printFilters.status === 'returns') statusLabel = "Total Returns"
            else if (printFilters.status === 'concerns') statusLabel = "Total Concerns"

            // @ts-ignore
            const finalY = doc.lastAutoTable?.finalY || 150

            autoTable(doc, {
                startY: finalY + 10,
                head: [['Cluster', statusLabel]],
                body: summaryRows,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
                columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
                didParseCell: (data) => {
                    if (data.row.index === summaryRows.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [240, 240, 240];
                    }
                }
            })

            doc.save(`logistics summary report - ${todayStr.replace(/\//g, '-')}.pdf`)
            setIsPrintModalOpen(false)

        } catch (err) {
            console.error("Print Error:", err)
            alert("Error generating full report. Please check your connection.")
        } finally {
            setIsPrinting(false)
        }
    }

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage)
    }

    return (
        <div className="p-8 relative">
            <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                    <h1 className="text-foreground mb-2 text-2xl font-semibold">Logistics Summary</h1>
                    <p className="text-muted-foreground">Comprehensive delivery tracking and performance overview</p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => setIsPrintModalOpen(true)}
                    disabled={loading || flattenedData.length === 0}
                    className="flex items-center gap-2"
                >
                    <Printer className="w-4 h-4" /> Print PDF
                </Button>
            </div>

            <PrintModal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                onPrint={generatePDF}
                filters={printFilters}
                setFilters={setPrintFilters}
                filterOptions={filterOptions}
                isPrinting={isPrinting}
            />

            <LogisticsFilter
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                dateRange={dateRange}
                setDateRange={setDateRange}
                customDateFrom={customDateFrom}
                setCustomDateFrom={setCustomDateFrom}
                customDateTo={customDateTo}
                setCustomDateTo={setCustomDateTo}
                setCurrentPage={setCurrentPage}
            />

            <LogisticsTable
                data={flattenedData}
                loading={loading}
                error={error}
                sortConfig={sortConfig}
                onSort={handleSort}
            />

            {/* Pagination Footer */}
            <div className="bg-muted/30 px-4 py-3 flex items-center justify-between border-t sm:px-6 rounded-b-lg">
                <div className="flex-1 flex justify-between items-center">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={loading || currentPage === 1}
                        className="flex items-center gap-1"
                    >
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </Button>
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        {loading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                        Page {currentPage} of {totalPages || 1}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={loading || currentPage === totalPages || totalPages === 0}
                        className="flex items-center gap-1"
                    >
                        Next <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
