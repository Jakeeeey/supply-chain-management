"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
    Search,
    Filter,
    Package,
    ChevronLeft,
    ChevronRight,
    Layers,
    Loader2,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Printer,
    X,
    ChevronDown,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { usePendingDeliveries } from "./hooks/usePendingDeliveries";
import {
    formatCurrency,
    formatTotalCurrency,
    formatCardCurrency,
    formatDate,
    formatNumberForPDF,
    formatTotalForPDF,
    formatDatePrinted,
    clusterLabel
} from "./utils";
import { TableRow, DateRange, SortDirection } from "./types";

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow as ShadcnTableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Multi-Select Component for Clusters using Shadcn-like styling
function ClusterMultiSelect({
    options,
    value,
    onChange,
    allLabel = "All Clusters",
}: {
    options: string[];
    value: string[];
    onChange: (next: string[]) => void;
    allLabel?: string;
}) {
    const isAll = value.length === 0;

    const toggle = (opt: string) => {
        let next: string[];
        if (value.includes(opt)) next = value.filter((x) => x !== opt);
        else next = [...value, opt];
        if (next.length === options.length) next = [];
        onChange(next);
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg justify-start font-normal relative h-10 overflow-hidden"
                >
                    <span className="truncate">{clusterLabel(value, allLabel)}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <div className="max-h-64 overflow-auto p-1">
                    <Button
                        variant="ghost"
                        onClick={() => onChange([])}
                        className={`w-full justify-start font-normal text-sm gap-2 ${isAll ? "bg-accent text-accent-foreground" : ""
                            }`}
                    >
                        <Checkbox checked={isAll} className="pointer-events-none" />
                        <span className="truncate">{allLabel}</span>
                    </Button>

                    {options.map((c) => {
                        const checked = value.includes(c);
                        return (
                            <Button
                                key={c}
                                variant="ghost"
                                onClick={() => toggle(c)}
                                className={`w-full justify-start font-normal text-sm gap-2 ${checked ? "bg-accent text-accent-foreground" : ""
                                    }`}
                            >
                                <Checkbox checked={checked} className="pointer-events-none" />
                                <span className="truncate">{c}</span>
                            </Button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export default function PendingDeliveriesModule() {
    const {
        rawGroups,
        loading,
        error,
        searchTerm,
        setSearchTerm,
        salesmanFilter,
        setSalesmanFilter,
        clusterFilter,
        setClusterFilter,
        dateRange,
        setDateRange,
        customDateFrom,
        setCustomDateFrom,
        customDateTo,
        setCustomDateTo,
        sortConfig,
        setSortConfig,
        tableRows,
        pendingOrdersCount,
        statusTotals,
        sortedRows,
        availableSalesmen,
        availableClusters,
        getGroupedRows,
        countFilteredOrders
    } = usePendingDeliveries();

    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printConfig, setPrintConfig] = useState({
        cluster: [] as string[],
        salesman: "All",
        status: "All",
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(50);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, dateRange, salesmanFilter, clusterFilter]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= Math.ceil(sortedRows.length / itemsPerPage)) {
            setCurrentPage(newPage);
        }
    };

    const handleSort = (key: keyof TableRow) => {
        let direction: SortDirection = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
        setSortConfig({ key, direction });
    };

    const executePrint = () => {
        const printDateSettings = { range: "custom" as DateRange, from: "", to: "" };
        const printRows = getGroupedRows(
            rawGroups,
            { cluster: printConfig.cluster, salesman: printConfig.salesman, status: printConfig.status },
            printDateSettings
        );

        const pdfPendingOrders = countFilteredOrders(
            rawGroups,
            { cluster: printConfig.cluster, salesman: printConfig.salesman, status: printConfig.status },
            printDateSettings
        );

        printRows.sort((a, b) => {
            const c = a.clusterName.localeCompare(b.clusterName);
            if (c !== 0) return c;
            const cu = a.customerName.localeCompare(b.customerName);
            if (cu !== 0) return cu;
            const s = a.salesmanName.localeCompare(b.salesmanName);
            if (s !== 0) return s;
            return a.orderDate.localeCompare(b.orderDate);
        });

        const doc = new jsPDF("l", "mm", "a4");
        const printedAt = formatDatePrinted(new Date());
        const clusterText = printConfig.cluster.length === 0 ? "All" : printConfig.cluster.join(", ");
        const filterText = `Cluster: ${clusterText} | Salesman: ${printConfig.salesman} | Status: ${printConfig.status}`;
        const grandTotalPrinted = printRows.reduce((sum, r) => sum + r.amount, 0);
        const uniqueClustersPrinted = new Set(printRows.map((r) => r.clusterName)).size;

        const pdfStatusTotals = printRows.reduce(
            (acc, r) => {
                acc.approval += r.approval;
                acc.consolidation += r.consolidation;
                acc.picking += r.picking;
                acc.invoicing += r.invoicing;
                acc.loading += r.loading;
                acc.shipping += r.shipping;
                return acc;
            },
            { approval: 0, consolidation: 0, picking: 0, invoicing: 0, loading: 0, shipping: 0 }
        );

        const moneyTotalCard = (amount: number) => (amount === 0 ? "P -" : `P ${formatTotalForPDF(amount)}`);
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const leftX = 14;
        const rightMargin = 14;
        const cardWidth = 58;
        const cardHeight = 18;
        const gap = 4;
        const cardsTotalWidth = cardWidth * 3 + gap * 2;
        const startX = pageWidth - rightMargin - cardsTotalWidth;
        const cardsY = 10;
        const leftMaxWidth = Math.max(40, startX - leftX - 6);

        doc.setFontSize(14);
        doc.text("Delivery Monitor Report", leftX, 15);
        doc.setFontSize(10);
        const printedLines = doc.splitTextToSize(`Date Printed: ${printedAt}`, leftMaxWidth);
        doc.text(printedLines, leftX, 22);
        const lineH10 = 4.5;
        const afterPrintedY = 22 + (printedLines.length - 1) * lineH10;
        doc.setFontSize(8);
        doc.setTextColor(100);
        const filterLines = doc.splitTextToSize(filterText, leftMaxWidth);
        doc.text(filterLines, leftX, afterPrintedY + 5);
        doc.setTextColor(0);

        const drawCard = (x: number, title: string, value: string, iconColor: [number, number, number]) => {
            doc.setDrawColor(220, 220, 220);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(x, cardsY, cardWidth, cardHeight, 2, 2, "FD");
            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            doc.text(title, x + 4, cardsY + 6);
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "bold");
            doc.text(value, x + 4, cardsY + 14);
            doc.setFont("helvetica", "normal");
            doc.setFillColor(...iconColor);
            doc.circle(x + cardWidth - 7, cardsY + 9, 3.5, "F");
        };

        drawCard(startX, "Active Clusters", uniqueClustersPrinted.toString(), [219, 234, 254]);
        drawCard(startX + cardWidth + gap, "Pending Orders", pdfPendingOrders.toString(), [243, 232, 255]);
        drawCard(startX + (cardWidth + gap) * 2, "Total Pending Amount", moneyTotalCard(grandTotalPrinted), [220, 252, 231]);

        const statusY = Math.max(cardsY + cardHeight + 4, afterPrintedY + 5 + filterLines.length * 3.8 + 8);
        const statusCardH = 14;
        const statusGap = 3;
        const usableW = pageWidth - leftX - rightMargin;
        const statusCardW = (usableW - statusGap * 5) / 6;

        const drawStatusCard = (x: number, title: string, value: string, dot: [number, number, number]) => {
            doc.setDrawColor(220, 220, 220);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(x, statusY, statusCardW, statusCardH, 2, 2, "FD");
            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            doc.text(title, x + 3, statusY + 5);
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text(value, x + 3, statusY + 11);
            doc.setFont("helvetica", "normal");
            doc.setFillColor(...dot);
            doc.circle(x + statusCardW - 5.5, statusY + 7, 3, "F");
        };

        const statusCards = [
            { label: "For Approval", value: moneyTotalCard(pdfStatusTotals.approval), dot: [243, 232, 255] as [number, number, number] },
            { label: "For Conso", value: moneyTotalCard(pdfStatusTotals.consolidation), dot: [219, 234, 254] as [number, number, number] },
            { label: "For Picking", value: moneyTotalCard(pdfStatusTotals.picking), dot: [207, 250, 254] as [number, number, number] },
            { label: "For Invoicing", value: moneyTotalCard(pdfStatusTotals.invoicing), dot: [254, 249, 195] as [number, number, number] },
            { label: "For Loading", value: moneyTotalCard(pdfStatusTotals.loading), dot: [255, 237, 213] as [number, number, number] },
            { label: "For Shipping", value: moneyTotalCard(pdfStatusTotals.shipping), dot: [220, 252, 231] as [number, number, number] },
        ];

        let currentX = leftX;
        statusCards.forEach((c, i) => {
            drawStatusCard(currentX, c.label, c.value, c.dot);
            currentX += statusCardW + (i < 5 ? statusGap : 0);
        });

        const tableStartY = statusY + statusCardH + 8;
        let tableHeader = ["Cluster", "Customer", "Salesman", "Date"];
        const statusMap = [
            { label: "For Approval", key: "approval" as keyof TableRow },
            { label: "For Conso", key: "consolidation" as keyof TableRow },
            { label: "For Picking", key: "picking" as keyof TableRow },
            { label: "For Invoicing", key: "invoicing" as keyof TableRow },
            { label: "For Loading", key: "loading" as keyof TableRow },
            { label: "For Shipping", key: "shipping" as keyof TableRow },
        ];
        let activeStatusKeys: (keyof TableRow)[] = [];

        if (printConfig.status === "All") {
            tableHeader.push(...statusMap.map((s) => s.label));
            activeStatusKeys = statusMap.map((s) => s.key);
        } else {
            const selectedLabel = printConfig.status.replace("For ", "");
            const found = statusMap.find(s => s.label.toLowerCase().includes(selectedLabel.toLowerCase()));
            if (found) {
                tableHeader.push(found.label);
                activeStatusKeys = [found.key];
            } else {
                tableHeader.push(...statusMap.map((s) => s.label));
                activeStatusKeys = statusMap.map((s) => s.key);
            }
        }
        tableHeader.push("Total");

        const tableRowsData = printRows.map((row) => {
            const rowData: any[] = [row.clusterName, row.customerName, row.salesmanName, formatDate(row.orderDate)];
            activeStatusKeys.forEach((key) => rowData.push(formatNumberForPDF(row[key] as number)));
            rowData.push(formatNumberForPDF(row.amount));
            return rowData;
        });

        autoTable(doc, {
            head: [tableHeader],
            body: tableRowsData,
            startY: tableStartY,
            theme: "grid",
            styles: { fontSize: 7, cellPadding: 1, halign: "left" },
            headStyles: { fillColor: [243, 244, 246], textColor: [20, 20, 20], fontStyle: "bold" },
            margin: { bottom: 12 },
        });

        const summaryAllClustersRows = getGroupedRows(
            rawGroups,
            { cluster: [], salesman: printConfig.salesman, status: printConfig.status },
            printDateSettings
        );
        const summaryMap = new Map<string, number>();
        summaryAllClustersRows.forEach((r) => {
            summaryMap.set(r.clusterName, (summaryMap.get(r.clusterName) || 0) + r.amount);
        });
        const summaryData = Array.from(summaryMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([name, total]) => [name, formatNumberForPDF(total)]);

        let finalY = (doc as any).lastAutoTable?.finalY || 50;
        if (finalY > 160) { doc.addPage(); finalY = 20; } else { finalY += 10; }

        doc.setFontSize(10);
        doc.text("Cluster Summary", 14, finalY);
        autoTable(doc, {
            head: [["Cluster Name", "Total Amount"]],
            body: summaryData,
            startY: finalY + 5,
            theme: "grid",
            tableWidth: 90,
            margin: { left: 14, bottom: 12 },
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: "bold" },
            columnStyles: { 1: { halign: "right" } },
            didDrawPage: (data: any) => {
                const totalPages = doc.getNumberOfPages();
                if (data.pageNumber === totalPages) {
                    const cursorY = data.cursor?.y ?? 20;
                    autoTable(doc, {
                        body: [["GRAND TOTAL (Printed)", formatNumberForPDF(grandTotalPrinted)]],
                        startY: cursorY + 5,
                        theme: "grid",
                        tableWidth: 90,
                        margin: { left: 120, bottom: 12 },
                        styles: { fontSize: 10, cellPadding: 3, fontStyle: "bold", valign: "middle" },
                        columnStyles: { 0: { fillColor: [229, 231, 235], cellWidth: 55 }, 1: { halign: "right", cellWidth: 35 } },
                    });
                }
            },
        });

        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 6, { align: "center" });
        }

        doc.save(`delivery_monitor_print.pdf`);
        setIsPrintModalOpen(false);
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const totalPages = Math.ceil(sortedRows.length / itemsPerPage);

    const currentRows = useMemo(() => {
        const currentSlice = sortedRows.slice(indexOfFirstItem, indexOfLastItem);
        const rows = currentSlice.map((r) => ({ ...r }));

        for (let i = 0; i < rows.length; i++) {
            const current = rows[i];
            const prev = rows[i - 1];

            if (i === 0 || current.clusterName !== prev.clusterName) {
                let span = 1;
                for (let j = i + 1; j < rows.length; j++) {
                    if (rows[j].clusterName === current.clusterName) span++;
                    else break;
                }
                current.clusterRowSpan = span;
            } else {
                current.clusterRowSpan = 0;
            }

            if (i === 0 || current.customerName !== prev.customerName || current.clusterName !== prev.clusterName) {
                let span = 1;
                for (let j = i + 1; j < rows.length; j++) {
                    if (rows[j].customerName === current.customerName && rows[j].clusterName === current.clusterName) span++;
                    else break;
                }
                current.customerRowSpan = span;
            } else {
                current.customerRowSpan = 0;
            }
        }
        return rows;
    }, [sortedRows, indexOfFirstItem, indexOfLastItem]);

    const SortableHeader = ({
        label,
        sortKey,
        align = "left",
        className = "",
    }: {
        label: string;
        sortKey: keyof TableRow;
        align?: "left" | "center" | "right";
        className?: string;
    }) => (
        <TableHead
            className={`px-4 py-3 h-auto cursor-pointer hover:bg-muted transition-colors group ${className}`}
            onClick={() => handleSort(sortKey)}
        >
            <div
                className={`flex items-center ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"
                    } gap-1`}
            >
                {label}
                <span className="text-muted-foreground group-hover:text-foreground">
                    {sortConfig?.key === sortKey ? (
                        sortConfig.direction === "asc" ? (
                            <ArrowUp className="w-3 h-3" />
                        ) : (
                            <ArrowDown className="w-3 h-3" />
                        )
                    ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                    )}
                </span>
            </div>
        </TableHead>
    );

    return (
        <div className="p-8 relative space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Delivery Monitor</h1>
                    <p className="text-muted-foreground">Pending deliveries matrix</p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => setIsPrintModalOpen(true)}
                    className="shadow-sm"
                >
                    <Printer className="w-4 h-4 mr-2" /> Print PDF
                </Button>
            </div>

            {/* Dashboard Filters */}
            <Card className="shadow-sm dark:border-white/60">
                <CardContent className="p-6">
                    <div className="flex flex-col xl:flex-row gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow">
                            <div className="space-y-2">
                                <Label>Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    <Input
                                        placeholder="Search Customer..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Cluster</Label>
                                <div className="relative">
                                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
                                    <ClusterMultiSelect
                                        options={availableClusters}
                                        value={clusterFilter}
                                        onChange={setClusterFilter}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Salesman</Label>
                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
                                    <Select value={salesmanFilter} onValueChange={setSalesmanFilter}>
                                        <SelectTrigger className="pl-9">
                                            <SelectValue placeholder="All Salesmen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="All">All Salesmen</SelectItem>
                                            {availableSalesmen.map((s) => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="xl:w-auto space-y-2">
                            <Label>Quick Range</Label>
                            <div className="flex gap-2 flex-wrap">
                                {(["yesterday", "today", "this-week", "this-month", "this-year", "custom"] as DateRange[]).map(
                                    (range) => (
                                        <Button
                                            key={range}
                                            variant={dateRange === range ? "default" : "secondary"}
                                            size="sm"
                                            onClick={() => setDateRange(range)}
                                            className="capitalize h-9"
                                        >
                                            {range.replace("-", " ")}
                                        </Button>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    {dateRange === "custom" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t">
                            <div className="space-y-2">
                                <Label>From</Label>
                                <Input
                                    type="date"
                                    value={customDateFrom}
                                    onChange={(e) => setCustomDateFrom(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>To</Label>
                                <Input
                                    type="date"
                                    value={customDateTo}
                                    onChange={(e) => setCustomDateTo(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Print Modal */}
            {isPrintModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-muted/30">
                            <h3 className="text-lg font-bold">What needs to be printed?</h3>
                            <Button variant="ghost" size="icon" onClick={() => setIsPrintModalOpen(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Cluster</Label>
                                    <ClusterMultiSelect
                                        options={availableClusters}
                                        value={printConfig.cluster}
                                        onChange={(next) => setPrintConfig({ ...printConfig, cluster: next })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Salesman</Label>
                                    <Select
                                        value={printConfig.salesman}
                                        onValueChange={(v) => setPrintConfig({ ...printConfig, salesman: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Salesmen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="All">All Salesmen</SelectItem>
                                            {availableSalesmen.map((s) => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Status</Label>
                                <Select
                                    value={printConfig.status}
                                    onValueChange={(v) => setPrintConfig({ ...printConfig, status: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Statuses (Full Matrix)</SelectItem>
                                        {["For Approval", "For Conso", "For Picking", "For Invoicing", "For Loading", "For Shipping"].map((s) => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground mt-1">
                                    If a specific status is selected, only that column will be printed.
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-muted/30 border-t flex justify-end gap-3 rounded-b-lg">
                            <Button variant="ghost" onClick={() => setIsPrintModalOpen(false)}>Cancel</Button>
                            <Button onClick={executePrint}>
                                <Printer className="w-4 h-4 mr-2" /> Print Report
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Summary Stat Cards (Status buckets) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                    { label: "For Approval", value: statusTotals.approval, color: "purple" },
                    { label: "For Conso", value: statusTotals.consolidation, color: "blue" },
                    { label: "For Picking", value: statusTotals.picking, color: "cyan" },
                    { label: "For Invoicing", value: statusTotals.invoicing, color: "yellow" },
                    { label: "For Loading", value: statusTotals.loading, color: "orange" },
                    { label: "For Shipping", value: statusTotals.shipping, color: "green" },
                ].map((bucket) => (
                    <Card key={bucket.label} className="shadow-sm border-none shadow-none ring-1 ring-border dark:ring-white/60">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">{bucket.label}</p>
                                <div className="text-lg font-bold mt-1">
                                    {loading ? <Skeleton className="h-6 w-24" /> : formatCardCurrency(bucket.value)}
                                </div>
                            </div>
                            <div className={`p-2 bg-${bucket.color}-50 dark:bg-${bucket.color}-950 rounded-full text-${bucket.color}-600`}>
                                <span className="font-bold">₱</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-sm border-none shadow-none ring-1 ring-border dark:ring-white/60">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Active Clusters</p>
                            <div className="text-2xl font-bold mt-1">
                                {loading ? <Skeleton className="h-8 w-12" /> : new Set(tableRows.map((r) => r.clusterName)).size}
                            </div>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-full text-blue-600">
                            <Layers className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-none shadow-none ring-1 ring-border dark:ring-white/60">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Pending Orders</p>
                            <div className="text-2xl font-bold mt-1">
                                {loading ? <Skeleton className="h-8 w-12" /> : pendingOrdersCount}
                            </div>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-full text-purple-600">
                            <Package className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-none shadow-none ring-1 ring-border dark:ring-white/60">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Pending Amount</p>
                            <div className="text-2xl font-bold mt-1">
                                {loading ? (
                                    <Skeleton className="h-8 w-32" />
                                ) : (
                                    formatTotalCurrency(tableRows.reduce((acc, r) => acc + r.amount, 0))
                                )}
                            </div>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-full text-green-600">
                            <span className="font-bold text-xl">₱</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table Section */}
            <Card className="shadow-sm overflow-hidden dark:border-white/60">
                <div className="overflow-x-auto">
                    <Table className="border-collapse">
                        <TableHeader className="bg-muted/40 text-[10px] uppercase font-semibold">
                            <ShadcnTableRow>
                                <SortableHeader label="Cluster" sortKey="clusterName" className="border-r" />
                                <SortableHeader label="Customer" sortKey="customerName" className="border-r" />
                                <SortableHeader label="Salesman" sortKey="salesmanName" />
                                <SortableHeader label="Date" sortKey="orderDate" align="center" />

                                <SortableHeader label="For Approval" sortKey="approval" align="right" className="text-purple-700 bg-purple-50/80 border-l" />
                                <SortableHeader label="For Conso" sortKey="consolidation" align="right" className="text-blue-700 bg-blue-50/80 border-l" />
                                <SortableHeader label="For Picking" sortKey="picking" align="right" className="text-cyan-700 bg-cyan-50/80 border-l" />
                                <SortableHeader label="For Invoicing" sortKey="invoicing" align="right" className="text-yellow-700 bg-yellow-50/80 border-l" />
                                <SortableHeader label="For Loading" sortKey="loading" align="right" className="text-orange-700 bg-orange-50/80 border-l" />
                                <SortableHeader label="For Shipping" sortKey="shipping" align="right" className="text-green-700 bg-green-50/80 border-l" />

                                <SortableHeader label="Total" sortKey="amount" align="right" className="border-l font-bold text-foreground" />
                                <SortableHeader label="Cluster Total" sortKey="clusterTotal" align="right" className="border-l font-bold text-foreground bg-muted/30" />
                            </ShadcnTableRow>
                        </TableHeader>
                        <TableBody className="text-sm">
                            {loading ? (
                                <ShadcnTableRow>
                                    <TableCell colSpan={12} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                                            <p>Loading delivery data...</p>
                                        </div>
                                    </TableCell>
                                </ShadcnTableRow>
                            ) : error ? (
                                <ShadcnTableRow>
                                    <TableCell colSpan={12} className="h-48 text-center text-destructive">
                                        {error}
                                    </TableCell>
                                </ShadcnTableRow>
                            ) : sortedRows.length === 0 ? (
                                <ShadcnTableRow>
                                    <TableCell colSpan={12} className="h-48 text-center text-muted-foreground">
                                        No pending deliveries found.
                                    </TableCell>
                                </ShadcnTableRow>
                            ) : (
                                currentRows.map((row) => (
                                    <ShadcnTableRow key={row.uniqueId} className="hover:bg-muted/30 group">
                                        {row.clusterRowSpan > 0 && (
                                            <TableCell
                                                rowSpan={row.clusterRowSpan}
                                                className="align-top border-r bg-muted/50 font-medium whitespace-nowrap"
                                            >
                                                {row.clusterName}
                                            </TableCell>
                                        )}
                                        {row.customerRowSpan > 0 && (
                                            <TableCell
                                                rowSpan={row.customerRowSpan}
                                                className="align-top border-r bg-background whitespace-nowrap"
                                            >
                                                {row.customerName}
                                            </TableCell>
                                        )}
                                        <TableCell className="whitespace-nowrap text-muted-foreground text-xs">{row.salesmanName}</TableCell>
                                        <TableCell className="text-center whitespace-nowrap font-mono text-xs text-muted-foreground">
                                            {formatDate(row.orderDate)}
                                        </TableCell>

                                        <TableCell className="text-right font-mono text-purple-700 bg-purple-50/30 border-l">{formatCurrency(row.approval)}</TableCell>
                                        <TableCell className="text-right font-mono text-blue-700 bg-blue-50/30 border-l">{formatCurrency(row.consolidation)}</TableCell>
                                        <TableCell className="text-right font-mono text-cyan-700 bg-cyan-50/30 border-l">{formatCurrency(row.picking)}</TableCell>
                                        <TableCell className="text-right font-mono text-yellow-700 bg-yellow-50/30 border-l">{formatCurrency(row.invoicing)}</TableCell>
                                        <TableCell className="text-right font-mono text-orange-700 bg-orange-50/30 border-l">{formatCurrency(row.loading)}</TableCell>
                                        <TableCell className="text-right font-mono text-green-700 bg-green-50/30 border-l">{formatCurrency(row.shipping)}</TableCell>

                                        <TableCell className="text-right font-bold border-l">{formatTotalCurrency(row.amount)}</TableCell>

                                        {row.clusterRowSpan > 0 && (
                                            <TableCell
                                                rowSpan={row.clusterRowSpan}
                                                className="align-middle text-right font-bold border-l bg-muted/20"
                                            >
                                                {formatTotalCurrency(row.clusterTotal)}
                                            </TableCell>
                                        )}
                                    </ShadcnTableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="bg-muted/30 px-6 py-4 flex items-center justify-between border-t transition-colors">
                    <div className="flex-1 flex justify-between items-center">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1 || loading}
                            className="h-9"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                        </Button>

                        <span className="text-sm font-medium">
                            Page {currentPage} of {totalPages || 1}
                        </span>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || totalPages === 0 || loading}
                            className="h-9"
                        >
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
